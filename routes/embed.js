// backend/routes/embed.js
import express from "express";
import { generateEmbedScript } from "../controllers/embedController.js";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

/* --------------------------------------------------- */
/* ✅ SERVE EMBED SCRIPT (.js) */
/* --------------------------------------------------- */
router.get("/:id.js", async (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  return generateEmbedScript(req, res);
});

/* --------------------------------------------------- */
/* ✅ SERVE CHATBOT CONFIG FOR PUBLIC CHATBOT */
/* --------------------------------------------------- */
router.get("/config/:chatbotId", async (req, res) => {
  try {
    const { chatbotId } = req.params;

    const { data, error } = await supabase
      .from("chatbots")
      .select("id, name, config")
      .eq("id", chatbotId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        message: "Chatbot not found",
      });
    }

    return res.json({
      success: true,
      chatbot: data,
    });
  } catch (err) {
    console.error("Embed config error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;
