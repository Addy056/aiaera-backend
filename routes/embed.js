import express from "express";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

/* --------------------------------------------------- */
/* ✅ SERVE EMBED SCRIPT (.js) – POLISHED, UNIVERSAL   */
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
      return res.send(`console.error("❌ AIAERA: Chatbot not found: ${chatbotId}");`);
    }

    let cfg = {};
    try {
      cfg = typeof bot.config === "string" ? JSON.parse(bot.config) : bot.config;
    } catch {
      cfg = {};
    }

    const logo =
      cfg?.logo_url ||
      "https://aiaera-frontend.vercel.app/logo.png";

    const FRONTEND_URL = process.env.FRONTEND_URL || "https://aiaera-frontend.vercel.app";

    return res.send(`
(function () {

  if (window.__AIAERA_WIDGET_LOADED__) return;
  window.__AIAERA_WIDGET_LOADED__ = true;

  var chatbotId = "${chatbotId}";
  var frontendUrl = "${FRONTEND_URL}";
  var logoUrl = "${logo}";
  var isOpen = false;

  /* --------------------------------------------------- */
  /* ✅ SAFELY INSERT STYLES (SCOPED + ANIMATED)         */
  /* --------------------------------------------------- */
  var style = document.createElement("style");
  style.textContent = \`
    #aiaera-launcher {
      all: unset;
      position: fixed;
      bottom: 22px;
      right: 22px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: radial-gradient(circle at top, #7f5af0, #4c3fe0);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 99999999;
      transition: transform 0.2s ease;
      animation: aiaera-pulse 6s infinite;
    }

    #aiaera-launcher img {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      pointer-events: none;
    }

    #aiaera-chat-container {
      position: fixed;
      bottom: 96px;
      right: 22px;
      width: 380px;
      height: 540px;
      border-radius: 18px;
      overflow: hidden;
      background: #00000000;
      box-shadow: 0 25px 60px rgba(0,0,0,0.6);
      display: none;
      z-index: 99999999;
    }

    @keyframes aiaera-pulse {
      0% { box-shadow: 0 10px 30px rgba(0,0,0,0.45), 0 0 0 0 rgba(127,90,240,0.5); }
      70% { box-shadow: 0 10px 30px rgba(0,0,0,0.45), 0 0 0 14px rgba(127,90,240,0); }
      100% { box-shadow: 0 10px 30px rgba(0,0,0,0.45), 0 0 0 0 rgba(127,90,240,0); }
    }

    @media (max-width: 500px) {
      #aiaera-chat-container {
        width: 95vw !important;
        height: 85vh !important;
        bottom: 88px !important;
        right: 2.5vw !important;
      }
    }
  \`;
  document.head.appendChild(style);

  /* --------------------------------------------------- */
  /* ✅ CREATE LAUNCHER BUTTON                           */
  /* --------------------------------------------------- */
  var launcher = document.createElement("div");
  launcher.id = "aiaera-launcher";

  var logoImg = document.createElement("img");
  logoImg.src = logoUrl;

  launcher.appendChild(logoImg);
  document.body.appendChild(launcher);

  launcher.onmouseenter = () => launcher.style.transform = "scale(1.1)";
  launcher.onmouseleave = () => launcher.style.transform = "scale(1)";

  /* --------------------------------------------------- */
  /* ✅ IFRAME CONTAINER                                 */
  /* --------------------------------------------------- */
  var container = document.createElement("div");
  container.id = "aiaera-chat-container";

  var iframe = document.createElement("iframe");
  iframe.src = frontendUrl + "/public-chatbot/" + chatbotId;
  iframe.style.cssText = "width:100%;height:100%;border:0;";
  iframe.allow = "camera; microphone; clipboard-write;";

  container.appendChild(iframe);
  document.body.appendChild(container);

  /* --------------------------------------------------- */
  /* ✅ TOGGLE CHATBOT UI                                */
  /* --------------------------------------------------- */
  launcher.onclick = function () {
    if (!isOpen) {
      container.style.display = "block";
      isOpen = true;
    } else {
      container.style.display = "none";
      isOpen = false;
    }
  };

  /* --------------------------------------------------- */
  /* ✅ ESC KEY CLOSE                                    */
  /* --------------------------------------------------- */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) {
      container.style.display = "none";
      isOpen = false;
    }
  });

})();
`);
  } catch (err) {
    console.error("❌ Embed script error:", err);
    res.setHeader("Content-Type", "application/javascript");
    return res.send(`console.error("AIAERA embed failed");`);
  }
});

/* --------------------------------------------------- */
/* ✅ PUBLIC CHATBOT CONFIG ENDPOINT                    */
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
