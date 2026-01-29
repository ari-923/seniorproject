const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const statusEl = document.getElementById("status");
const scaleOut = document.getElementById("scaleOut");
const ptsOut = document.getElementById("ptsOut");
const areaOut = document.getElementById("areaOut");

const btnSetScale = document.getElementById("btnSetScale");
const btnDraw = document.getElementById("btnDraw");
const btnFinish = document.getElementById("btnFinish");
const btnClearPoly = document.getElementById("btnClearPoly");
const btnResetAll = document.getElementById("btnResetAll");

const realDistanceInput = document.getElementById("realDistance");
const unitSelect = document.getElementById("unit");

let img = new Image();
let imgLoaded = false;

// Modes: "none" | "scale" | "draw"
let mode = "none";

// Scale calibration
let scaleClicks = []; // 2 points
let unitsPerPixel = null; // selected unit per pixel

// Polygon drawing
let polyPoints = []; // array of {x,y} in canvas coords
let finishedPolygons = []; // store multiple polygons if desired

function setStatus(msg) {
  statusEl.textContent = "Status: " + msg;
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function draw() {
  clearCanvas();
  if (imgLoaded) {
    // Fit image inside canvas while preserving aspect ratio
    // We'll draw image starting at 0,0 with scale that fits.
    // For simplicity, we assume the canvas is large enough; we fit exactly.
    const fit = getFitRect(img.width, img.height, canvas.width, canvas.height);
    ctx.drawImage(img, fit.x, fit.y, fit.w, fit.h);

    // Draw overlays in fitted coordinate system
    // We'll convert all stored points from "canvas coords" directly
    // (because user clicks are in canvas coords).
  }

  // Draw scale line points
  if (scaleClicks.length > 0) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "red";
    ctx.fillStyle = "red";
    for (const p of scaleClicks) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (scaleClicks.length === 2) {
      ctx.beginPath();
      ctx.moveTo(scaleClicks[0].x, scaleClicks[0].y);
      ctx.lineTo(scaleClicks[1].x, scaleClicks[1].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw current polygon points
  if (polyPoints.length > 0) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "blue";
    ctx.fillStyle = "blue";

    // points
    for (const p of polyPoints) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // lines
    ctx.beginPath();
    ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
    for (let i = 1; i < polyPoints.length; i++) {
      ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Draw finished polygons
  if (finishedPolygons.length > 0) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "green";
    for (const poly of finishedPolygons) {
      if (poly.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  ptsOut.textContent = String(polyPoints.length);
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

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Shoelace formula for polygon area (in pixel^2)
function polygonAreaPx2(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    sum += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(sum) / 2;
}

function updateScaleUI() {
  if (!unitsPerPixel) {
    scaleOut.textContent = "Not set";
    return;
  }
  scaleOut.textContent = `${unitsPerPixel.toFixed(6)} ${unitSelect.value}/px`;
}

function updateAreaUI() {
  if (!unitsPerPixel) {
    areaOut.textContent = "Set scale first";
    return;
  }
  if (finishedPolygons.length === 0) {
    areaOut.textContent = "Draw + finish a polygon";
    return;
  }

  // sum areas of finished polygons
  let totalUnits2 = 0;
  for (const poly of finishedPolygons) {
    if (poly.length < 3) continue;
    const aPx2 = polygonAreaPx2(poly);
    totalUnits2 += aPx2 * (unitsPerPixel ** 2);
  }

  // If unit is feet, show sqft. Otherwise show unit^2
  const unit = unitSelect.value;
  let label = `${unit}²`;
  if (unit === "ft") label = "sq ft";

  areaOut.textContent = `${totalUnits2.toFixed(2)} ${label}`;
}

fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  img = new Image();
  img.onload = () => {
    imgLoaded = true;
    setStatus("Image loaded. Click 'Set Scale' to calibrate.");
    resetOverlaysOnly();
    draw();
  };
  img.src = url;
});

function resetOverlaysOnly() {
  mode = "none";
  scaleClicks = [];
  unitsPerPixel = null;
  polyPoints = [];
  finishedPolygons = [];
  updateScaleUI();
  updateAreaUI();
}

btnSetScale.addEventListener("click", () => {
  if (!imgLoaded) return setStatus("Upload an image first.");
  mode = "scale";
  scaleClicks = [];
  setStatus("Scale mode: Click TWO points that match the real distance you enter.");
  draw();
});

btnDraw.addEventListener("click", () => {
  if (!imgLoaded) return setStatus("Upload an image first.");
  if (!unitsPerPixel) return setStatus("Set scale first (click Set Scale).");
  mode = "draw";
  setStatus("Draw mode: Click around the room perimeter. Then click 'Finish Polygon'.");
  draw();
});

btnFinish.addEventListener("click", () => {
  if (polyPoints.length < 3) return setStatus("Need at least 3 points to finish a polygon.");
  finishedPolygons.push([...polyPoints]);
  polyPoints = [];
  setStatus("Polygon saved. Draw another area or view total area.");
  draw();
  updateAreaUI();
});

btnClearPoly.addEventListener("click", () => {
  polyPoints = [];
  setStatus("Cleared current polygon.");
  draw();
});

btnResetAll.addEventListener("click", () => {
  imgLoaded = false;
  img = new Image();
  fileInput.value = "";
  resetOverlaysOnly();
  clearCanvas();
  setStatus("Reset complete. Upload an image to begin.");
});

canvas.addEventListener("click", (e) => {
  if (!imgLoaded) return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  const p = { x, y };

  if (mode === "scale") {
    scaleClicks.push(p);
    if (scaleClicks.length === 2) {
      const pxDist = distance(scaleClicks[0], scaleClicks[1]);
      const realDist = Number(realDistanceInput.value);
      if (!realDist || realDist <= 0) {
        setStatus("Enter a valid real distance.");
        scaleClicks = [];
        draw();
        return;
      }
      unitsPerPixel = realDist / pxDist;
      updateScaleUI();
      setStatus("Scale set! Now click 'Draw Area' and trace the room.");
      mode = "none";
      updateAreaUI();
    }
    draw();
  } else if (mode === "draw") {
    polyPoints.push(p);
    draw();
  }
});

// If user changes units after scale is set, we should clear scale to avoid wrong conversions.
unitSelect.addEventListener("change", () => {
  // simplest safe behavior: force re-scale
  if (unitsPerPixel) {
    unitsPerPixel = null;
    scaleClicks = [];
    setStatus("Units changed — please set scale again.");
    updateScaleUI();
    updateAreaUI();
    draw();
  }
});

realDistanceInput.addEventListener("input", () => {
  // no auto-change; only used when setting scale
});
