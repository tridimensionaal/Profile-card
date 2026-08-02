# Game of Life Background Design

## Goal

Add a subtle, animated Conway's Game of Life texture behind the profile while
presenting the existing page content as a readable card. Keep the site static,
dependency-free, responsive, and accessible.

## Visual Design

- Preserve the current near-black background, warm off-white text, and muted
  rose accent.
- Cover the viewport with a fixed canvas behind the page content. Live cells
  use the rose accent at low opacity so the animation reads as ambient texture
  rather than the main subject.
- Give the existing `.page` element a semi-opaque near-black surface, a subtle
  accent-tinted border, a soft shadow, and modest rounding. The card stays
  centered and retains the current responsive layout.
- Leave enough outer spacing for the animated field to remain visible around
  the card on desktop and mobile.

## Page Structure

`public/index.html` will gain one decorative canvas before the main content and
one deferred script reference after the content. The canvas will be marked
`aria-hidden="true"`; it will not accept pointer input or appear in the tab
order. Existing profile content and link semantics remain unchanged.

`public/style.css` will place the canvas at a fixed, full-viewport layer and the
card above it. The body will keep its existing centering behavior and scrolling
will continue to work when the viewport is shorter than the card.

## Simulation

`public/game-of-life.js` will contain a small, framework-free implementation:

- Build a responsive grid from the canvas's CSS dimensions using cells large
  enough to avoid visual noise.
- Seed the grid randomly at a low density.
- Apply Conway's B3/S23 rules: a cell is born with exactly three neighbors and
  survives with two or three neighbors.
- Treat opposite grid edges as adjacent, avoiding visibly dead borders.
- Render only live cells, without grid lines, using a low-opacity accent color.
- Advance about four generations per second. A `requestAnimationFrame` loop
  uses timestamps to cap simulation updates independently of display refresh
  rate.
- Rebuild and reseed the grid after a debounced viewport resize.
- Reseed if the population becomes too small to sustain a useful texture.

The script will exit safely if the canvas or a 2D rendering context is not
available. It will not block or hide the profile content.

## Motion and Performance

When `prefers-reduced-motion: reduce` matches, the script draws one seeded
generation and does not schedule an animation loop. It will respond if that
preference changes while the page is open.

The grid is based on CSS pixels, while the backing canvas accounts for device
pixel ratio (capped to avoid excessive memory use). The animation loop naturally
stops receiving frames in most hidden browser tabs. No third-party code or
runtime dependency is introduced.

## Validation

- Unit-test the pure next-generation logic with birth, survival, death, and
  edge-wrapping cases.
- Check that the static asset references resolve and the page remains usable if
  JavaScript or canvas support is absent.
- Manually inspect desktop and narrow viewport layouts for card readability,
  outer background visibility, resizing, and animation intensity.
- Verify reduced-motion mode produces a still background.

## Scope

This change does not add simulation controls, pointer interaction, alternate
rules, user-configurable colors, a framework, or a build step.
