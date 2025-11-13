// backend/routes/embed.js
import express from "express";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const escapeHTML = (str) =>
  String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

router.get(
  "/:id.js",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    res.removeHeader("X-Frame-Options");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.type("application/javascript");

    const FRONTEND_URL =
      process.env.FRONTEND_URL?.trim() ||
      process.env.APP_BASE_URL?.trim() ||
      "https://aiaera-frontend.vercel.app";

    const base = FRONTEND_URL.replace(/\/+$/, "");

    const { data: chatbot, error } = await supabase
      .from("chatbots")
      .select("id")
      .eq("id", id)
      .single();

    if (error || !chatbot) {
      return res.status(404).send(`
        console.error("Chatbot not found: ${escapeHTML(id)}");
      `);
    }

    // FINAL UPDATED SCRIPT (button only → click to open)
    const script = `
(function() {
  if (window.AIAERA_WIDGET_LOADED) return;
  window.AIAERA_WIDGET_LOADED = true;

  // Create floating button
  const btn = document.createElement("div");
  btn.innerHTML = "💬";
  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.width = "60px";
  btn.style.height = "60px";
  btn.style.background = "#7f5af0";
  btn.style.color = "#fff";
  btn.style.fontSize = "30px";
  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.borderRadius = "50%";
  btn.style.cursor = "pointer";
  btn.style.zIndex = "999999999";
  btn.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
  btn.style.transition = "transform 0.2s ease, box-shadow 0.2s ease";
  btn.style.userSelect = "none";
  btn.onmouseenter = () => btn.style.transform = "scale(1.1)";
  btn.onmouseleave = () => btn.style.transform = "scale(1)";
  document.body.appendChild(btn);

  // Create iframe (hidden initially)
  const iframe = document.createElement("iframe");
  iframe.src = "${base}/public-chatbot/${id}";
  iframe.style.position = "fixed";
  iframe.style.bottom = "90px";
  iframe.style.right = "20px";
  iframe.style.width = "400px";
  iframe.style.height = "600px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "16px";
  iframe.style.background = "transparent";
  iframe.style.zIndex = "999999998";
  iframe.style.display = "none";
  iframe.style.opacity = "0";
  iframe.style.transition = "opacity 0.25s ease";
  iframe.allow = "clipboard-write; microphone;";
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-modals allow-forms");
  document.body.appendChild(iframe);

  // Click-to-open behavior (No auto open)
  let open = false;
  btn.addEventListener("click", () => {
    open = !open;

    if (open) {
      iframe.style.display = "block";
      setTimeout(() => iframe.style.opacity = "1", 20);
      btn.innerHTML = "✖";
      btn.style.background = "#ff4d4d";
    } else {
      iframe.style.opacity = "0";
      setTimeout(() => (iframe.style.display = "none"), 250);
      btn.innerHTML = "💬";
      btn.style.background = "#7f5af0";
    }
  });
})();
`;

    res.send(script);
  })
);

export default router;
