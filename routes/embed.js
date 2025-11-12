// backend/routes/embed.js
import express from "express";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

// Async wrapper utility
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// HTML escape helper (safe logging)
const escapeHTML = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// ---------------------------------------------------------
// ✅ Main embed route — works with Vercel frontend + toggle UI
// ---------------------------------------------------------
router.get(
  "/:id.js",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Security & frame headers
    res.removeHeader("X-Frame-Options");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.type("application/javascript");

    // ✅ Auto-detect your frontend base URL
    const frontendBaseUrl =
      process.env.FRONTEND_URL?.trim() ||
      process.env.APP_BASE_URL?.trim() ||
      "https://aiaera-frontend.vercel.app"; // fallback

    // ✅ Validate chatbot existence
    const { data: chatbot, error } = await supabase
      .from("chatbots")
      .select("id")
      .eq("id", id)
      .single();

    if (error || !chatbot) {
      return res
        .status(404)
        .send(`console.error("Chatbot not found for ID: ${escapeHTML(id)}");`);
    }

    // ✅ Embeddable JS with toggle button
    const js = `
(function() {
  if (window.AIAERA_WIDGET_LOADED) return;
  window.AIAERA_WIDGET_LOADED = true;

  // Create chat button
  const button = document.createElement('div');
  button.innerHTML = '💬 Chat';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.background = 'linear-gradient(135deg, #7f5af0, #9a6ff9)';
  button.style.color = 'white';
  button.style.borderRadius = '50%';
  button.style.width = '60px';
  button.style.height = '60px';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.cursor = 'pointer';
  button.style.fontSize = '24px';
  button.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
  button.style.zIndex = '999999';
  button.style.transition = 'transform 0.2s ease';
  button.onmouseenter = () => button.style.transform = 'scale(1.1)';
  button.onmouseleave = () => button.style.transform = 'scale(1)';
  document.body.appendChild(button);

  // Create iframe (hidden by default)
  const iframe = document.createElement('iframe');
  iframe.src = '${frontendBaseUrl}/public-chatbot/${id}';
  iframe.style.position = 'fixed';
  iframe.style.bottom = '90px';
  iframe.style.right = '20px';
  iframe.style.width = '400px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
  iframe.style.zIndex = '999998';
  iframe.style.display = 'none';
  iframe.allow = 'clipboard-write; microphone;';
  document.body.appendChild(iframe);

  // Toggle open/close
  let open = false;
  button.addEventListener('click', () => {
    open = !open;
    iframe.style.display = open ? 'block' : 'none';
    button.innerHTML = open ? '✖' : '💬';
  });
})();
`;

    res.send(js);
  })
);

export default router;
