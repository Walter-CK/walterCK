// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: signal;
// === 1. Parse Shortcut Input ===
let input = args.shortcutParameter ?? `x::["9AM","10AM","11AM","12PM","1PM"]@@cpu::[25,30,null,35,31]@@memory::[58,60,63,59,64]@@ymin::0@@ymax::100`;
input = input
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/\u2026/g, '...');

let chunks = input.split("@@");
let xLabels = [];
let seriesList = [];
let yMinOverride = null;
let yMaxOverride = null;

for (let chunk of chunks) {
  let colonIdx = chunk.indexOf("::");
  if (colonIdx === -1) continue;
  let key = chunk.slice(0, colonIdx).trim();
  let value = chunk.slice(colonIdx + 2).trim();
  let lower = key.toLowerCase();
  try {
    let parsed = JSON.parse(value);
    if (lower === "x") xLabels = parsed;
    else if (lower === "ymin") yMinOverride = Number(parsed);
    else if (lower === "ymax") yMaxOverride = Number(parsed);
    else seriesList.push({ label: key, data: parsed });
  } catch (e) {
    let num = Number(value);
    if (!isNaN(num)) {
      if (lower === "ymin") yMinOverride = num;
      else if (lower === "ymax") yMaxOverride = num;
    }
  }
}

if (seriesList.length === 0) { console.error("No series data found."); Script.complete(); }

if (xLabels.length === 0) {
  let maxLen = Math.max(...seriesList.map(s => s.data.length));
  xLabels = Array.from({ length: maxLen }, (_, i) => String(i + 1));
}

// === 2. Canvas Setup ===
const width = 500;
const height = 950;
const title = "System Metrics";
const scale = Device.screenScale();

const titleHeight = 30;
const legendLineHeight = 22;
const legendHeight = legendLineHeight * seriesList.length + 8;
const marginTop = titleHeight + legendHeight + 16;
const marginBottom = 50;
const marginLeft = 52;
const marginRight = 20;
const graphWidth = width - marginLeft - marginRight;
const graphHeight = height - marginTop - marginBottom;

const bgColor       = new Color("#000000");
const axisColor     = new Color("#333333");
const gridColor     = new Color("#111111");
const labelColor    = new Color("#ffffff");
const dimLabelColor = new Color("#555555");
const titleColor    = new Color("#ffffff");

const colorPalette = [
  new Color("#3b9eff"),
  new Color("#34c96a"),
  new Color("#ff6058"),
  new Color("#f5c542"),
  new Color("#a78bfa"),
];

let ctx = new DrawContext();
ctx.size = new Size(width * scale, height * scale);
ctx.opaque = true;
ctx.respectScreenScale = false;
ctx.setFillColor(new Color("#000000"));
ctx.fillRect(new Rect(0, 0, width * scale, height * scale));

function sp(x, y) { return new Point(x * scale, y * scale); }
function approxTextWidth(str, fontSize) { return str.length * fontSize * 0.68; }

// === 3. Nice Y Ticks ===
let allValues = seriesList.flatMap(s => s.data).filter(v => v != null && !isNaN(v));
if (allValues.length === 0) { console.error("No numeric data."); Script.complete(); }

let minVal = yMinOverride ?? Math.min(...allValues);
let maxVal = yMaxOverride ?? Math.max(...allValues);
if (maxVal === minVal) maxVal = minVal + 1;

function niceStep(rawRange, targetSteps) {
  let rough = rawRange / targetSteps;
  let mag = Math.pow(10, Math.floor(Math.log10(rough)));
  let norm = rough / mag;
  let nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return nice * mag;
}

const targetSteps = 5;
let tickStep = niceStep(maxVal - minVal, targetSteps);
let tickMin = Math.floor(minVal / tickStep) * tickStep;
let tickMax = Math.ceil(maxVal / tickStep) * tickStep;
let ticks = [];
for (let v = tickMin; v <= tickMax + tickStep * 0.001; v += tickStep) {
  ticks.push(Math.round(v * 1000) / 1000);
}
let range = tickMax - tickMin;

function xPos(i) {
  return xLabels.length > 1 ? marginLeft + i * (graphWidth / (xLabels.length - 1)) : marginLeft + graphWidth / 2;
}
function yPos(val) {
  let clamped = Math.min(Math.max(val, tickMin), tickMax);
  return marginTop + ((tickMax - clamped) / range) * graphHeight;
}

// === 4. Title ===
ctx.setFont(Font.boldSystemFont(20 * scale));
ctx.setTextColor(titleColor);
ctx.drawText(title, sp(marginLeft, 10));

