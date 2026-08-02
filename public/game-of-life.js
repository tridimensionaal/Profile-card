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
      context.fillRect(
        column * CELL_SIZE + 1,
        row * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2,
      );
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
    if (animationFrame !== null) {
      environment.cancelAnimationFrame(animationFrame);
    }
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

const gameOfLife = {
  createGameOfLifeBackground,
  nextGeneration,
  seedGrid,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = gameOfLife;
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  const canvas = document.querySelector(".life-background");
  if (canvas) createGameOfLifeBackground(canvas, window);
}
