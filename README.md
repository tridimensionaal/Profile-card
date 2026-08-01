# Profile card

A small personal homepage built with plain HTML and CSS. It has no JavaScript,
framework, package installation, or build step.

## Run locally

From the repository root:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000> and stop the server with `Ctrl+C`.

## Change the content

- Edit the name and bio in the `.profile__content` block in `index.html`.
- Each destination is one `<li>` inside a `.link-list` in `index.html`. Copy a
  list item to add a link or delete it to remove a link.
- Change the fragment after `href="#` to select another symbol from the hidden icon sprite near the top of `index.html`.
- Copy a complete `.link-group` section to add another category.
- Replace `img/profile.png` while keeping the same filename, or update its `src`,
  `alt`, `width`, and `height` in `index.html`.

## Try another palette

All interface colors are defined once at the top of `style.css`:

```css
--color-background: #111111;
--color-text: #e7e1d5;
--color-accent: #bd8588;
```

Change those three values and reload the page. Keep enough contrast between the
background and both text colors.

## Deploy

See [`docs/cloudflare-pages.md`](docs/cloudflare-pages.md) for the Cloudflare
Pages setup and the steps for connecting a domain registered at NIC Chile.

## History

The original profile card was based on a
[CodePen project](https://codepen.io/bobbykorec/pen/jyeeQP). The current version
is a ground-up static rewrite focused on readable content and simple maintenance.
