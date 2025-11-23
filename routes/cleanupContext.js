// backend/routes/cleanupContext.js
import express from "express";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

/**
 * 🧹 Cleanup Route
 * Deletes old handled messages (older than 30 days)
 * Prevents DB from growing infinitely
 */
router.delete("/", async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { error, count } = await supabase
      .from("messages_handled")
      .delete({ count: "exact" })
      .lt("created_at", cutoff.toISOString());

    if (error) throw error;

    return res.json({
      success: true,
      removed: count || 0,
      message: `🧹 Cleanup complete! Removed ${count || 0} old handled messages older than ${cutoff.toDateString()}.`,
    });
  } catch (err) {
    console.error("[CleanupContext] Error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to clean up old data.",
    });
  }
});

export default router;
