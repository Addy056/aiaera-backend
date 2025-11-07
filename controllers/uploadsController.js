// backend/controllers/uploadsController.js
import multer from "multer";
import crypto from "crypto";
import supabase from "../config/supabaseClient.js";
import { parsePDFBuffer } from "../utils/pdfUtils.js";
import { parseExcelBuffer } from "../utils/excelUtils.js";

// ----------------------
// Multer config (memory storage, 10MB max, restrict file types)
// ----------------------
const allowedTypes = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type. Allowed: PDF, CSV, XLS/XLSX, TXT"));
  },
});

export const uploadMiddleware = upload.single("file");

// ----------------------
// Upload a file → Supabase + extract content
// ----------------------
export const uploadFile = async (req, res) => {
  try {
    // ✅ Determine user
    const userId = req.user?.id || req.body.userId;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { originalname, buffer, mimetype, size } = req.file;
    const chatbot_id = req.body.chatbot_id || null;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "chatbot-files";

    // ✅ Generate unique filename
    const random = crypto.randomBytes(8).toString("hex");
    const fileExt = originalname.split(".").pop();
    const filename = `${Date.now()}_${random}.${fileExt}`;
    const path = `${userId}/${filename}`;

    // ✅ Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType: mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[Uploads] Storage upload error:", uploadError);
      return res.status(500).json({
        error: uploadError.message || "Storage upload failed",
      });
    }

    // ✅ Insert file metadata
    const { data: metaData, error: metaError } = await supabase
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
        },
      ])
      .select()
      .single();

    if (metaError) console.warn("[Uploads] Failed to save metadata:", metaError);

    // ✅ Extract content (PDF / CSV / Excel / TXT)
    let extractedContent = "";
    let contentType = "";

    if (mimetype === "application/pdf") {
      extractedContent = await parsePDFBuffer(buffer);
      contentType = "pdf";
    } else if (mimetype === "text/csv" || mimetype.includes("excel")) {
      extractedContent = await parseExcelBuffer(buffer);
      contentType = "spreadsheet";
    } else if (mimetype === "text/plain") {
      extractedContent = buffer.toString("utf-8");
      contentType = "text";
    }

    // ✅ Normalize extracted content
    const normalizedContent =
      extractedContent && typeof extractedContent === "object"
        ? JSON.stringify(extractedContent)
        : extractedContent;

    // ✅ Store extracted text into chatbot_file_data (JSON)
    if (metaData?.id && normalizedContent) {
      const { error: contentError } = await supabase
        .from("chatbot_file_data")
        .insert([
          {
            file_id: metaData.id,
            chatbot_id: chatbot_id || null,
            content: { text: normalizedContent },
          },
        ]);

      if (contentError)
        console.error("[Uploads] Failed to save extracted content:", contentError);
    }

    // ✅ Return response
    return res.status(201).json({
      success: true,
      message: "✅ File uploaded and processed successfully",
      storage: uploadData,
      metadata: metaData || null,
      extractedContent, // optional for preview
    });
  } catch (err) {
    console.error("[Uploads] Upload error:", err);
    return res.status(500).json({ error: "Failed to upload file" });
  }
};

// ----------------------
// List all files for user
// ----------------------
export const listFiles = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const { data, error } = await supabase
      .from("chatbot_files")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ success: true, files: data });
  } catch (err) {
    console.error("[Uploads] List files error:", err);
    res.status(500).json({ error: "Failed to list files" });
  }
};

// ----------------------
// Generate signed download URL
// ----------------------
export const getDownloadUrl = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { id } = req.params;

    const { data: fileRow, error: fetchError } = await supabase
      .from("chatbot_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !fileRow)
      return res.status(404).json({ error: "File not found" });

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(fileRow.bucket)
      .createSignedUrl(fileRow.path, 3600);

    if (signedUrlError) throw signedUrlError;
    res.json({ success: true, url: signedUrlData.signedUrl });
  } catch (err) {
    console.error("[Uploads] Get download URL error:", err);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
};

// ----------------------
// Delete a file and metadata (and extracted content)
// ----------------------
export const deleteFile = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { id } = req.params;

    const { data: fileRow, error: fetchError } = await supabase
      .from("chatbot_files")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !fileRow)
      return res.status(404).json({ error: "File not found" });

    // ✅ Remove from Supabase Storage
    const { error: removeError } = await supabase.storage
      .from(fileRow.bucket)
      .remove([fileRow.path]);

    if (removeError) {
      console.error("[Uploads] Storage remove error:", removeError);
      return res.status(500).json({ error: "Failed to delete file from storage" });
    }

    // ✅ Delete metadata
    await supabase.from("chatbot_files").delete().eq("id", id);

    // ✅ Delete related extracted content
    await supabase.from("chatbot_file_data").delete().eq("file_id", id);

    res.json({ success: true, message: "✅ File deleted successfully" });
  } catch (err) {
    console.error("[Uploads] Delete file error:", err);
    res.status(500).json({ error: "Failed to delete file" });
  }
};
