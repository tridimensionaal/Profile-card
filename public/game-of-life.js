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
