// backend/controllers/embedController.js
import supabase from '../config/supabaseClient.js';
import { handleError } from '../utils/errorHandler.js';

/**
 * Serve the chatbot embed JS
 */
export const serveEmbedScript = async (req, res) => {
  try {
    const { id } = req.params; // chatbot ID

    // ✅ Required headers
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // Allow embedding on any site
    res.setHeader('Content-Security-Policy', 'frame-ancestors *'); // modern browsers

    if (!id) {
      return res.status(400).send(`console.error("Chatbot ID is required");`);
    }

    // Fetch chatbot config
    const { data: chatbot, error } = await supabase
      .from('chatbot_configs')
      .select('id, name')
      .eq('id', id)
      .single();

    if (error || !chatbot) {
      return res.status(404).send(`console.error("Chatbot not found");`);
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173"; // fallback for dev
    const safeName = (chatbot.name || "Assistant").replace(/["'`]/g, "");

    const script = `
      (function() {
        try {
          var iframe = document.createElement('iframe');
          iframe.src = "${frontendUrl}/public-chatbot/${chatbot.id}";
          iframe.style.position = "fixed";
          iframe.style.bottom = "20px";
          iframe.style.right = "20px";
          iframe.style.width = "400px";
          iframe.style.maxWidth = "90%";
          iframe.style.height = "600px";
          iframe.style.maxHeight = "80%";
          iframe.style.border = "none";
          iframe.style.borderRadius = "12px";
          iframe.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
          iframe.style.zIndex = "999999";
          iframe.title = "AI Chatbot - ${safeName}";
          iframe.setAttribute("allow", "microphone; clipboard-read; clipboard-write; fullscreen");
          iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-modals");
          iframe.loading = "lazy";
          document.body.appendChild(iframe);
        } catch (err) {
          console.error("Failed to load chatbot:", err);
        }
      })();
    `;

    res.send(script);
  } catch (err) {
    res.setHeader('Content-Type', 'application/javascript');
    res.status(500).send(`console.error("Internal Server Error loading chatbot");`);
    handleError(res, err);
  }
};
