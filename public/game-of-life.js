const canvas = document.querySelector(".life-background");
const context = canvas.getContext("2d");
const cellSize = 20;
const initialDensity = 0.12;
const rememberedGenerations = 8;

// Brian's Brain rule reference:
// https://ccl.northwestern.edu/netlogo/models/Brian%27sBrain
const dead = 0;
const firing = 1;
const refractory = 2;

let columns;
let rows;
let cells;
let recentGenerations;

function nextCellState(state, firingNeighbors) {
  if (state === firing) return refractory;
  if (state === refractory) return dead;
  return firingNeighbors === 2 ? firing : dead;
}

function generationsMatch(first, second) {
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) return false;
  }

  return true;
}

function reset() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  columns = Math.ceil(canvas.width / cellSize);
  rows = Math.ceil(canvas.height / cellSize);
  cells = new Uint8Array(columns * rows);

  for (let index = 0; index < cells.length; index += 1) {
    cells[index] = Math.random() < initialDensity ? firing : dead;
  }

  recentGenerations = [cells.slice()];
  draw();
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  for (const [state, color] of [
    [refractory, "rgba(189, 133, 136, 0.07)"],
    [firing, "rgba(189, 133, 136, 0.18)"],
  ]) {
    context.fillStyle = color;

    for (let index = 0; index < cells.length; index += 1) {
      if (cells[index] !== state) continue;

      const x = (index % columns) * cellSize;
      const y = Math.floor(index / columns) * cellSize;
      context.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    }
  }
}

function update() {
  const next = new Uint8Array(cells.length);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let neighbors = 0;

      for (let y = -1; y <= 1; y += 1) {
        for (let x = -1; x <= 1; x += 1) {
          if (x === 0 && y === 0) continue;

          const neighborColumn = (column + x + columns) % columns;
          const neighborRow = (row + y + rows) % rows;
          if (cells[neighborRow * columns + neighborColumn] === firing) {
            neighbors += 1;
          }
        }
      }

      const index = row * columns + column;
      next[index] = nextCellState(cells[index], neighbors);
    }
  }

  if (recentGenerations.some((generation) => generationsMatch(next, generation))) {
    reset();
    return;
  }

  cells = next;
  recentGenerations.push(cells.slice());
  if (recentGenerations.length > rememberedGenerations) recentGenerations.shift();
  draw();
}

reset();
window.addEventListener("resize", reset);

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.setInterval(update, 250);
}
