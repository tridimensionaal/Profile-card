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
