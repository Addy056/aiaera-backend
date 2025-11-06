// backend/routes/uploads.js
import express from "express";
import {
  uploadMiddleware,
  uploadFile,
  listFiles,
  getDownloadUrl,
  deleteFile,
} from "../controllers/uploadsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// ----------------------
// All routes require authentication
// ----------------------
router.use(requireAuth);

// ----------------------
// Upload a single file
// Field name for file: 'file'
// Supported types: PDF, CSV, XLS/XLSX, TXT
// ----------------------
router.post("/", uploadMiddleware, async (req, res) => {
  try {
    await uploadFile(req, res);
  } catch (err) {
    console.error("[Uploads] Upload error:", err);
    res.status(500).json({ success: false, message: "File upload failed", error: err.message });
  }
});

// ----------------------
// List all files uploaded by authenticated user
// ----------------------
router.get("/", async (req, res) => {
  try {
    const files = await listFiles(req, res);
    res.status(200).json({ success: true, files });
  } catch (err) {
    console.error("[Uploads] List files error:", err);
    res.status(500).json({ success: false, message: "Failed to list files", error: err.message });
  }
});

// ----------------------
// Generate a temporary signed download URL for a file
// URL valid for 1 hour
// ----------------------
router.get("/:id/download", async (req, res) => {
  try {
    const url = await getDownloadUrl(req, res);
    res.status(200).json({ success: true, url });
  } catch (err) {
    console.error("[Uploads] Get download URL error:", err);
    res.status(500).json({ success: false, message: "Failed to generate download URL", error: err.message });
  }
});

// ----------------------
// Delete a file and its metadata
// ----------------------
router.delete("/:id", async (req, res) => {
  try {
    await deleteFile(req, res);
    res.status(200).json({ success: true, message: "File deleted successfully" });
  } catch (err) {
    console.error("[Uploads] Delete file error:", err);
    res.status(500).json({ success: false, message: "Failed to delete file", error: err.message });
  }
});

export default router;
