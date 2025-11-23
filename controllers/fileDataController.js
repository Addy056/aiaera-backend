// backend/controllers/fileDataController.js
import supabase from "../config/supabaseClient.js";
import { parsePDFBuffer } from "../utils/pdfUtils.js";
import { parseExcelBuffer } from "../utils/excelUtils.js";
import csvParser from "csv-parser";
import { Readable } from "stream";

/* ----------------------------------------
   Helper: Parse CSV Buffer
----------------------------------------- */
async function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const rows = [];
    Readable.from(buffer)
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(JSON.stringify(rows)))
      .on("error", (err) => reject(err));
  });
}

/* ----------------------------------------
   Helper: Truncate text
----------------------------------------- */
const truncate = (text, limit = 8000) =>
  text.length > limit ? text.substring(0, limit) : text;

/* ----------------------------------------
   Extract + Store File Content
----------------------------------------- */
export const extractAndSaveFileContent = async (req, res) => {
  try {
    const user = req.user;
    const { file_id } = req.body;

    if (!file_id) {
      return res.status(400).json({ error: "file_id is required" });
    }

    /* ----------------------------------------
       1️⃣ Fetch File Metadata
    ----------------------------------------- */
    const { data: fileRow, error: fetchErr } = await supabase
      .from("chatbot_files")
      .select("*")
      .eq("id", file_id)
      .eq("user_id", user.id)
      .single();

    if (fetchErr || !fileRow) {
      return res.status(404).json({ error: "File not found" });
    }

    /* ----------------------------------------
       2️⃣ Download File From Storage
    ----------------------------------------- */
    let arrayBuffer;

    // Try storage first
    const { data: fileBlob, error: downloadError } =
      await supabase.storage.from(fileRow.bucket).download(fileRow.path);

    if (fileBlob) {
      arrayBuffer = await fileBlob.arrayBuffer();
    } else {
      // Fallback: use publicUrl if storage download fails
      const resp = await fetch(fileRow.public_url || fileRow.publicUrl);
      if (!resp.ok) {
        console.error("❌ Public URL download failed");
        return res.status(500).json({ error: "Failed to read file" });
      }
      arrayBuffer = await resp.arrayBuffer();
    }

    const buffer = Buffer.from(arrayBuffer);

    /* ----------------------------------------
       3️⃣ Extract Text Based on MIME Type
    ----------------------------------------- */
    const mime = fileRow.mime_type;
    let extractedText = "";
    let type = "";

    try {
      if (mime === "application/pdf") {
        extractedText = await parsePDFBuffer(buffer);
        type = "pdf";
      } else if (mime === "text/csv" || mime.includes("csv")) {
        extractedText = await parseCSV(buffer);
        type = "csv";
      } else if (
        mime.includes("excel") ||
        mime ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        extractedText = await parseExcelBuffer(buffer);
        type = "excel";
      } else if (
        mime.includes("text/plain") ||
        mime.includes("text/markdown") ||
        mime.includes("javascript") ||
        mime.includes("json")
      ) {
        extractedText = buffer.toString("utf-8");
        type = "text";
      } else {
        return res.status(400).json({
          error: `Unsupported file type: ${mime}`,
        });
      }
    } catch (parseErr) {
      console.error("❌ Parse error:", parseErr);
      return res.status(500).json({ error: "Content extraction failed" });
    }

    if (!extractedText) {
      return res
        .status(500)
        .json({ error: "No content extracted from file" });
    }

    extractedText = truncate(extractedText);

    /* ----------------------------------------
       4️⃣ Save Extracted Content
       Use upsert: avoids duplicates
    ----------------------------------------- */
    const payload = {
      file_id: fileRow.id,
      user_id: user.id,
      chatbot_id: fileRow.chatbot_id || null,
      type,
      content: { text: extractedText },
      updated_at: new Date(),
    };

    const { data: saved, error: saveErr } = await supabase
      .from("chatbot_file_data")
      .upsert(payload, { onConflict: "file_id" })
      .select()
      .single();

    if (saveErr) {
      console.error("❌ Save content error:", saveErr);
      return res.status(500).json({
        error: "Failed to save extracted content",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Content extracted & saved successfully.",
      content: saved,
    });
  } catch (err) {
    console.error("🔥 Unexpected file extraction error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
