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

// ------------------------------------------------------
// All Upload Routes Require Authentication
// ------------------------------------------------------
router.use(requireAuth);

// ------------------------------------------------------
// 1) Upload File
// Field: file
// ------------------------------------------------------
router.post("/", uploadMiddleware, async (req, res, next) => {
  try {
    await uploadFile(req, res);
  } catch (err) {
    console.error("[Uploads] Upload error:", err);
    next(err);
  }
});

// ------------------------------------------------------
// 2) List Files
// (Controller already sends response → DO NOT res.json here)
// ------------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    await listFiles(req, res); // controller handles response
  } catch (err) {
    console.error("[Uploads] List files error:", err);
    next(err);
  }
});

// ------------------------------------------------------
// 3) Get Download URL
// ------------------------------------------------------
router.get("/:id/download", async (req, res, next) => {
  try {
    await getDownloadUrl(req, res); // controller handles response
  } catch (err) {
    console.error("[Uploads] Download URL error:", err);
    next(err);
  }
});

// ------------------------------------------------------
// 4) Delete File
// ------------------------------------------------------
router.delete("/:id", async (req, res, next) => {
  try {
    await deleteFile(req, res); // controller handles response
  } catch (err) {
    console.error("[Uploads] Delete file error:", err);
    next(err);
  }
});

// ------------------------------------------------------
// 5) Route-Level Fallback Error Handler
// ------------------------------------------------------
router.use((err, req, res, next) => {
  console.error("❌ Uploads Route Error:", err.stack || err.message);
  res.status(500).json({
    success: false,
    error: "Internal server error in uploads route",
    message: err.message || "Unknown error",
  });
});

export default router;