// === 5. Legend ===
ctx.setFont(Font.systemFont(11 * scale));
const dotR = 3;
seriesList.forEach((series, i) => {
  let color = colorPalette[i % colorPalette.length];
  let y = titleHeight + i * legendLineHeight + 6;
  ctx.setFillColor(color);
  ctx.fillEllipse(new Rect(marginLeft * scale, (y + 4) * scale, dotR * 2 * scale, dotR * 2 * scale));
  ctx.setTextColor(color);
  ctx.drawText(series.label, sp(marginLeft + dotR * 2 + 6, y));
});

// === 6. Grid + Y Labels ===
const yLabelFontSize = 9;
ctx.setFont(Font.systemFont(yLabelFontSize * scale));

ticks.forEach(val => {
  let y = yPos(val);
  ctx.setFillColor(gridColor);
  ctx.fillRect(new Rect(marginLeft * scale, Math.round(y * scale), graphWidth * scale, 1 * scale));
  let label = Number.isInteger(val) ? String(val) : val.toFixed(1);
  let labelX = marginLeft - approxTextWidth(label, yLabelFontSize) - 5;
  ctx.setTextColor(dimLabelColor);
  ctx.drawText(label, sp(labelX, y - yLabelFontSize / 2 - 1));
});

// === 7. Axes ===
ctx.setFillColor(axisColor);
ctx.fillRect(new Rect((marginLeft - 1) * scale, marginTop * scale, 1 * scale, graphHeight * scale));
ctx.fillRect(new Rect(marginLeft * scale, (marginTop + graphHeight) * scale, graphWidth * scale, 1 * scale));

// === 8. Plot Data ===
seriesList.forEach((series, index) => {
  let color = colorPalette[index % colorPalette.length];
  ctx.setFillColor(color);
  let data = series.data;

  for (let i = 1; i < data.length; i++) {
    if (data[i] == null || data[i - 1] == null) continue;
    let x1 = xPos(i - 1), y1 = yPos(data[i - 1]);
    let x2 = xPos(i),     y2 = yPos(data[i]);
    let dx = x2 - x1, dy = y2 - y1;
    let segments = Math.max(1, Math.floor(Math.sqrt(dx*dx + dy*dy) / 3));
    for (let j = 0; j <= segments; j++) {
      let t = j / segments, r = 1.5;
      ctx.fillEllipse(new Rect((x1+dx*t-r)*scale, (y1+dy*t-r)*scale, r*2*scale, r*2*scale));
    }
  }

  const ptR = 3.5;
  for (let i = 0; i < data.length; i++) {
    if (data[i] == null) continue;
    ctx.fillEllipse(new Rect((xPos(i)-ptR)*scale, (yPos(data[i])-ptR)*scale, ptR*2*scale, ptR*2*scale));
  }
});

// === 9. X Axis Labels ===
const xLabelFontSize = 9;
ctx.setFont(Font.systemFont(xLabelFontSize * scale));
ctx.setTextColor(dimLabelColor);
const xLabelY = marginTop + graphHeight + 8;

let maxLabelW = Math.max(...xLabels.map(l => approxTextWidth(String(l), xLabelFontSize)));
const minSpacing = maxLabelW + 8;

let labelInterval = 1;
while (labelInterval < xLabels.length) {
  let ok = true, prevX = -Infinity;
  for (let i = 0; i < xLabels.length; i += labelInterval) {
    let cx = xPos(i);
    if (cx - prevX < minSpacing) { ok = false; break; }
    prevX = cx;
  }
  if (ok) break;
  labelInterval++;
}

let prevDrawX = -Infinity;
for (let i = 0; i < xLabels.length; i++) {
  let onInterval = i % labelInterval === 0;
  let isLast = i === xLabels.length - 1;
  let lastWouldBeSkipped = (xLabels.length - 1) % labelInterval !== 0;
  if (!onInterval && !(isLast && lastWouldBeSkipped)) continue;
  let cx = xPos(i);
  if (cx - prevDrawX < minSpacing) continue;
  let labelText = String(xLabels[i]);
  let lw = approxTextWidth(labelText, xLabelFontSize);
  let labelX = Math.max(marginLeft, Math.min(cx - lw/2, marginLeft + graphWidth - lw));
  ctx.drawText(labelText, sp(labelX, xLabelY));
  prevDrawX = cx;
}

// === 10. Render ===
let img = ctx.getImage();
let base64 = Data.fromPNG(img).toBase64String();

let wv = new WebView();
let html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1.0,maximum-scale=1.0'><style>*{box-sizing:border-box;margin:0;padding:0}html{background:#000}body{background:#000;overflow-y:auto;overflow-x:hidden;width:100vw}img{width:100%;height:auto;display:block}</style></head><body><img src='data:image/png;base64," + base64 + "'/></body></html>";

await wv.loadHTML(html);
await wv.present(true);
