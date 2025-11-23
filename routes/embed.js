// backend/routes/embed.js
import express from "express";
import { generateEmbedScript } from "../controllers/embedController.js";

const router = express.Router();

// Serve JS file dynamically
router.get("/:id.js", async (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  return generateEmbedScript(req, res);
});

export default router;
