// backend/routes/fileDataRoutes.js
import express from "express";
import { extractAndSaveFileContent } from "../controllers/fileDataController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes protected
router.use(requireAuth);

/**
 * POST /api/file-data/extract
 * Extract content from uploaded file and save to Supabase
 * Body: { file_id: string }
 */
router.post("/extract", extractAndSaveFileContent);

export default router;
