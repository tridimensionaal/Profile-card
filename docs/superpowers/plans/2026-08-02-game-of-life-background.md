# Game of Life Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quiet, animated Conway's Game of Life canvas behind the existing profile and present the content on a readable card.

**Architecture:** A single dependency-free browser script owns both the pure B3/S23 state transition and a small canvas controller. The HTML supplies a decorative canvas, CSS establishes the background/card layers, and Node's built-in test runner exercises the rules and controller behavior without introducing a build step.

**Tech Stack:** Static HTML, CSS, browser Canvas 2D, plain JavaScript, Node.js built-in `node:test`.

## Global Constraints

- Keep the site static, framework-free, dependency-free, responsive, and accessible.
- Preserve the current near-black, warm off-white, and muted rose palette.
- Advance the simulation at about four generations per second.
- Treat opposite grid edges as adjacent.
- Reduced-motion mode must render one still generation and schedule no animation.
- The profile must remain usable when JavaScript or Canvas 2D is unavailable.
- Do not add simulation controls, pointer interaction, alternate rules, user-configurable colors, a framework, or a build step.

## File Structure

- Create `public/game-of-life.js`: pure Game of Life rules plus the isolated canvas controller and browser bootstrap.
- Create `test/game-of-life.test.js`: rule, edge wrapping, fallback, and motion-preference tests using `node:test`.
- Create `test/page-assets.test.js`: static integration checks for the canvas, script, layering, and card styles.
- Modify `public/index.html`: add the decorative canvas and deferred script reference.
- Modify `public/style.css`: add the fixed background layer and card surface while preserving the responsive content grid.
- Modify `docs/cloudflare-workers.md`: keep the deployed static-asset tree accurate.

---

### Task 1: Pure Game of Life Rules

**Files:**
- Create: `public/game-of-life.js`
- Create: `test/game-of-life.test.js`

**Interfaces:**
- Produces: `seedGrid(size: number, density?: number, random?: () => number): Uint8Array`.
- Produces: `nextGeneration(grid: Uint8Array, columns: number, rows: number): { grid: Uint8Array, population: number }`.
- The module exports both functions through `module.exports` in Node and remains a classic browser script.

- [ ] **Step 1: Write failing rule tests**

Create `test/game-of-life.test.js`:

```js
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { nextGeneration, seedGrid } = require("../public/game-of-life.js");

function gridWithLiveCells(columns, rows, liveCells) {
  const grid = new Uint8Array(columns * rows);
  for (const [column, row] of liveCells) {
    grid[row * columns + column] = 1;
  }
  return grid;
}

test("a dead cell is born with exactly three neighbors", () => {
  const grid = gridWithLiveCells(5, 5, [[1, 2], [2, 1], [3, 2]]);
  const result = nextGeneration(grid, 5, 5);
  assert.equal(result.grid[2 * 5 + 2], 1);
});

test("live cells survive with two or three neighbors and die otherwise", () => {
  const block = gridWithLiveCells(4, 4, [[1, 1], [2, 1], [1, 2], [2, 2]]);
  const isolated = gridWithLiveCells(4, 4, [[1, 1]]);

  assert.deepEqual(nextGeneration(block, 4, 4).grid, block);
  assert.equal(nextGeneration(isolated, 4, 4).population, 0);
});

test("the grid wraps across opposite edges", () => {
  const grid = gridWithLiveCells(5, 5, [[4, 4], [0, 4], [4, 0]]);
  const result = nextGeneration(grid, 5, 5);
  assert.equal(result.grid[0], 1);
});

test("seeding accepts an injectable random source", () => {
  const values = [0.1, 0.3, 0.05, 0.9];
  const grid = seedGrid(4, 0.18, () => values.shift());
  assert.deepEqual(grid, new Uint8Array([1, 0, 1, 0]));
});
```

- [ ] **Step 2: Run the tests and verify the expected failure**

Run: `node --test test/game-of-life.test.js`

Expected: FAIL because `public/game-of-life.js` does not exist or does not export the named functions.

- [ ] **Step 3: Implement the pure rules**

Create `public/game-of-life.js` with these rule functions and export boundary:

```js
"use strict";

function seedGrid(size, density = 0.18, random = Math.random) {
  const grid = new Uint8Array(size);

  for (let index = 0; index < size; index += 1) {
    grid[index] = random() < density ? 1 : 0;
  }

  return grid;
}

function nextGeneration(grid, columns, rows) {
  const next = new Uint8Array(grid.length);
  let population = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let neighbors = 0;

      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          if (rowOffset === 0 && columnOffset === 0) continue;

          const neighborColumn = (column + columnOffset + columns) % columns;
          const neighborRow = (row + rowOffset + rows) % rows;
          neighbors += grid[neighborRow * columns + neighborColumn];
        }
      }

      const index = row * columns + column;
      const alive = grid[index] === 1;
      const survives = alive && (neighbors === 2 || neighbors === 3);
      const born = !alive && neighbors === 3;

      if (survives || born) {
        next[index] = 1;
        population += 1;
      }
    }
  }

  return { grid: next, population };
}

const gameOfLife = { nextGeneration, seedGrid };

if (typeof module !== "undefined" && module.exports) {
  module.exports = gameOfLife;
}
```

- [ ] **Step 4: Run the rule tests and verify they pass**

Run: `node --test test/game-of-life.test.js`

Expected: four passing tests and zero failures.

- [ ] **Step 5: Commit the tested rules**

```bash
git add public/game-of-life.js test/game-of-life.test.js
git commit -m "feat: add game of life rules"
```

---

### Task 2: Canvas Controller and Motion Handling

**Files:**
- Modify: `public/game-of-life.js`
- Modify: `test/game-of-life.test.js`

**Interfaces:**
- Consumes: `seedGrid` and `nextGeneration` from Task 1.
- Produces: `createGameOfLifeBackground(canvas: HTMLCanvasElement, environment?: Window, options?: object): { destroy: () => void } | null`.
- `options.random` exists only to make seeding deterministic in tests; production uses `Math.random`.

- [ ] **Step 1: Add failing controller tests**

Append tests that build a fake canvas, 2D context, motion query, and window. Assert these behaviors:

```js
const { createGameOfLifeBackground } = require("../public/game-of-life.js");

function createHarness({ reducedMotion = false, contextAvailable = true } = {}) {
  const frames = [];
  const context = {
    clearRect() {},
    fillRect() {},
    setTransform() {},
    fillStyle: "",
  };
  const motionListeners = new Set();
  const motionQuery = {
    matches: reducedMotion,
    addEventListener(_name, listener) { motionListeners.add(listener); },
    removeEventListener(_name, listener) { motionListeners.delete(listener); },
  };
  const environment = {
    innerWidth: 120,
    innerHeight: 80,
    devicePixelRatio: 1,
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    cancelAnimationFrame() {},
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {},
    matchMedia() { return motionQuery; },
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext() { return contextAvailable ? context : null; },
  };

  return { canvas, environment, frames };
}

test("the canvas controller exits safely without a 2D context", () => {
  const harness = createHarness({ contextAvailable: false });
  assert.equal(createGameOfLifeBackground(harness.canvas, harness.environment), null);
});

test("reduced motion draws a still grid without scheduling a frame", () => {
  const harness = createHarness({ reducedMotion: true });
  const controller = createGameOfLifeBackground(
    harness.canvas,
    harness.environment,
    { random: () => 0.1 },
  );

  assert.ok(controller);
  assert.equal(harness.frames.length, 0);
  assert.equal(harness.canvas.width, 120);
});

test("normal motion schedules the animation loop", () => {
  const harness = createHarness();
  const controller = createGameOfLifeBackground(harness.canvas, harness.environment);

  assert.ok(controller);
  assert.equal(harness.frames.length, 1);
});
```

- [ ] **Step 2: Run the controller tests and verify the expected failure**

Run: `node --test test/game-of-life.test.js`

Expected: FAIL because `createGameOfLifeBackground` is not exported.

- [ ] **Step 3: Implement the controller and browser bootstrap**

Extend `public/game-of-life.js` with these exact constants and responsibilities:

