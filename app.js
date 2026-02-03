// Enables strict mode to catch common JS mistakes.
'use strict';
/**
* Blueprint Flooring Estimator
// Implements the next part of the estimator workflow.
* - Upload PNG/JPG blueprint
* - Draw shapes on canvas
* - Enter REAL dimensions in feet + label
* - Saves selections and totals
// Implements the next part of the estimator workflow.
*
* Required HTML element IDs:
* blueprintInput, shapeMode, undoBtn, clearBtn,
* statusOut, canvas, totalOut, countOut, listOut
// Grabs required DOM elements from the page for controls/output.
*/
// ----- Grab DOM -----
const blueprintInput = document.getElementById('blueprintInput');
// Grabs required DOM elements from the page for controls/output.
const shapeModeEl = document.getElementById('shapeMode');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
// Grabs required DOM elements from the page for controls/output.
const statusOut = document.getElementById('statusOut');
const canvas = document.getElementById('canvas');
const totalOut = document.getElementById('totalOut');
const countOut = document.getElementById('countOut');
// Grabs required DOM elements from the page for controls/output.
const listOut = document.getElementById('listOut');
if (!canvas) throw new Error('Missing #canvas in HTML.');
const ctx = canvas.getContext('2d');
// Defines app state used to track the image, mode, and drawn selections.
// ----- State -----
let blueprintImg = null;
// Defines app state used to track the image, mode, and drawn selections.
// saved selections (normalized geometry + real measurements + computed area)
let selections = [];
// drawing interaction state
// Implements the next part of the estimator workflow.
let mode = (shapeModeEl?.value || 'rect'); // 'rect' | 'circle' | 'tri'
let isDragging = false;
// for rect
// Implements the next part of the estimator workflow.
let dragStart = null; // {x, y} in CSS px
let dragEnd = null;
// for circle
// Implements the next part of the estimator workflow.
let circleCenter = null; // {x,y}
let circleEdge = null; // {x,y}
// for triangle
// Defines a helper to update the status text in the UI.
let triPoints = []; // [{x,y},{x,y},{x,y}] in CSS px
// ----- Helpers -----
function setStatus(msg) {
// Defines a helper to clamp a number between 0 and 1.
if (statusOut) statusOut.textContent = msg;
}
function clamp01(n) {
// Defines a helper to format numbers to 2 decimals for display.
return Math.max(0, Math.min(1, n));
}
function fmt2(n) {
// Defines a helper to format numbers to 2 decimals for display.
const x = Number(n);
if (!Number.isFinite(x)) return '0.00';
return x.toFixed(2);
}
// Converts mouse events into canvas coordinates.
function getCanvasCssPointFromEvent(e) {
const r = canvas.getBoundingClientRect();
const x = e.clientX - r.left;
// Implements the next part of the estimator workflow.
const y = e.clientY - r.top;
return { x, y };
}
// Converts CSS pixel coordinates to normalized (0–1) coordinates.
function cssToNorm(pt) {
const r = canvas.getBoundingClientRect();
const w = Math.max(1, r.width);
const h = Math.max(1, r.height);
// Converts normalized coordinates back to CSS pixel coordinates.
return { x: clamp01(pt.x / w), y: clamp01(pt.y / h) };
}
function normToCss(ptN) {
// Implements the next part of the estimator workflow.
const r = canvas.getBoundingClientRect();
const w = Math.max(1, r.width);
const h = Math.max(1, r.height);
return { x: ptN.x * w, y: ptN.y * h };
// Defines a helper to compute distance between two points.
}
function dist(a, b) {
const dx = a.x - b.x;
// Implements the next part of the estimator workflow.
const dy = a.y - b.y;
return Math.sqrt(dx * dx + dy * dy);
}
// Resizes the canvas to fit its container and handles high-DPI screens.
// --- Canvas resize helper (prevents tiny 300x150 canvas) ---
function fitCanvasToWrap() {
const wrap = canvas.parentElement;
const rect = (wrap ? wrap.getBoundingClientRect() : canvas.getBoundingClientRect());
// Resizes the canvas to fit its container and handles high-DPI screens.
const dpr = window.devicePixelRatio || 1;
const w = Math.max(1, Math.floor(rect.width));
const h = Math.max(1, Math.floor(rect.height));
// Implements the next part of the estimator workflow.
canvas.width = Math.floor(w * dpr);
canvas.height = Math.floor(h * dpr);
// Section header / documentation comment.
// normalize drawing so we can draw in CSS pixels
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
render();
// Resizes the canvas to fit its container and handles high-DPI screens.
}
window.addEventListener('resize', fitCanvasToWrap);
// Clears the canvas before re-drawing.
// ----- Rendering -----
function clearCanvas() {
const r = canvas.getBoundingClientRect();
ctx.clearRect(0, 0, r.width, r.height);
// Implements the next part of the estimator workflow.
}
function drawBlueprint() {
const r = canvas.getBoundingClientRect();
// Implements the next part of the estimator workflow.
const w = r.width;
const h = r.height;
if (!blueprintImg) {
// Section header / documentation comment.
// empty background
ctx.fillStyle = '#fafafa';
ctx.fillRect(0, 0, w, h);
ctx.strokeStyle = '#ddd';
// Implements the next part of the estimator workflow.
ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
return;
}
// Section header / documentation comment.
// Fit image into canvas while preserving aspect ratio
const iw = blueprintImg.naturalWidth || blueprintImg.width;
const ih = blueprintImg.naturalHeight || blueprintImg.height;
// Implements the next part of the estimator workflow.
const scale = Math.min(w / iw, h / ih);
const dw = iw * scale;
const dh = ih * scale;
const dx = (w - dw) / 2;
// Implements the next part of the estimator workflow.
const dy = (h - dh) / 2;
// background
ctx.fillStyle = '#fafafa';
// Implements the next part of the estimator workflow.
ctx.fillRect(0, 0, w, h);
ctx.drawImage(blueprintImg, dx, dy, dw, dh);
// Section header / documentation comment.
// thin border
ctx.strokeStyle = '#ddd';
ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}
// Implements the next part of the estimator workflow.
function drawSelections() {
const r = canvas.getBoundingClientRect();
const w = r.width;
// Implements the next part of the estimator workflow.
const h = r.height;
// saved shapes
for (const s of selections) {
// Implements the next part of the estimator workflow.
ctx.lineWidth = 2;
ctx.strokeStyle = '#16a34a'; // green-ish
ctx.fillStyle = 'rgba(22,163,74,0.10)';
// Converts normalized coordinates back to CSS pixel coordinates.
if (s.type === 'rect') {
const p1 = normToCss(s.geo.p1);
const p2 = normToCss(s.geo.p2);
// Implements the next part of the estimator workflow.
const x = Math.min(p1.x, p2.x);
const y = Math.min(p1.y, p2.y);
const rw = Math.abs(p2.x - p1.x);
const rh = Math.abs(p2.y - p1.y);
// Implements the next part of the estimator workflow.
ctx.fillRect(x, y, rw, rh);
ctx.strokeRect(x, y, rw, rh);
// Section header / documentation comment.
// label
ctx.fillStyle = '#0f172a';
ctx.font = '12px system-ui';
ctx.fillText(s.label || '', x + 6, y + 14);
// Converts normalized coordinates back to CSS pixel coordinates.
}
if (s.type === 'circle') {
const c = normToCss(s.geo.c);
// Implements the next part of the estimator workflow.
const rr = s.geo.r * Math.min(w, h);
ctx.beginPath();
ctx.arc(c.x, c.y, rr, 0, Math.PI * 2);
// Implements the next part of the estimator workflow.
ctx.closePath();
ctx.fill();
ctx.stroke();
// Implements the next part of the estimator workflow.
ctx.fillStyle = '#0f172a';
ctx.font = '12px system-ui';
ctx.fillText(s.label || '', c.x + 6, c.y - 6);
}
// Converts normalized coordinates back to CSS pixel coordinates.
if (s.type === 'tri') {
const a = normToCss(s.geo.a);
const b = normToCss(s.geo.b);
// Converts normalized coordinates back to CSS pixel coordinates.
const c = normToCss(s.geo.c);
ctx.beginPath();
ctx.moveTo(a.x, a.y);
// Implements the next part of the estimator workflow.
ctx.lineTo(b.x, b.y);
ctx.lineTo(c.x, c.y);
ctx.closePath();
ctx.fill();
// Implements the next part of the estimator workflow.
ctx.stroke();
ctx.fillStyle = '#0f172a';
ctx.font = '12px system-ui';
// Implements the next part of the estimator workflow.
ctx.fillText(s.label || '', a.x + 6, a.y + 14);
}
}
// Draws the in-progress preview shape while the user is drawing.
// active preview shape while drawing
ctx.lineWidth = 2;
ctx.strokeStyle = '#2563eb'; // blue-ish
ctx.fillStyle = 'rgba(37,99,235,0.08)';
// Implements the next part of the estimator workflow.
if (mode === 'rect' && isDragging && dragStart && dragEnd) {
const x = Math.min(dragStart.x, dragEnd.x);
const y = Math.min(dragStart.y, dragEnd.y);
// Implements the next part of the estimator workflow.
const rw = Math.abs(dragEnd.x - dragStart.x);
const rh = Math.abs(dragEnd.y - dragStart.y);
ctx.fillRect(x, y, rw, rh);
ctx.strokeRect(x, y, rw, rh);
// Implements the next part of the estimator workflow.
}
if (mode === 'circle' && isDragging && circleCenter && circleEdge) {
const rr = dist(circleCenter, circleEdge);
// Implements the next part of the estimator workflow.
ctx.beginPath();
ctx.arc(circleCenter.x, circleCenter.y, rr, 0, Math.PI * 2);
ctx.closePath();
ctx.fill();
// Implements the next part of the estimator workflow.
ctx.stroke();
}
if (mode === 'tri' && triPoints.length) {
// Section header / documentation comment.
// draw points
ctx.fillStyle = '#2563eb';
for (const p of triPoints) {
ctx.beginPath();
// Implements the next part of the estimator workflow.
ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
ctx.fill();
}
// draw lines if 2+ points
// Implements the next part of the estimator workflow.
if (triPoints.length >= 2) {
ctx.strokeStyle = '#2563eb';
ctx.beginPath();
ctx.moveTo(triPoints[0].x, triPoints[0].y);
// Implements the next part of the estimator workflow.
ctx.lineTo(triPoints[1].x, triPoints[1].y);
if (triPoints.length === 3) {
ctx.lineTo(triPoints[2].x, triPoints[2].y);
ctx.closePath();
// Implements the next part of the estimator workflow.
}
ctx.stroke();
}
}
// Re-renders the full canvas (background + blueprint + shapes).
}
function render() {
clearCanvas();
// Implements the next part of the estimator workflow.
drawBlueprint();
drawSelections();
}
// Recalculates total square footage and updates the sidebar list.
// ----- Totals UI -----
function recomputeTotals() {
const total = selections.reduce((sum, s) => sum + (Number(s.areaSqFt) || 0), 0);
if (totalOut) totalOut.textContent = fmt2(total);
// Implements the next part of the estimator workflow.
if (countOut) countOut.textContent = String(selections.length);
if (!listOut) return;
// Implements the next part of the estimator workflow.
listOut.innerHTML = '';
selections.forEach((s, i) => {
const card = document.createElement('div');
card.className = 'selCard';
// Implements the next part of the estimator workflow.
const title = document.createElement('div');
title.style.fontWeight = '700';
title.textContent = `${s.label || `Area ${i + 1}`} (${s.type}) — ${fmt2(s.areaSqFt)} sq ft`;
// Implements the next part of the estimator workflow.
const meta = document.createElement('div');
meta.style.opacity = '0.8';
meta.style.fontSize = '13px';
// Implements the next part of the estimator workflow.
if (s.type === 'rect') {
meta.textContent = `Width: ${fmt2(s.real.widthFt)} ft • Height: ${fmt2(s.real.heightFt)} ft`;
} else if (s.type === 'circle') {
// Implements the next part of the estimator workflow.
meta.textContent = `Radius: ${fmt2(s.real.radiusFt)} ft`;
} else if (s.type === 'tri') {
meta.textContent = `Base: ${fmt2(s.real.baseFt)} ft • Height: ${fmt2(s.real.heightFt)} ft`;
}
// Implements the next part of the estimator workflow.
card.appendChild(title);
card.appendChild(meta);
// Section header / documentation comment.
// tiny delete button (optional)
const del = document.createElement('button');
del.textContent = 'Remove';
del.style.marginTop = '8px';
// Implements the next part of the estimator workflow.
del.addEventListener('click', () => {
selections.splice(i, 1);
recomputeTotals();
render();
// Implements the next part of the estimator workflow.
setStatus('Removed selection.');
});
card.appendChild(del);
// Section header / documentation comment.
// light styling without relying on extra CSS
card.style.border = '1px solid #e5e5e5';
card.style.borderRadius = '10px';
// Implements the next part of the estimator workflow.
card.style.padding = '10px';
listOut.appendChild(card);
});
// Exposes a summary of totals/selections so the chat widget can use it.
}
// expose snapshot for chatbot.js
window.getEstimatorSnapshot = function getEstimatorSnapshot() {
// Implements the next part of the estimator workflow.
const total = selections.reduce((sum, s) => sum + (Number(s.areaSqFt) || 0), 0);
return {
totalSqFt: Number(fmt2(total)),
selectionsCount: selections.length,
// Implements the next part of the estimator workflow.
selections: selections.map((s) => ({
label: s.label,
type: s.type,
areaSqFt: Number(fmt2(s.areaSqFt)),
// Implements the next part of the estimator workflow.
real: s.real
}))
};
};
// Prompts the user for an area label (e.g., Kitchen).
// ----- Save selection after user inputs real dimensions -----
function promptLabel(defaultLabel) {
const label = (window.prompt('Label this area (ex: Kitchen):', defaultLabel || '') || '').trim();
// Prompts the user for a positive number (feet) and validates it.
return label || defaultLabel || 'Area';
}
function promptNumber(msg, defaultVal) {
// Implements the next part of the estimator workflow.
const raw = (window.prompt(msg, String(defaultVal ?? '')) || '').trim();
const n = Number(raw);
if (!Number.isFinite(n) || n <= 0) return null;
return n;
// Saves a rectangle selection after asking for real width/height in feet.
}
function saveRect(p1, p2) {
// ask for real measurements in feet
// Implements the next part of the estimator workflow.
const label = promptLabel(`Area ${selections.length + 1}`);
const widthFt = promptNumber('Rectangle REAL width (ft):', 10);
if (widthFt == null) return;
// Implements the next part of the estimator workflow.
const heightFt = promptNumber('Rectangle REAL height (ft):', 12);
if (heightFt == null) return;
// Implements the next part of the estimator workflow.
const areaSqFt = widthFt * heightFt;
selections.push({
type: 'rect',
// Converts CSS pixel coordinates to normalized (0–1) coordinates.
label,
geo: { p1: cssToNorm(p1), p2: cssToNorm(p2) },
real: { widthFt, heightFt },
areaSqFt
// Implements the next part of the estimator workflow.
});
setStatus(`Saved "${label}" (${fmt2(areaSqFt)} sq ft). Rectangle mode: drag to select.`);
recomputeTotals();
// Saves a circle selection after asking for real radius in feet.
render();
}
function saveCircle(center, edge) {
// Implements the next part of the estimator workflow.
const label = promptLabel(`Area ${selections.length + 1}`);
const radiusFt = promptNumber('Circle REAL radius (ft):', 6);
if (radiusFt == null) return;
// Implements the next part of the estimator workflow.
const areaSqFt = Math.PI * radiusFt * radiusFt;
// radius normalized relative to min(canvasW, canvasH)
// Implements the next part of the estimator workflow.
const rCss = dist(center, edge);
const rNorm = (() => {
const rect = canvas.getBoundingClientRect();
const minDim = Math.max(1, Math.min(rect.width, rect.height));
// Implements the next part of the estimator workflow.
return rCss / minDim;
})();
selections.push({
// Converts CSS pixel coordinates to normalized (0–1) coordinates.
type: 'circle',
label,
geo: { c: cssToNorm(center), r: rNorm },
real: { radiusFt },
// Implements the next part of the estimator workflow.
areaSqFt
});
setStatus(`Saved "${label}" (${fmt2(areaSqFt)} sq ft). Circle mode: drag radius.`);
// Implements the next part of the estimator workflow.
recomputeTotals();
render();
}
// Saves a triangle selection after asking for real base/height in feet.
function saveTriangle(a, b, c) {
const label = promptLabel(`Area ${selections.length + 1}`);
const baseFt = promptNumber('Triangle REAL base (ft):', 10);
// Implements the next part of the estimator workflow.
if (baseFt == null) return;
const heightFt = promptNumber('Triangle REAL height (ft):', 8);
if (heightFt == null) return;
// Implements the next part of the estimator workflow.
const areaSqFt = 0.5 * baseFt * heightFt;
selections.push({
// Converts CSS pixel coordinates to normalized (0–1) coordinates.
type: 'tri',
label,
geo: { a: cssToNorm(a), b: cssToNorm(b), c: cssToNorm(c) },
real: { baseFt, heightFt },
// Implements the next part of the estimator workflow.
areaSqFt
});
setStatus(`Saved "${label}" (${fmt2(areaSqFt)} sq ft). Triangle mode: click 3 points.`);
// Implements the next part of the estimator workflow.
recomputeTotals();
render();
}
// Section header / documentation comment.
// ----- Events -----
if (shapeModeEl) {
shapeModeEl.addEventListener('change', () => {
mode = shapeModeEl.value;
// Implements the next part of the estimator workflow.
isDragging = false;
dragStart = dragEnd = null;
circleCenter = circleEdge = null;
triPoints = [];
// Implements the next part of the estimator workflow.
setStatus(
mode === 'rect'
? 'Rectangle mode: drag to select.'
: mode === 'circle'
// Implements the next part of the estimator workflow.
? 'Circle mode: click+drag to set radius.'
: 'Triangle mode: click 3 corners.'
);
render();
// Implements the next part of the estimator workflow.
});
}
if (undoBtn) {
// Implements the next part of the estimator workflow.
undoBtn.addEventListener('click', () => {
if (!selections.length) return;
selections.pop();
recomputeTotals();
// Implements the next part of the estimator workflow.
render();
setStatus('Undid last selection.');
});
}
// Implements the next part of the estimator workflow.
if (clearBtn) {
clearBtn.addEventListener('click', () => {
selections = [];
// Implements the next part of the estimator workflow.
recomputeTotals();
render();
setStatus('Cleared all selections.');
});
// Implements the next part of the estimator workflow.
}
if (blueprintInput) {
blueprintInput.addEventListener('change', () => {
// Implements the next part of the estimator workflow.
const file = blueprintInput.files && blueprintInput.files[0];
if (!file) return;
if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
// Implements the next part of the estimator workflow.
alert('Please upload a PNG or JPG image.');
blueprintInput.value = '';
return;
}
// Loads the selected image file and triggers a redraw when it finishes loading.
const url = URL.createObjectURL(file);
const img = new Image();
img.onload = () => {
// Resizes the canvas to fit its container and handles high-DPI screens.
blueprintImg = img;
setStatus('Image loaded. Start selecting an area.');
fitCanvasToWrap();
render();
// Implements the next part of the estimator workflow.
};
img.onerror = () => {
alert('Could not load that image.');
};
// Implements the next part of the estimator workflow.
img.src = url;
});
}
// Section header / documentation comment.
// Canvas pointer events
canvas.addEventListener('mousedown', (e) => {
const p = getCanvasCssPointFromEvent(e);
// Implements the next part of the estimator workflow.
if (mode === 'rect') {
isDragging = true;
dragStart = p;
dragEnd = p;
// Implements the next part of the estimator workflow.
render();
}
if (mode === 'circle') {
// Implements the next part of the estimator workflow.
isDragging = true;
circleCenter = p;
circleEdge = p;
render();
// Implements the next part of the estimator workflow.
}
});
canvas.addEventListener('mousemove', (e) => {
// Implements the next part of the estimator workflow.
if (!isDragging) return;
const p = getCanvasCssPointFromEvent(e);
if (mode === 'rect' && dragStart) {
// Implements the next part of the estimator workflow.
dragEnd = p;
render();
}
// Implements the next part of the estimator workflow.
if (mode === 'circle' && circleCenter) {
circleEdge = p;
render();
}
// Implements the next part of the estimator workflow.
});
canvas.addEventListener('mouseup', () => {
if (!isDragging) return;
// Implements the next part of the estimator workflow.
isDragging = false;
if (mode === 'rect' && dragStart && dragEnd) {
// ignore tiny drags
// Implements the next part of the estimator workflow.
if (dist(dragStart, dragEnd) < 6) {
setStatus('Drag a bigger rectangle.');
} else {
saveRect(dragStart, dragEnd);
// Implements the next part of the estimator workflow.
}
}
if (mode === 'circle' && circleCenter && circleEdge) {
// Implements the next part of the estimator workflow.
if (dist(circleCenter, circleEdge) < 6) {
setStatus('Drag a bigger circle radius.');
} else {
saveCircle(circleCenter, circleEdge);
// Implements the next part of the estimator workflow.
}
}
dragStart = dragEnd = null;
// Implements the next part of the estimator workflow.
circleCenter = circleEdge = null;
render();
});
// Section header / documentation comment.
// Triangle: click 3 points (no dragging)
canvas.addEventListener('click', (e) => {
if (mode !== 'tri') return;
const p = getCanvasCssPointFromEvent(e);
// Implements the next part of the estimator workflow.
triPoints.push(p);
if (triPoints.length < 3) {
setStatus(`Triangle: click ${3 - triPoints.length} more point(s).`);
// Implements the next part of the estimator workflow.
render();
return;
}
// Section header / documentation comment.
// got 3 points
const [a, b, c] = triPoints;
triPoints = [];
saveTriangle(a, b, c);
// Initializes the UI state and renders the empty canvas.
});
// Initial UI
setStatus('Upload an image to begin.');
// Resizes the canvas to fit its container and handles high-DPI screens.
recomputeTotals();
fitCanvasToWrap();
render();
