// backend/controllers/embedController.js
import supabase from "../config/supabaseClient.js";

export const generateEmbedScript = async (req, res) => {
  try {
    const chatbotId = req.params.id;

    if (!chatbotId) {
      return res.send(`console.error("AIAERA: Missing chatbot ID");`);
    }

    const APP_BASE = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
    if (!APP_BASE) {
      return res.send(`console.error("AIAERA: Missing APP_BASE_URL");`);
    }

    // Fetch chatbot to get theme + logo
    const { data: bot } = await supabase
      .from("chatbots")
      .select("id, config")
      .eq("id", chatbotId)
      .maybeSingle();

    if (!bot) {
      return res.send(`console.error("AIAERA: Chatbot not found");`);
    }

    const cfg = bot.config || {};
    const logo = cfg.logo_url || "";
    const fallbackIcon = "https://cdn-icons-png.flaticon.com/512/4712/4712100.png";

    // Theme colors from Builder
    const theme = cfg.themeColors || {
      background: "#0d0d14",
      userBubble: "#7f5af0",
      botBubble: "#00eaff",
      text: "#ffffff",
    };

    const launcherImage = logo || fallbackIcon;
    const iframeURL = `${APP_BASE}/public-chatbot/${chatbotId}`;

    const script = `
      (function () {
        const widgetTheme = {
          background: "${theme.background}",
          text: "${theme.text}",
          glow: "${theme.userBubble}",
          bot: "${theme.botBubble}",
          user: "${theme.userBubble}"
        };

        const bubble = document.createElement("div");
        bubble.id = "aiaera-chat-bubble";
        bubble.style.position = "fixed";
        bubble.style.width = "62px";
        bubble.style.height = "62px";
        bubble.style.borderRadius = "50%";
        bubble.style.bottom = "22px";
        bubble.style.right = "22px";
        bubble.style.cursor = "pointer";
        bubble.style.zIndex = "999999";
        bubble.style.background = "rgba(255,255,255,0.12)";
        bubble.style.backdropFilter = "blur(12px)";
        bubble.style.border = "2px solid rgba(255,255,255,0.18)";
        bubble.style.boxShadow = "0 0 22px " + widgetTheme.glow;
        bubble.style.display = "flex";
        bubble.style.alignItems = "center";
        bubble.style.justifyContent = "center";
        bubble.style.transition = "0.25s ease";

        bubble.onmouseenter = () => {
          bubble.style.transform = "scale(1.08)";
          bubble.style.boxShadow = "0 0 28px " + widgetTheme.glow;
        };
        bubble.onmouseleave = () => {
          bubble.style.transform = "scale(1)";
          bubble.style.boxShadow = "0 0 22px " + widgetTheme.glow;
        };

        const img = document.createElement("img");
        img.src = "${launcherImage}";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.borderRadius = "50%";
        img.style.objectFit = "cover";
        bubble.appendChild(img);

        document.body.appendChild(bubble);

        // Widget container
        const widget = document.createElement("div");
        widget.id = "aiaera-widget";
        widget.style.position = "fixed";
        widget.style.bottom = "92px";
        widget.style.right = "20px";
        widget.style.width = "360px";
        widget.style.height = "520px";
        widget.style.borderRadius = "18px";
        widget.style.overflow = "hidden";
        widget.style.zIndex = "999999";
        widget.style.background = widgetTheme.background;
        widget.style.border = "1px solid rgba(255,255,255,0.14)";
        widget.style.boxShadow = "0 0 30px " + widgetTheme.glow;
        widget.style.display = "none";
        widget.style.opacity = 0;
        widget.style.transform = "translateY(20px) scale(0.85)";
        widget.style.transition = "all 260ms cubic-bezier(0.16, 1, 0.3, 1)";

        const iframe = document.createElement("iframe");
        iframe.src = "${iframeURL}";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        widget.appendChild(iframe);

        document.body.appendChild(widget);

        // Open widget
        bubble.onclick = () => {
          widget.style.display = "block";
          setTimeout(() => {
            widget.style.opacity = 1;
            widget.style.transform = "translateY(0) scale(1)";
          }, 10);
        };

        // Close widget outside
        document.addEventListener("click", (e) => {
          if (!widget.contains(e.target) && e.target !== bubble) {
            widget.style.opacity = 0;
            widget.style.transform = "translateY(20px) scale(0.85)";
            setTimeout(() => (widget.style.display = "none"), 250);
          }
        });

        // Draggable bubble
        let dragging = false, offsetX, offsetY;

        bubble.addEventListener("mousedown", (e) => {
          dragging = true;
          bubble.style.transition = "none";
          offsetX = e.clientX - bubble.getBoundingClientRect().left;
          offsetY = e.clientY - bubble.getBoundingClientRect().top;
        });

        document.addEventListener("mouseup", () => {
          dragging = false;
          bubble.style.transition = "0.25s ease";
        });

        document.addEventListener("mousemove", (e) => {
          if (!dragging) return;
          const x = e.clientX - offsetX;
          const y = e.clientY - offsetY;
          bubble.style.left = x + "px";
          bubble.style.top = y + "px";
        });
      })();
    `;

    res.setHeader("Content-Type", "application/javascript");
    return res.send(script);
  } catch (error) {
    console.error("Embed Script Error:", error);
    return res.send(`console.error("AIAERA embed crashed")`);
  }
};