```js
const CELL_SIZE = 20;
const GENERATION_INTERVAL = 250;
const MINIMUM_POPULATION_RATIO = 0.025;
const LIVE_CELL_COLOR = "rgba(189, 133, 136, 0.18)";

function createGameOfLifeBackground(canvas, environment, options = {}) {
  const context = canvas.getContext("2d");
  if (!context) return null;

  const random = options.random || Math.random;
  const motionQuery = environment.matchMedia("(prefers-reduced-motion: reduce)");
  let columns = 0;
  let rows = 0;
  let grid = new Uint8Array();
  let animationFrame = null;
  let resizeTimer = null;
  let previousTimestamp = 0;

  function draw() {
    context.clearRect(0, 0, environment.innerWidth, environment.innerHeight);
    context.fillStyle = LIVE_CELL_COLOR;

    for (let index = 0; index < grid.length; index += 1) {
      if (grid[index] === 0) continue;
      const column = index % columns;
      const row = Math.floor(index / columns);
      context.fillRect(column * CELL_SIZE + 1, row * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }
  }

  function resize() {
    const ratio = Math.min(environment.devicePixelRatio || 1, 2);
    columns = Math.max(1, Math.ceil(environment.innerWidth / CELL_SIZE));
    rows = Math.max(1, Math.ceil(environment.innerHeight / CELL_SIZE));
    canvas.width = Math.floor(environment.innerWidth * ratio);
    canvas.height = Math.floor(environment.innerHeight * ratio);
    canvas.style.width = `${environment.innerWidth}px`;
    canvas.style.height = `${environment.innerHeight}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    grid = seedGrid(columns * rows, 0.18, random);
    draw();
  }

  function tick(timestamp) {
    if (timestamp - previousTimestamp >= GENERATION_INTERVAL) {
      const next = nextGeneration(grid, columns, rows);
      grid = next.population < grid.length * MINIMUM_POPULATION_RATIO
        ? seedGrid(grid.length, 0.18, random)
        : next.grid;
      previousTimestamp = timestamp;
      draw();
    }
    animationFrame = environment.requestAnimationFrame(tick);
  }

  function stop() {
    if (animationFrame !== null) environment.cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  function start() {
    if (motionQuery.matches || animationFrame !== null) return;
    animationFrame = environment.requestAnimationFrame(tick);
  }

  function handleMotionChange() {
    if (motionQuery.matches) stop();
    else start();
  }

  function handleResize() {
    environment.clearTimeout(resizeTimer);
    resizeTimer = environment.setTimeout(resize, 150);
  }

  resize();
  start();
  environment.addEventListener("resize", handleResize);
  motionQuery.addEventListener("change", handleMotionChange);

  return {
    destroy() {
      stop();
      environment.clearTimeout(resizeTimer);
      environment.removeEventListener("resize", handleResize);
      motionQuery.removeEventListener("change", handleMotionChange);
    },
  };
}
```

Add `createGameOfLifeBackground` to `gameOfLife`, then bootstrap only when a browser document exists:

```js
if (typeof document !== "undefined" && typeof window !== "undefined") {
  const canvas = document.querySelector(".life-background");
  if (canvas) createGameOfLifeBackground(canvas, window);
}
```

- [ ] **Step 4: Run all controller and rule tests**

Run: `node --test test/game-of-life.test.js`

Expected: seven passing tests and zero failures.

- [ ] **Step 5: Commit the controller**

```bash
git add public/game-of-life.js test/game-of-life.test.js
git commit -m "feat: animate game of life canvas"
```

---

### Task 3: Background Layer and Profile Card

**Files:**
- Modify: `public/index.html`
- Modify: `public/style.css`
- Create: `test/page-assets.test.js`

**Interfaces:**
- Consumes: `.life-background` selector expected by the Task 2 bootstrap.
- Produces: a full-viewport decorative canvas at layer 0 and `.page` card at layer 1.

- [ ] **Step 1: Write the failing static integration test**

Create `test/page-assets.test.js`:

```js
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("public/index.html", "utf8");
const css = fs.readFileSync("public/style.css", "utf8");

