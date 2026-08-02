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
