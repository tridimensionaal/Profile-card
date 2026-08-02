const canvas = document.querySelector(".life-background");
const context = canvas.getContext("2d");
const cellSize = 20;

let columns;
let rows;
let cells;

function reset() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  columns = Math.ceil(canvas.width / cellSize);
  rows = Math.ceil(canvas.height / cellSize);
  cells = new Uint8Array(columns * rows);

  for (let index = 0; index < cells.length; index += 1) {
    cells[index] = Math.random() < 0.18 ? 1 : 0;
  }

  draw();
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(189, 133, 136, 0.18)";

  for (let index = 0; index < cells.length; index += 1) {
    if (!cells[index]) continue;

    const x = (index % columns) * cellSize;
    const y = Math.floor(index / columns) * cellSize;
    context.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
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
          neighbors += cells[neighborRow * columns + neighborColumn];
        }
      }

      const index = row * columns + column;
      next[index] = neighbors === 3 || (cells[index] && neighbors === 2) ? 1 : 0;
    }
  }

  cells = next;
  draw();
}

reset();
window.addEventListener("resize", reset);

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.setInterval(update, 250);
}
