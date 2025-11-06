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
// Embed JS route
// ----------------------
router.get(
  "/:id.js",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // ✅ Headers for cross-origin iframe embedding
    res.removeHeader("X-Frame-Options");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Content-Security-Policy", "frame-ancestors *");
    res.type("application/javascript");

    // Fetch chatbot from Supabase
    const { data: chatbot, error } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !chatbot) {
      return res.status(404).send(`console.error('Chatbot not found');`);
    }

    // Parse config
    let config = {};
    try {
      config =
        typeof chatbot.config === "string"
          ? JSON.parse(chatbot.config)
          : chatbot.config || {};
    } catch {
      config = {};
    }

    // Extract and sanitize
    const logoUrl = escapeHTML(config.logo_url);
    const businessName = escapeHTML(chatbot.name || "AI Chatbot");
    const businessDescription = escapeHTML(chatbot.business_info || "");
    const websiteUrl = escapeHTML(config.website_url || "");
    const files = Array.isArray(config.files) ? config.files : [];
    const theme = config?.themeColors?.userBubble || "#7f5af0";
    const safeApiUrl = escapeHTML(
      process.env.VITE_BACKEND_URL ||
        "https://aiaera-backend.onrender.com"
    );

    // ----------------------
    // Embed JS
    // ----------------------
    const js = `
(function() {
  const iframe = document.createElement('iframe');
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.maxWidth = '400px';
  iframe.style.height = '500px';
  iframe.style.maxHeight = '80%';
  iframe.style.position = 'fixed';
  iframe.style.bottom = '20px';
  iframe.style.right = '20px';
  iframe.style.zIndex = '999999';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
  iframe.loading = 'lazy';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(\`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet"></head><body style="margin:0;font-family:Inter,sans-serif;background:#0f0f17;color:white;display:flex;flex-direction:column;height:100%;"></body></html>\`);

  const root = doc.createElement('div');
  doc.body.appendChild(root);

  // Header
  const header = doc.createElement('div');
  header.style.padding = '10px';
  header.style.textAlign = 'center';
  if ("${logoUrl}") {
    const img = doc.createElement('img');
    img.src = "${logoUrl}";
    img.style.maxHeight = '50px';
    img.style.marginBottom = '8px';
    img.style.borderRadius = '8px';
    header.appendChild(img);
  }
  const nameEl = doc.createElement('div');
  nameEl.textContent = "${businessName}";
  nameEl.style.fontWeight = 'bold';
  nameEl.style.fontSize = '16px';
  header.appendChild(nameEl);

  if ("${businessDescription}") {
    const descEl = doc.createElement('div');
    descEl.textContent = "${businessDescription}";
    descEl.style.fontSize = '12px';
    descEl.style.opacity = '0.8';
    descEl.style.marginBottom = '8px';
    header.appendChild(descEl);
  }

  if ("${websiteUrl}") {
    const linkEl = doc.createElement('a');
    linkEl.href = "${websiteUrl}";
    linkEl.target = '_blank';
    linkEl.textContent = 'Visit Website';
    linkEl.style.color = '${theme}';
    linkEl.style.textDecoration = 'underline';
    linkEl.style.fontSize = '12px';
    header.appendChild(linkEl);
  }

  root.appendChild(header);

  // Chatbox
  const chatbox = doc.createElement('div');
  chatbox.style.flex = '1';
  chatbox.style.display = 'flex';
  chatbox.style.flexDirection = 'column';
  chatbox.style.overflow = 'hidden';
  chatbox.style.borderTop = '1px solid rgba(255,255,255,0.2)';
  root.appendChild(chatbox);

  const messagesEl = doc.createElement('div');
  messagesEl.style.flex = '1';
  messagesEl.style.overflowY = 'auto';
  messagesEl.style.padding = '6px';
  messagesEl.style.display = 'flex';
  messagesEl.style.flexDirection = 'column';
  messagesEl.style.gap = '4px';
  chatbox.appendChild(messagesEl);

  const inputContainer = doc.createElement('div');
  inputContainer.style.display = 'flex';
  inputContainer.style.gap = '4px';
  inputContainer.style.padding = '4px';
  inputContainer.style.borderTop = '1px solid rgba(255,255,255,0.2)';
  chatbox.appendChild(inputContainer);

  const inputEl = doc.createElement('textarea');
  inputEl.rows = 1;
  inputEl.placeholder = 'Type a message...';
  inputEl.style.flex = '1';
  inputEl.style.resize = 'none';
  inputEl.style.borderRadius = '8px';
  inputEl.style.padding = '6px';
  inputEl.style.border = 'none';
  inputEl.style.outline = 'none';
  inputContainer.appendChild(inputEl);

  const sendBtn = doc.createElement('button');
  sendBtn.textContent = 'Send';
  sendBtn.style.border = 'none';
  sendBtn.style.borderRadius = '8px';
  sendBtn.style.padding = '6px 10px';
  sendBtn.style.background = '${theme}';
  sendBtn.style.color = 'white';
  sendBtn.style.cursor = 'pointer';
  inputContainer.appendChild(sendBtn);

  const chatbotConfig = ${JSON.stringify({
    id,
    business_info: businessDescription,
    website_url: websiteUrl,
    logo_url: logoUrl,
    files,
  })};
  const API_URL = "${safeApiUrl}/api/chatbot/public/${id}";

  const addMessage = (text, sender) => {
    const div = doc.createElement('div');
    div.textContent = text;
    div.style.padding = '6px 10px';
    div.style.borderRadius = '12px';
    div.style.maxWidth = '75%';
    div.style.wordBreak = 'break-word';
    div.style.background = sender === 'bot' ? '${theme}' : '#6c3ef8';
    div.style.alignSelf = sender === 'bot' ? 'flex-start' : 'flex-end';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  sendBtn.addEventListener('click', async () => {
    const msg = inputEl.value.trim();
    if (!msg) return;
    addMessage(msg, 'user');
    inputEl.value = '';
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: msg }], chatbotConfig }),
      });
      const data = await res.json();
      if (data.reply) addMessage(data.reply, 'bot');
    } catch (err) {
      addMessage('⚠️ Failed to fetch reply', 'bot');
      console.error(err);
    }
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  doc.close();
})();
`;

    res.send(js);
  })
);

export default router;
