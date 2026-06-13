#!/usr/bin/env node
// Rasterizes the official "Sol y Luna" logo SVGs into the PNG assets the app, backend PDFs,
// and user manual consume. Single source of truth: the logo SVGs under the Documentation repo.
//
// Why a script: no system SVG rasterizer is installed (no rsvg/cairo/inkscape/ImageMagick), and
// the icons must be regenerable when the brand art changes. @resvg/resvg-js ships a prebuilt
// native binary and accepts a font file, so the vertical lockup (which uses live Montserrat-Bold
// text, not outlined paths) renders with the correct wordmark.
//
// resvg has no padding/compositing primitive, so we wrap each source SVG in a canvas SVG with a
// centered+scaled <g> and an optional white background rect — one render call per target.
//
// Usage:  SVG_SRC="/abs/path/to/Logos Sol y Luna" node scripts/generate-brand-assets.mjs
// Default SVG_SRC resolves to the sibling Documentation repo in the canonical workspace layout.

import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SVG_SRC =
  process.env.SVG_SRC ||
  resolve(REPO_ROOT, "../../NursingCareDocumentation/assets/Logos Sol y Luna");
const FONT = resolve(__dirname, "fonts/Montserrat-Bold.ttf");
const OUT = resolve(REPO_ROOT, "assets/images");

if (!existsSync(SVG_SRC)) {
  console.error(`ABORT: logo source folder not found: ${SVG_SRC}\nSet SVG_SRC to the "Logos Sol y Luna" folder.`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

// Pull the viewBox + inner markup out of a source SVG so we can re-wrap it on our own canvas.
function parseSvg(file) {
  const raw = readFileSync(join(SVG_SRC, file), "utf8");
  const vb = raw.match(/viewBox\s*=\s*"([\d.\s-]+)"/i);
  if (!vb) throw new Error(`no viewBox in ${file}`);
  const [, , w, h] = vb[1].trim().split(/\s+/).map(Number);
  const inner = raw.slice(raw.indexOf(">", raw.indexOf("<svg")) + 1, raw.lastIndexOf("</svg>"));
  return { w, h, inner };
}

// Build a wrapper SVG: source content centered + scaled to occupy `frac` of the canvas.
// mode "square": canvas is size×size. mode "fit": canvas keeps the source aspect (height derived).
function wrap({ w, h, inner }, { size, frac, bg, mode }) {
  let cw, ch;
  if (mode === "fit") {
    cw = size;
    ch = Math.round((size * h) / w);
  } else {
    cw = ch = size;
  }
  const scale = (Math.min(cw, ch) * frac) / Math.max(w, h);
  const tx = (cw - w * scale) / 2;
  const ty = (ch - h * scale) / 2;
  const rect = bg ? `<rect width="${cw}" height="${ch}" fill="${bg}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cw} ${ch}" width="${cw}" height="${ch}">${rect}<g transform="translate(${tx} ${ty}) scale(${scale})">${inner}</g></svg>`;
}

function render(svg, widthPx) {
  const r = new Resvg(svg, {
    fitTo: { mode: "width", value: widthPx },
    font: { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: "Montserrat" },
  });
  return r.render().asPng();
}

const MARK = parseSvg("imagotipo.svg"); // indigo #2e3191 moon + gold #fddc00 sun, path-only
const VERT = parseSvg("logo V.svg"); // vertical lockup: mark + "SOL Y LUNA" / "CASA HOGAR" wordmark

// target: [outFile, sourceParsed, {size, frac, bg, mode}, renderWidthPx]
const targets = [
  // App icon — mark on white, generous fill (iOS masks corners).
  ["icon.png", MARK, { size: 1024, frac: 0.78, bg: "#ffffff", mode: "square" }, 1024],
  // Android adaptive foreground — mark ~62% inside transparent canvas (outer ~25% is cropped by the mask).
  ["adaptive-icon.png", MARK, { size: 1024, frac: 0.62, bg: null, mode: "square" }, 1024],
  // Splash images — mark on white (splash background stays light); Expo "contain"-scales these.
  ["logo.png", MARK, { size: 1024, frac: 0.7, bg: "#ffffff", mode: "square" }, 1024],
  ["splash-icon.png", MARK, { size: 1024, frac: 0.7, bg: "#ffffff", mode: "square" }, 1024],
  // Expo web favicon — small mark on white.
  ["favicon.png", MARK, { size: 196, frac: 0.84, bg: "#ffffff", mode: "square" }, 196],
  // Login / manual-cover vertical lockup — transparent, keep aspect, wordmark rendered via Montserrat-Bold.
  ["logo-vertical.png", VERT, { size: 1024, frac: 0.97, bg: null, mode: "fit" }, 1024],
];

for (const [name, src, opts, px] of targets) {
  const png = render(wrap(src, opts), px);
  writeFileSync(join(OUT, name), png);
  console.log(`  wrote assets/images/${name}  (${png.length.toLocaleString()} bytes)`);
}

// Cross-repo brand artifacts (consumed by the backend PDFs and the user manual). Written only when
// the destination is provided, so the canonical layout regenerates them into the sibling repos:
//   BACKEND_MARK_OUT=../../NursingCareBackend/src/NursingCareBackend.Infrastructure/Branding/sol-y-luna-mark.png
//   DOCS_VERTICAL_OUT=../../NursingCareDocumentation/assets/sol-y-luna-vertical.png
const extras = [
  // Mark for backend PDF headers — transparent (sits over white document), 512².
  ["BACKEND_MARK_OUT", MARK, { size: 512, frac: 0.92, bg: null, mode: "square" }, 512],
  // Vertical lockup for the manual cover — same art as the login lockup.
  ["DOCS_VERTICAL_OUT", VERT, { size: 1024, frac: 0.97, bg: null, mode: "fit" }, 1024],
];
for (const [envVar, src, opts, px] of extras) {
  const dest = process.env[envVar];
  if (!dest) continue;
  const out = resolve(REPO_ROOT, dest);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, render(wrap(src, opts), px));
  console.log(`  wrote ${dest}`);
}
console.log("done.");
