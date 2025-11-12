// backend/routes/embed.js
import express from "express";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

// ----------------------
// Async wrapper
// ----------------------
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ----------------------
// Escape HTML safely
// ----------------------
const escapeHTML = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// ----------------------
// Embed JS route (✅ Fixed)
// ----------------------
router.get(
  "/:id.js",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    res.removeHeader("X-Frame-Options");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.type("application/javascript");

    // ✅ Get base frontend URL (your app domain)
    const frontendBaseUrl =
      process.env.APP_BASE_URL || "https://aiaera.vercel.app"; // change this to your frontend domain

    // ✅ Get chatbot data (optional - to validate ID)
    const { data: chatbot, error } = await supabase
      .from("chatbots")
      .select("id")
      .eq("id", id)
      .single();

    if (error || !chatbot) {
      return res.status(404).send(`console.error('Chatbot not found');`);
    }

    // ✅ Generate embeddable JavaScript
    const js = `
(function() {
  const iframe = document.createElement('iframe');
  iframe.src = '${frontendBaseUrl}/public-chatbot/${id}';
  iframe.style.position = 'fixed';
  iframe.style.bottom = '20px';
  iframe.style.right = '20px';
  iframe.style.width = '400px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
  iframe.style.zIndex = '999999';
  iframe.allow = 'clipboard-write; microphone;';
  document.body.appendChild(iframe);
})();
`;

    res.send(js);
  })
);

export default router;
