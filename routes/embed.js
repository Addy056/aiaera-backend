// backend/routes/embed.js
import express from "express";
import supabase from "../config/supabaseClient.js";

const router = express.Router();

/* --------------------------------------------------- */
/* ✅ SERVE EMBED SCRIPT (.js) WITH FLOATING BUTTON */
/* --------------------------------------------------- */
router.get("/:id.js", async (req, res) => {
  try {
    const chatbotId = req.params.id;

    const { data: bot, error } = await supabase
      .from("chatbots")
      .select("id, name, config")
      .eq("id", chatbotId)
      .single();

    if (error || !bot) {
      res.setHeader("Content-Type", "application/javascript");
      return res.send(`console.error("Chatbot not found");`);
    }

    let cfg = {};
    try {
      cfg = typeof bot.config === "string" ? JSON.parse(bot.config) : bot.config;
    } catch {
      cfg = {};
    }

    const logo =
      cfg?.logo_url ||
      "https://aiaera-frontend.vercel.app/logo.png"; // ✅ fallback logo

    const FRONTEND_URL = process.env.FRONTEND_URL;

    res.setHeader("Content-Type", "application/javascript");

    return res.send(`
(function () {
  var chatbotId = "${chatbotId}";
  var frontendUrl = "${FRONTEND_URL}";
  var logoUrl = "${logo}";

  // ✅ Floating Launcher Button
  var launcher = document.createElement("div");
  launcher.style.position = "fixed";
  launcher.style.bottom = "20px";
  launcher.style.right = "20px";
  launcher.style.width = "60px";
  launcher.style.height = "60px";
  launcher.style.borderRadius = "50%";
  launcher.style.background = "linear-gradient(135deg, #7f5af0, #5a3df0)";
  launcher.style.display = "flex";
  launcher.style.alignItems = "center";
  launcher.style.justifyContent = "center";
  launcher.style.cursor = "pointer";
  launcher.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
  launcher.style.zIndex = "999999";
  launcher.style.transition = "transform 0.2s ease";

  launcher.onmouseenter = function () {
    launcher.style.transform = "scale(1.05)";
  };
  launcher.onmouseleave = function () {
    launcher.style.transform = "scale(1)";
  };

  var logo = document.createElement("img");
  logo.src = logoUrl;
  logo.style.width = "34px";
  logo.style.height = "34px";
  logo.style.objectFit = "contain";

  launcher.appendChild(logo);
  document.body.appendChild(launcher);

  // ✅ Chatbot Window
  var container = document.createElement("div");
  container.style.position = "fixed";
  container.style.bottom = "90px";
  container.style.right = "20px";
  container.style.width = "400px";
  container.style.height = "520px";
  container.style.borderRadius = "16px";
  container.style.overflow = "hidden";
  container.style.boxShadow = "0 20px 60px rgba(0,0,0,0.5)";
  container.style.zIndex = "999999";
  container.style.display = "none";
  container.style.background = "transparent";

  var iframe = document.createElement("iframe");
  iframe.src = frontendUrl + "/public-chatbot/" + chatbotId;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.allow = "clipboard-write; microphone; camera";

  container.appendChild(iframe);
  document.body.appendChild(container);

  // ✅ Toggle Logic
  var open = false;

  launcher.onclick = function () {
    if (!open) {
      container.style.display = "block";
      open = true;
    } else {
      container.style.display = "none";
      open = false;
    }
  };
})();
`);
  } catch (err) {
    console.error("Embed script error:", err);
    res.setHeader("Content-Type", "application/javascript");
    return res.send(`console.error("Embed failed");`);
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
