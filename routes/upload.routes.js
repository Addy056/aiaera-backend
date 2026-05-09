import express from "express";
import multer from "multer";

import { authMiddleware } from "../middleware/auth.js";

import {
  uploadTrainingFile,
} from "../controllers/upload.controller.js";

const router =
  express.Router();

/*
========================================
MULTER CONFIG
========================================
*/
const upload =
  multer({
    dest: "uploads/",
  });

/*
========================================
UPLOAD TRAINING FILE
========================================
*/
router.post(
  "/training",
  authMiddleware,
  upload.single("file"),
  uploadTrainingFile
);

export default router;