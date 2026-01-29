const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const areaOut = document.getElementById("areaOut");

let img = new Image();
let imgLoaded = false;

// Drag selection
let isDragging = false;
let dragStart = null; // {x,y}
let dragEnd = null;   // {x,y}
let savedRects = [];  // store multiple rectangles if you want

function setStatus(msg) {
  statusEl.textContent = "Status: " + msg;
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getFitRect(imgW, imgH, boxW, boxH) {
  const imgRatio = imgW / imgH;
  const boxRatio = boxW / boxH;
  let w, h;
  if (imgRatio > boxRatio) {
    w = boxW;
    h = w / imgRatio;
  } else {
    h = boxH;
    w = h * imgRatio;
  }
  const x = (boxW - w) / 2;
  const y = (boxH - h) / 2;
  return { x, y, w, h };
}

function draw() {
  clearCanvas();

  if (imgLoaded) {
    const fit = getFitRect(img.width, img.height, canvas.width, canvas.height);
    ctx.drawImage(img, fit.x, fit.y, fit.w, fit.h);
  }

  // Draw saved rectangles
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "green";
  for (const r of savedRects) {
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
  ctx.restore();

  // Draw current drag rectangle
  if (dragStart && dragEnd) {
    const r = rectFromPoints(dragStart, dragEnd);
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "blue";
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }
}

function rectFromPoints(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x);
  const h = Math.abs(a.y - b.y);
  return { x, y, w, h };
}

function canvasPointFromMouse(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  img = new Image();
  img.onload = () => {
    imgLoaded = true;
    savedRects = [];
    dragStart = null;
    dragEnd = null;
    setStatus("Image loaded. Drag a rectangle over the flooring area.");
    areaOut.textContent = "—";
    draw();
  };
  img.src = url;
});

// Drag events
canvas.addEventListener("mousedown", (e) => {
  if (!imgLoaded) return;
  isDragging = true;
  dragStart = canvasPointFromMouse(e);
  dragEnd = dragStart;
  setStatus("Dragging... release to finish.");
  draw();
});

canvas.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  dragEnd = canvasPointFromMouse(e);
  draw();
});

canvas.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;

  if (!dragStart || !dragEnd) return;

  const r = rectFromPoints(dragStart, dragEnd);

  // Reject tiny rectangles
  if (r.w < 10 || r.h < 10) {
    setStatus("Rectangle too small. Drag a bigger area.");
    dragStart = null;
    dragEnd = null;
    draw();
    return;
  }

  // Ask user for real-world dimensions
  const realW = prompt("Enter REAL width of this selected area (feet):", "10");
  const realH = prompt("Enter REAL height of this selected area (feet):", "12");

  const wNum = Number(realW);
  const hNum = Number(realH);

  if (!wNum || !hNum || wNum <= 0 || hNum <= 0) {
    setStatus("Invalid dimensions. Selection not saved.");
    dragStart = null;
    dragEnd = null;
    draw();
    return;
  }

  const sqft = wNum * hNum;

  savedRects.push(r);
  areaOut.textContent = `${sqft.toFixed(2)} sq ft (last selection)`;
  setStatus("Saved. Drag another rectangle to add more areas.");

  // Clear current drag
  dragStart = null;
  dragEnd = null;
  draw();
});