test("the page loads a decorative Game of Life canvas and script", () => {
  assert.match(html, /<canvas class="life-background" aria-hidden="true"><\/canvas>/);
  assert.match(html, /<script src="game-of-life\.js" defer><\/script>/);
  assert.ok(html.indexOf("life-background") < html.indexOf("<main"));
});

test("the canvas stays behind a distinct content card", () => {
  assert.match(css, /\.life-background\s*{/);
  assert.match(css, /position:\s*fixed/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /\.page\s*{[^}]*background:/s);
  assert.match(css, /\.page\s*{[^}]*z-index:\s*1/s);
});
```

- [ ] **Step 2: Run the static integration test and verify the expected failure**

Run: `node --test test/page-assets.test.js`

Expected: FAIL because the canvas, script, and card rules are absent.

- [ ] **Step 3: Add the canvas and script to the page**

In `public/index.html`, add this immediately after `<body>` and before the hidden icon sprite:

```html
    <canvas class="life-background" aria-hidden="true"></canvas>
```

Add this after `</main>` and before `</body>`:

```html
    <script src="game-of-life.js" defer></script>
```

- [ ] **Step 4: Create the canvas layer and card surface**

In `public/style.css`, update the body to establish a stacking context and outer spacing:

```css
body {
  position: relative;
  isolation: isolate;
  margin: 0;
  display: flex;
  min-height: 100vh;
  min-height: 100svh;
  padding: clamp(1rem, 4vw, 2.5rem);
  background: var(--color-background);
  color: var(--color-text);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 1rem;
  line-height: 1.6;
}
```

Add the fixed decorative layer:

```css
.life-background {
  position: fixed;
  z-index: 0;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
```

Replace the one-line `.page` rule with:

```css
.page {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 48rem;
  margin: auto;
  padding: clamp(2rem, 7vw, 4rem) clamp(1.25rem, 5vw, 3rem);
  border: 0.0625rem solid rgba(189, 133, 136, 0.28);
  border-radius: 1rem;
  background: rgba(17, 17, 17, 0.88);
  box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(0.25rem);
}
```

- [ ] **Step 5: Run both test files and inspect the responsive layout**

Run: `node --test test/*.test.js`

Expected: nine passing tests and zero failures.

Serve with: `python3 -m http.server 4173 --directory public`

Inspect at 375×812 and 1280×900. Confirm the card never clips horizontally,
the profile links remain readable and keyboard-focusable, and visible ambient
cells surround the card without competing with it.

Enable reduced motion in browser developer tools and confirm the cells remain
still after the initial draw.

- [ ] **Step 6: Commit the integrated page**

```bash
git add public/index.html public/style.css test/page-assets.test.js
git commit -m "feat: place profile on animated background"
```

---

### Task 4: Deployment Documentation and Final Verification

**Files:**
- Modify: `docs/cloudflare-workers.md`

**Interfaces:**
- Consumes: the final static assets from Tasks 1–3.
- Produces: accurate deployment documentation and a verified PR-ready branch.

- [ ] **Step 1: Update the deployed file tree**

Change the static asset tree in `docs/cloudflare-workers.md` to:

```text
public/
├── game-of-life.js
├── index.html
├── style.css
└── img/
    └── profile.png
```

- [ ] **Step 2: Run the full automated verification**

Run: `node --test test/*.test.js`

Expected: nine passing tests and zero failures.

Run: `git diff --check`

Expected: no output and exit status 0.

Run: `git status --short`

Expected before the documentation commit: only `docs/cloudflare-workers.md` is modified.

- [ ] **Step 3: Commit the documentation**

```bash
git add docs/cloudflare-workers.md
git commit -m "docs: list game of life asset"
```

- [ ] **Step 4: Review the complete branch diff**

Run: `git diff --stat main...HEAD && git diff --check main...HEAD`

Expected: the design, plan, JavaScript, tests, HTML, CSS, and deployment documentation are present, with no whitespace errors or unrelated changes.

- [ ] **Step 5: Hand off to the publishing workflow**

Use the `github:yeet` workflow to confirm the exact diff, push
`feat/game-of-life-background`, and open a draft PR targeting `main`. The PR
body must summarize the ambient canvas, readable card, reduced-motion behavior,
and the `node --test test/*.test.js` validation.
