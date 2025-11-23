// backend/controllers/uploadsController.js
import multer from "multer";
import crypto from "crypto";
import supabase from "../config/supabaseClient.js";
import { parsePDFBuffer } from "../utils/pdfUtils.js";
import { parseExcelBuffer } from "../utils/excelUtils.js";

/* ------------------------------------------------------
 * 1) MULTER CONFIG – memory upload + file type control
 * ------------------------------------------------------ */
const allowedTypes = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file. Allowed: PDF, CSV, TXT, XLS, XLSX"));
  },
});

export const uploadMiddleware = upload.single("file");


/* ------------------------------------------------------
 * 2) UPLOAD FILE → Supabase Storage + Store Metadata
 * ------------------------------------------------------ */
export const uploadFile = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const chatbot_id = req.body.chatbot_id || null;

    if (!userId)
      return res.status(400).json({ success: false, error: "Missing userId" });

    if (!req.file)
      return res.status(400).json({ success: false, error: "No file uploaded" });

    const { originalname, buffer, mimetype, size } = req.file;

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "chatbot-files";

    /* -----------------------------
     * Generate Unique Filename
     * ----------------------------- */
    const ext = originalname.split(".").pop();
    const random = crypto.randomBytes(8).toString("hex");
    const filename = `${Date.now()}_${random}.${ext}`;
    const path = `${userId}/${filename}`;

    /* -----------------------------
     * Upload to Supabase Storage
     * ----------------------------- */
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Uploads] Storage upload failed:", uploadError);
      return res.status(500).json({
        success: false,
        error: "Failed to upload file to storage",
      });
    }

    /* -----------------------------
     * Insert Metadata
     * ----------------------------- */
    const { data: meta, error: metaErr } = await supabase
      .from("chatbot_files")
      .insert([
        {
          user_id: userId,
          chatbot_id,
          bucket,
          path,
          filename: originalname,
          mime_type: mimetype,
          size,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .maybeSingle();

    if (metaErr) {
      console.warn("[Uploads] Failed to insert metadata:", metaErr);
    }

    /* -----------------------------
     * Extract Content (PDF / CSV / Excel / TXT)
     * ----------------------------- */
    let extracted = "";
    let type = "";

    try {
      if (mimetype === "application/pdf") {
        extracted = await parsePDFBuffer(buffer);
        type = "pdf";
      } else if (
        mimetype === "text/csv" ||
        mimetype.includes("excel") ||
        mimetype.includes("spreadsheet")
      ) {
        extracted = await parseExcelBuffer(buffer);
        type = "spreadsheet";
      } else if (mimetype === "text/plain") {
        extracted = buffer.toString("utf-8");
        type = "text";
      }
    } catch (err) {
      console.error("[Uploads] Extraction error:", err);
    }

    const safeContent =
      extracted && typeof extracted === "object"
        ? JSON.stringify(extracted)
        : extracted || "";

    /* -----------------------------
     * Save Extracted Content
     * ----------------------------- */
    if (meta?.id && safeContent) {
      const { error: contentErr } = await supabase
        .from("chatbot_file_data")
        .insert([
          {
            file_id: meta.id,
            chatbot_id,
            content: { text: safeContent },
            type,
            created_at: new Date().toISOString(),
          },
        ]);

      if (contentErr) {
        console.error("[Uploads] Failed to save extracted content:", contentErr);
      }
    }

    /* -----------------------------
     * Response
     * ----------------------------- */
    return res.status(201).json({
      success: true,
      message: "File uploaded & processed successfully",
      metadata: meta || null,
      extracted: safeContent,
    });
  } catch (err) {
    console.error("[Uploads] Upload error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error during upload",
    });
  }
};


/* ------------------------------------------------------
 * 3) LIST FILES
 * ------------------------------------------------------ */
export const listFiles = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const { data, error } = await supabase
      .from("chatbot_files")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Uploads] List error:", error);
      return res.status(500).json({ error: "Failed to list files" });
    }

    res.json({ success: true, files: data || [] });
  } catch (err) {
    console.error("[Uploads] Unexpected list error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


/* ------------------------------------------------------
 * 4) GET DOWNLOAD URL
 * ------------------------------------------------------ */
export const getDownloadUrl = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { id } = req.params;

    const { data: file, error } = await supabase
      .from("chatbot_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !file)
      return res.status(404).json({ error: "File not found" });

    const { data: urlData, error: urlErr } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 3600);

    if (urlErr) {
      return res.status(500).json({ error: "Failed to generate URL" });
    }

    return res.json({ success: true, url: urlData.signedUrl });
  } catch (err) {
    console.error("[Uploads] Download URL error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


/* ------------------------------------------------------
 * 5) DELETE FILE (Storage + Metadata + Extracted Content)
 * ------------------------------------------------------ */
export const deleteFile = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { id } = req.params;

    const { data: file, error } = await supabase
      .from("chatbot_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !file)
      return res.status(404).json({ error: "File not found" });

    // Remove from storage
    const { error: removeErr } = await supabase.storage
      .from(file.bucket)
      .remove([file.path]);

    if (removeErr) {
      console.error("[Uploads] Storage remove error:", removeErr);
      return res.status(500).json({ error: "Failed to delete from storage" });
    }

    // Delete metadata
    await supabase.from("chatbot_files").delete().eq("id", id);
    await supabase.from("chatbot_file_data").delete().eq("file_id", id);

    return res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (err) {
    console.error("[Uploads] Delete error:", err);
    return res.status(500).json({
      error: "Failed to delete file",
    });
  }
};
