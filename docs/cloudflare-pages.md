# Host this page on Cloudflare Pages with a NIC.cl domain

This setup is possible. Four components have separate jobs:

- **GitHub** stores this repository.
- **Cloudflare Pages** publishes the HTML, CSS, and image.
- **NIC Chile** remains the registrar—the company where the `.cl` name is bought
  and renewed.
- **Cloudflare DNS** answers DNS requests for the NIC.cl name and sends visitors
  to the Pages project.

You do not transfer ownership of the domain away from NIC Chile. You only tell
NIC Chile to use the two name servers assigned by Cloudflare for your domain.

## Before starting

You need:

1. This repository pushed to GitHub with the finished page on `main`.
2. A free Cloudflare account.
3. A `.cl` domain registered in your NIC Chile account. Check current prices on
   the [official NIC Chile tariff page](https://www.nic.cl/dominios/tarifas.html).

First deploy to the free `pages.dev` address. Connect the paid domain only after
that preview works. In the examples below, `your-domain.cl` is a value you
replace with your own domain. The nameservers and DNSSEC values are assigned by
Cloudflare for your domain; never copy them from an example.

## Part 1: Deploy the GitHub repository

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Open **Workers & Pages**.
3. Select **Create application**, then **Pages**, then **Import an existing Git repository**.
4. Authorize the Cloudflare GitHub application. Give it access to this
   repository; access to every repository is unnecessary.
5. Select the repository and choose **Begin setup**.
6. Enter these build settings exactly:

   | Setting | Value |
   | --- | --- |
   | Framework preset | `None` |
   | Production branch | `main` |
   | Build command | `exit 0` |
   | Build output directory | `.` |

7. Select **Save and Deploy**.
8. Open the generated address, such as `<project>.pages.dev`. Confirm the profile
   image, text, and every link are visible on both a phone and a computer.

Cloudflare now deploys new commits pushed to `main`. Other branches can receive
temporary preview deployments.

## Part 2: Add the NIC.cl domain to Cloudflare DNS

Do this only after the `pages.dev` address works.

1. In the Cloudflare account home, select **Add a domain** (the dashboard may
   label this **Add a site**).
2. Enter only the apex name, for example `your-domain.cl`; do not enter `www` or
   a URL beginning with `https://`.
3. Select the **Free** plan.
4. Review Cloudflare's DNS scan. If the domain already receives email or serves
   another service, copy its existing DNS records before continuing—especially
   MX, SPF, DKIM, and DMARC records. Missing email records can stop mail delivery.
5. Cloudflare displays two assigned name servers, similar in shape to
   `name.ns.cloudflare.com`. Keep that screen open. Use the exact pair displayed
   for your domain; do not copy name servers from an example or another domain.
### Remove old DNSSEC before changing name servers

An existing pre-Cloudflare **DS** record at NIC Chile must be removed or
unpublished before the name-server change. Otherwise, validating resolvers can
make the entire domain unreachable because the old DS record cannot validate
Cloudflare's keys.

1. Check whether a DS record exists:

   ```bash
   dig DS your-domain.cl +short
   ```

2. If it returns records, in the NIC Chile customer panel open the domain's
   **Servidores de nombre (DNS)** section and its **(DNSSec)** form. Remove or
   unpublish the old DNSSEC/DS data, then save it and choose **Actualizar datos
   de dominio** to save the domain update.
3. Wait and repeat the command until `dig DS your-domain.cl +short` returns no
   records. Do not replace the name servers while the old DS record remains.

### Change the name servers at NIC Chile

1. Sign in to the [NIC Chile customer panel](https://clientes.nic.cl/).
2. Open the domain, choose the option to modify it, and find **Servidores de
   nombre**.
3. Replace the current entries with the two exact Cloudflare name servers and
   save the domain modification.
4. Return to Cloudflare and use **Check nameservers** or **Re-check now**.

NIC Chile says it publishes `.cl` zone changes roughly every 30 minutes, but
cached DNS information across the internet can take up to a couple of days to
disappear. Do not repeatedly replace correct settings while propagation is in
progress.

## Part 3: Attach the canonical apex domain to Pages

The canonical hostname in this guide is the apex: `https://your-domain.cl`.
Wait until Cloudflare marks the zone **Active**, then:

1. Open **Workers & Pages** and select the Pages project.
2. Open **Custom domains** and select **Set up a domain**.
3. Enter the apex domain, such as `your-domain.cl`, and continue.
4. Wait until that Pages custom domain says **Active**, then open
   `https://your-domain.cl`.

Do not add `www.your-domain.cl` as a second Pages custom domain when using the
redirect workflow below.

## Part 4: Redirect `www` to the apex

After the apex Pages custom domain is active, use Cloudflare's Pages redirect
workflow:

1. Go to **Bulk Redirects** and create a Bulk Redirect list containing this
   entry:

   | Source URL | Target URL | Status | Parameters |
   | --- | --- | --- |
   | `www.your-domain.cl` | `https://your-domain.cl` | `301` | Preserve query string; Subpath matching; Preserve path suffix; Include subdomains |

2. Create and enable a Bulk Redirect rule that uses this list.
3. Go to **DNS** and create the placeholder record required for the redirect:

   | Type | Name | IPv4 address | Proxy status |
   | --- | --- | --- |
   | `A` | `www` | `192.0.2.1` | Proxied |

   If a `www` record already exists, remove or replace the conflicting record
   before creating this one. The placeholder only lets Cloudflare receive the
   `www` request so the Bulk Redirect can answer it; it is not a second Pages
   custom domain.

## Part 5: Enable DNSSEC after the migration

Only after the Cloudflare zone is **Active** and the apex resolves through
Cloudflare:

1. In Cloudflare, open **DNS** > **Settings**. On the **DNSSEC** card, select
   **Enable DNSSEC**.
2. Copy the DS values Cloudflare generates for this domain. These values appear
   in the enable dialog and later through **DS record** on the DNSSEC card.
3. In NIC Chile's domain panel, open **Servidores de nombre (DNS)**, select the
   **(DNSSec)** form, choose **DS**, enter the Cloudflare-generated values,
   select **Publicar**, choose **Usar estos datos**, and finally select
   **Actualizar datos de dominio**.
4. Verify publication:

   ```bash
   dig DS your-domain.cl +short
   ```

Cloudflare generates the DS values, but it does **not** automatically update
NIC Chile. You must publish and save them in NIC Chile yourself.

## Verify the result

Replace `your-domain.cl` in these commands:

```bash
dig NS your-domain.cl +short
dig DS your-domain.cl +short
curl -I https://your-domain.cl
curl -I 'https://www.your-domain.cl/a-path?source=check'
```

The `dig NS` result should list the same two Cloudflare name servers shown in
the dashboard. After DNSSEC is enabled, `dig DS` should return the DS record
published at NIC Chile. The apex `curl` should return the Pages response over
HTTPS with a successful `2xx` status. The `www` request should return `301` and a `Location` header such as
`https://your-domain.cl/a-path?source=check`, confirming that it preserves the
path and query string.

Also verify:

- the Pages deployment is successful;
- the Cloudflare zone is **Active**;
- the apex Pages custom domain is **Active**;
- the page still works at `<project>.pages.dev`;
- any existing email still sends and receives correctly.

## Troubleshooting

### The `pages.dev` address returns 404

Check that `index.html` is at the repository root and that the build output
directory is `.`. Trigger a new deployment after correcting the setting.

### Cloudflare keeps the zone in Pending state

Compare the `dig NS` output, the NIC Chile **Servidores de nombre** values, and
the two values assigned in Cloudflare. They must match exactly. If they do,
allow time for propagation.

### DNSSEC makes the domain unreachable or returns `SERVFAIL`

Before the name-server change, an old DS record may still be published. Remove
or unpublish it at NIC Chile, save the domain update, and wait until
`dig DS your-domain.cl +short` returns no records before changing name servers.
After enabling DNSSEC in Cloudflare, compare Cloudflare's generated DS values
with the values published in NIC Chile and save the NIC Chile update. A DS record
that does not match Cloudflare's DNSSEC keys can cause validating resolvers to
return `SERVFAIL`.

### The `www` address does not redirect

Confirm the Bulk Redirect rule is enabled and that its list has status `301`
with Preserve query string, Subpath matching, Preserve path suffix, and Include
subdomains. Confirm DNS has the proxied `A` record `www` → `192.0.2.1`, with no
conflicting `www` record. Then inspect:

```bash
curl --head -i 'https://www.your-domain.cl/a-path?source=check'
```

### The custom domain returns error 522

Do not create only a manual CNAME. Cloudflare requires the hostname to be added
through the Pages project's **Custom domains** workflow as well.

### HTTPS remains pending

Confirm the zone and custom domain are active first. If the domain already has
CAA records, verify they allow Cloudflare's certificate authorities as described
in Cloudflare's custom-domain documentation.

### Email stopped after the name-server change

Recreate the previous MX, SPF, DKIM, and DMARC records in Cloudflare DNS. The
registrar change moves authoritative DNS; it does not automatically guarantee
that every mail record was copied.

## Fallback options

The `.cl` domain is not tied to Cloudflare Pages. If Pages is unavailable or its
workflow changes, keep the domain registered at NIC Chile and use another static
host such as GitHub Pages or Netlify. Update the DNS records or name servers to
the values supplied by that host; there is no need to buy another domain.

If you already use a different DNS provider and do not want to change name
servers, Cloudflare Pages also supports a subdomain such as `www.your-domain.cl`
through a CNAME pointing to `<project>.pages.dev`. Add the subdomain in Pages
**Custom domains before** creating that CNAME. The apex-domain method in this
guide is simpler when starting with a new NIC.cl domain because it keeps Pages
and DNS in one Cloudflare account.

## Official references

- [Cloudflare: deploy static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)
- [Cloudflare: Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare: Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare: set up a primary zone](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [Cloudflare: DNSSEC](https://developers.cloudflare.com/dns/dnssec/)
- [Cloudflare: redirect `www` to the apex](https://developers.cloudflare.com/pages/how-to/www-redirect/)
- [NIC Chile: enter DNSSEC DS data](https://www.nic.cl/ayuda/dnssec/ingreso-ds.html)
- [NIC Chile: domains with free page hosting](https://www.nic.cl/ayuda/faq/ins-06.html)
- [NIC Chile: DNS update timing](https://www.nic.cl/ayuda/faq/tec-01.html)
