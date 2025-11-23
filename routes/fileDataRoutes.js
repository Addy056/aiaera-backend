// backend/routes/fileDataRoutes.js
import express from "express";
import {
  extractAndSaveFileContent,
  listFiles,
  getDownloadUrl,
  deleteFile,
} from "../controllers/fileDataController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔒 Protect all routes with authentication
router.use(requireAuth);

/**
 * POST /api/file-data/extract
 * Extract content from uploaded file and save to Supabase
 * Body: { file_id: string }
 */
router.post("/extract", extractAndSaveFileContent);

/**
 * GET /api/file-data/list?userId=<uuid>
 * List all uploaded files for the authenticated user
 */
router.get("/list", listFiles);

/**
 * GET /api/file-data/download/:id
 * Generate signed download URL for a file
 */
router.get("/download/:id", getDownloadUrl);

/**
 * DELETE /api/file-data/:id
 * Delete file + metadata + extracted content
 */
router.delete("/:id", deleteFile);

export default router;
