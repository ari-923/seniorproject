// CHANGE THIS to your backend URL after you deploy the server (Render/Vercel):
const API_BASE = "https://YOUR-BACKEND-URL-HERE";

const el = (id) => document.getElementById(id);

const fileInput = el("file");
const btnRun = el("btnRun");
const btnClear = el("btnClear");
const status = el("status");

const previewWrap = el("previewWrap");
const wastePctEl = el("wastePct");
const sqftPerBoxEl = el("sqftPerBox");

const kSubtotal = el("kSubtotal");
const kWaste = el("kWaste");
const kTotal = el("kTotal");
const kBoxes = el("kBoxes");
const jsonOut = el("jsonOut");
const notesEl = el("notes");

let currentFile = null;

function setStatus(msg){ status.textContent = msg; }

function clearUI(){
  previewWrap.innerHTML = `<div class="muted">Upload a file to preview.</div>`;
  kSubtotal.textContent = "—";
  kWaste.textContent = "—";
  kTotal.textContent = "—";
  kBoxes.textContent = "—";
  jsonOut.textContent = "—";
  notesEl.innerHTML = "";
  setStatus("No file uploaded.");
  btnRun.disabled = true;
  btnClear.disabled = true;
  currentFile = null;
}

clearUI();

fileInput.addEventListener("change", async () => {
  const f = fileInput.files?.[0];
  if (!f) return clearUI();
  currentFile = f;

  btnRun.disabled = false;
  btnClear.disabled = false;

  // Simple preview (images only)
  if (f.type.startsWith("image/")) {
    const url = URL.createObjectURL(f);
    previewWrap.innerHTML = `<img src="${url}" alt="Blueprint preview" />`;
  } else {
    previewWrap.innerHTML = `<div class="muted">PDF uploaded (preview not shown in this MVP).</div>`;
  }

  setStatus(`Ready: ${f.name}`);
});

btnClear.addEventListener("click", () => {
  fileInput.value = "";
  clearUI();
});

btnRun.addEventListener("click", async () => {
  if (!currentFile) return;

  setStatus("Uploading to AI…");
  btnRun.disabled = true;

  try {
    const wastePct = Number(wastePctEl.value || 0);
    const sqftPerBox = Number(sqftPerBoxEl.value || 0);

    const form = new FormData();
    form.append("file", currentFile);
    form.append("wastePct", String(wastePct));
    form.append("sqftPerBox", String(sqftPerBox));

    const res = await fetch(`${API_BASE}/api/flooring-estimate`, {
      method: "POST",
      body: form
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Server error (${res.status}): ${txt}`);
    }

    const data = await res.json();

    // KPIs
    kSubtotal.textContent = Number(data.subtotal_sqft).toFixed(2);
    kWaste.textContent = Number(data.waste_sqft).toFixed(2);
    kTotal.textContent = Number(data.total_sqft).toFixed(2);
    kBoxes.textContent = (data.boxes_needed ?? "—");

    // Raw JSON
    jsonOut.textContent = JSON.stringify(data, null, 2);

    // Notes
    notesEl.innerHTML = "";
    (data.notes || []).forEach(n => {
      const li = document.createElement("li");
      li.textContent = n;
      notesEl.appendChild(li);
    });

    setStatus("Done.");
  } catch (err) {
    setStatus(`Failed: ${err.message}`);
  } finally {
    btnRun.disabled = false;
  }
});
