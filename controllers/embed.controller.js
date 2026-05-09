import { supabase } from "../config/supabaseClient.js";

/*
========================================
EMBED SCRIPT
========================================
Dynamic widget injection

Usage:
<script src="BACKEND_URL/api/embed/CHATBOT_ID.js"></script>
========================================
*/

export const getEmbedScript = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    /*
    ========================================
    VALIDATE CHATBOT
    ========================================
    */
    const {
      data: chatbot,
      error,
    } = await supabase
      .from("chatbots")
      .select("id,name")
      .eq("id", id)
      .single();

    if (error || !chatbot) {
      return res
        .status(404)
        .send(
          `console.error("AIAERA: Chatbot not found");`
        );
    }

    const FRONTEND_URL =
      process.env.FRONTEND_URL;

    /*
    ========================================
    WIDGET SCRIPT
    ========================================
    */
    const script = `
(function () {

  if (window.AIAERA_WIDGET_LOADED) {
    return;
  }

  window.AIAERA_WIDGET_LOADED = true;

  var chatbotId = "${id}";
  var baseUrl = "${FRONTEND_URL}";

  /*
  ========================================
  MOBILE CHECK
  ========================================
  */
  var isMobile = window.innerWidth < 768;

  /*
  ========================================
  BUTTON
  ========================================
  */
  var button = document.createElement("button");

  button.innerHTML = "💬";

  button.setAttribute(
    "aria-label",
    "Open AI Chat"
  );

  button.style.position = "fixed";
  button.style.bottom = "20px";
  button.style.right = "20px";
  button.style.width = "64px";
  button.style.height = "64px";
  button.style.borderRadius = "50%";
  button.style.border = "none";
  button.style.background = "#7f5af0";
  button.style.color = "#ffffff";
  button.style.fontSize = "28px";
  button.style.cursor = "pointer";
  button.style.zIndex = "999999";
  button.style.boxShadow =
    "0 12px 35px rgba(0,0,0,0.25)";
  button.style.transition =
    "all 0.3s ease";

  /*
  ========================================
  HOVER EFFECT
  ========================================
  */
  button.onmouseenter = function () {
    button.style.transform =
      "scale(1.08)";
  };

  button.onmouseleave = function () {
    button.style.transform =
      "scale(1)";
  };

  /*
  ========================================
  CHAT CONTAINER
  ========================================
  */
  var container =
    document.createElement("div");

  container.style.position = "fixed";
  container.style.bottom = "95px";
  container.style.right = "20px";

  container.style.width =
    isMobile
      ? "calc(100vw - 20px)"
      : "380px";

  container.style.height =
    isMobile
      ? "80vh"
      : "650px";

  container.style.maxHeight = "700px";

  container.style.background = "#ffffff";

  container.style.borderRadius =
    isMobile
      ? "20px 20px 0 0"
      : "24px";

  container.style.overflow = "hidden";

  container.style.display = "none";

  container.style.zIndex = "999999";

  container.style.boxShadow =
    "0 25px 60px rgba(0,0,0,0.35)";

  container.style.backdropFilter =
    "blur(12px)";

  /*
  ========================================
  IFRAME
  ========================================
  */
  var iframe =
    document.createElement("iframe");

  iframe.src =
    baseUrl +
    "/public-chatbot/" +
    chatbotId;

  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";

  iframe.setAttribute(
    "allow",
    "clipboard-write"
  );

  /*
  ========================================
  APPEND IFRAME
  ========================================
  */
  container.appendChild(iframe);

  /*
  ========================================
  TOGGLE
  ========================================
  */
  var isOpen = false;

  button.onclick = function () {

    isOpen = !isOpen;

    container.style.display =
      isOpen
        ? "block"
        : "none";
  };

  /*
  ========================================
  ESC KEY CLOSE
  ========================================
  */
  document.addEventListener(
    "keydown",
    function (e) {

      if (e.key === "Escape") {

        container.style.display =
          "none";

        isOpen = false;
      }
    }
  );

  /*
  ========================================
  APPEND TO BODY
  ========================================
  */
  document.body.appendChild(button);

  document.body.appendChild(container);

})();
`;

    /*
    ========================================
    RESPONSE HEADERS
    ========================================
    */
    res.setHeader(
      "Content-Type",
      "application/javascript"
    );

    res.setHeader(
      "Cache-Control",
      "public, max-age=3600"
    );

    return res.send(script);

  } catch (err) {

    console.error(
      "EMBED SCRIPT ERROR:",
      err
    );

    return res
      .status(500)
      .send(
        `console.error("AIAERA widget failed to load");`
      );
  }
};

/*
========================================
PUBLIC CHATBOT DATA
========================================
Used by:
- Website Widget
- Public Chatbot Page
========================================
*/

export const getPublicChatbot =
  async (req, res) => {
    try {

      const { id } = req.params;

      const {
        data,
        error,
      } = await supabase
        .from("chatbots")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          error:
            "Chatbot not found",
        });
      }

      /*
      ========================================
      SAFE PUBLIC RESPONSE
      ========================================
      */
      return res.json({
        success: true,

        chatbot: {
          id: data.id,
          name: data.name,
          business_info:
            data.business_info,
          website_url:
            data.website_url,
          theme: data.theme,
        },
      });

    } catch (err) {

      console.error(
        "PUBLIC CHATBOT ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        error:
          "Server error",
      });
    }
  };