// backend/routes/cleanupContext.js
import express from "express";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

/**
 * ✅ Cleanup Route
 * Removes chat contexts older than 30 days
 * (You can later schedule this with Render cron jobs or manual API calls)
 */
router.delete("/", async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { error } = await supabase
      .from("user_chat_context")
      .delete()
      .lt("updated_at", cutoff.toISOString());

    if (error) throw error;

    res.json({
      success: true,
      message: `🧹 Cleanup complete! Removed chat contexts older than ${cutoff.toDateString()}.`,
    });
  } catch (err) {
    console.error("[CleanupContext] Error:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to clean up old chat contexts.",
    });
  }
});

export default router;
