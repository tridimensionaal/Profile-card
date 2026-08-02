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

  assert.equal(
    gameOfLife().createGameOfLifeBackground(harness.canvas, harness.environment),
    null,
  );
});

test("reduced motion draws a still grid without scheduling a frame", () => {
  const harness = createHarness({ reducedMotion: true });
  const controller = gameOfLife().createGameOfLifeBackground(
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
  const controller = gameOfLife().createGameOfLifeBackground(
    harness.canvas,
    harness.environment,
  );

  assert.ok(controller);
  assert.equal(harness.frames.length, 1);
});

function gameOfLife() {
  return require("../public/game-of-life.js");
}
