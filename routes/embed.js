import express from "express";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

/* --------------------------------------------------- */
/* ✅ SERVE EMBED SCRIPT (.js) WITH FULL CIRCLE LOGO */
/* --------------------------------------------------- */
router.get("/:id.js", async (req, res) => {
  try {
    const chatbotId = req.params.id;

    const { data: bot, error } = await supabase
      .from("chatbots")
      .select("id, name, config")
      .eq("id", chatbotId)
      .single();

    res.setHeader("Content-Type", "application/javascript");

    if (error || !bot) {
      return res.send(`console.error("❌ AIAERA: Chatbot not found");`);
    }

    let cfg = {};
    try {
      cfg =
        typeof bot.config === "string" ? JSON.parse(bot.config) : bot.config;
    } catch {
      cfg = {};
    }

    const logo =
      cfg?.logo_url ||
      "https://aiaera-frontend.vercel.app/logo.png";

    const FRONTEND_URL = process.env.FRONTEND_URL;

    return res.send(`
(function () {
  // ✅ Prevent multiple injections
  if (window.__AIAERA_WIDGET_LOADED__) return;
  window.__AIAERA_WIDGET_LOADED__ = true;

  var chatbotId = "${chatbotId}";
  var frontendUrl = "${FRONTEND_URL}";
  var logoUrl = "${logo}";
  var isOpen = false;

  // ✅ Floating Launcher Button (Full Logo Circle)
  var launcher = document.createElement("div");
  launcher.id = "aiaera-launcher";
  launcher.style.cssText = \`
    position: fixed;
    bottom: 22px;
    right: 22px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-image: url("\${logoUrl}");
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 10px 30px rgba(0,0,0,0.4), inset 0 0 0 2px rgba(255,255,255,0.15);
    z-index: 999999;
    transition: transform 0.2s ease;
  \`;

  launcher.onmouseenter = () => launcher.style.transform = "scale(1.08)";
  launcher.onmouseleave = () => launcher.style.transform = "scale(1)";

  document.body.appendChild(launcher);

  // ✅ Chatbot Container (Hidden by Default)
  var container = document.createElement("div");
  container.id = "aiaera-chat-container";
  container.style.cssText = \`
    position: fixed;
    bottom: 95px;
    right: 20px;
    width: 380px;
    height: 540px;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    z-index: 999999;
    display: none;
    background: transparent;
  \`;

  // ✅ Iframe
  var iframe = document.createElement("iframe");
  iframe.src = frontendUrl + "/public-chatbot/" + chatbotId;
  iframe.style.cssText = "width:100%;height:100%;border:none;";
  iframe.allow = "clipboard-write; microphone; camera";

  container.appendChild(iframe);
  document.body.appendChild(container);

  // ✅ Toggle Function
  function toggleChat() {
    if (!isOpen) {
      container.style.display = "block";
      isOpen = true;
    } else {
      container.style.display = "none";
      isOpen = false;
    }
  }

  launcher.onclick = toggleChat;

  // ✅ Close on ESC key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) {
      toggleChat();
    }
  });

  // ✅ Mobile Responsive
  function handleResize() {
    if (window.innerWidth < 500) {
      container.style.width = "95vw";
      container.style.height = "85vh";
      container.style.right = "2.5vw";
      container.style.bottom = "80px";
    } else {
      container.style.width = "380px";
      container.style.height = "540px";
      container.style.right = "20px";
      container.style.bottom = "95px";
    }
  }

  handleResize();
  window.addEventListener("resize", handleResize);
})();
`);
  } catch (err) {
    console.error("❌ Embed script error:", err);
    res.setHeader("Content-Type", "application/javascript");
    return res.send(`console.error("AIAERA embed failed");`);
  }
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
