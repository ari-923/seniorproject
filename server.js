import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";

const app = express();
app.use(cors());

// Multer (in-memory upload)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/", (_req, res) => res.send("OK"));

/**
 * POST /api/flooring-estimate
 * FormData:
 * - file: blueprint image/pdf
 * - wastePct: number
 * - sqftPerBox: number
 */
app.post("/api/flooring-estimate", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("Missing file");
    const wastePct = Number(req.body.wastePct || 0);
    const sqftPerBox = Number(req.body.sqftPerBox || 0);

    // Convert upload to data URL for image inputs (best for JPG/PNG)
    // Note: PDFs can also work, but blueprint PDFs vary a lot. Start with images first.
    const mime = req.file.mimetype;
    const b64 = req.file.buffer.toString("base64");
    const dataUrl = `data:${mime};base64,${b64}`;

    // Ask for strict JSON output (model should return only JSON)
    const prompt = `
You are a construction takeoff assistant. From the uploaded blueprint, estimate the TOTAL FLOORING AREA (sq ft).
Rules:
- Return ONLY valid JSON matching the schema.
- If scale is ambiguous, provide best estimate AND include a warning note.
- Prefer labeled room dimensions if visible (e.g., "13' x 24'").
- If you can't confidently compute, return reason in notes and set subtotal_sqft to null.

Compute:
subtotal_sqft = sum of room floor areas you can infer
waste_sqft = subtotal_sqft * (wastePct/100)
total_sqft = subtotal_sqft + waste_sqft
boxes_needed = ceil(total_sqft / sqftPerBox) if sqftPerBox>0 else null

wastePct=${wastePct}
sqftPerBox=${sqftPerBox}
`;

    // Responses API: send image as input_image (data URL) and request JSON
    // Docs cover image inputs + responses reference. :contentReference[oaicite:1]{index=1}
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: dataUrl }
          ]
        }
      ],
      text: {
        // Tell the API we want JSON text; model should comply with “ONLY JSON”
        format: { type: "json_object" }
      }
    });

    // Extract text
    const outText = response.output_text || "";
    let obj;
    try {
      obj = JSON.parse(outText);
    } catch {
      return res.status(500).json({
        error: "Model did not return valid JSON",
        raw: outText.slice(0, 4000)
      });
    }

    // Post-calc (in case the model omitted fields)
    const subtotal = (obj.subtotal_sqft == null) ? null : Number(obj.subtotal_sqft);
    const waste = (subtotal == null) ? null : subtotal * (wastePct / 100);
    const total = (subtotal == null) ? null : subtotal + waste;

    const boxes = (total != null && sqftPerBox > 0) ? Math.ceil(total / sqftPerBox) : null;

    const result = {
      subtotal_sqft: subtotal,
      waste_pct: wastePct,
      waste_sqft: waste,
      total_sqft: total,
      sqft_per_box: sqftPerBox > 0 ? sqftPerBox : null,
      boxes_needed: boxes,
      rooms: obj.rooms ?? [],
      notes: obj.notes ?? []
    };

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send(err?.message || "Server error");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on port", port));

