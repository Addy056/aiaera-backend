import { supabase } from "../config/supabaseClient.js";

/*
========================================
EMBED SCRIPT
========================================
*/
export const getEmbedScript = async (
  req,
  res
) => {

  try {

    const { id } =
      req.params;

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
      .select("*")
      .eq("id", id)
      .single();

    if (
      error ||
      !chatbot
    ) {

      return res
        .status(404)
        .send(
          `console.error("AIAERA: Chatbot not found");`
        );
    }

    /*
    ========================================
    FRONTEND URL
    ========================================
    */
    const FRONTEND_URL =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    /*
    ========================================
    WIDGET SCRIPT
    ========================================
    */
    const script = `
(function () {

  /*
  ========================================
  PREVENT MULTIPLE LOADS
  ========================================
  */
  if (
    window.AIAERA_WIDGET_LOADED
  ) {
    return;
  }

  window.AIAERA_WIDGET_LOADED =
    true;

  /*
  ========================================
  VARIABLES
  ========================================
  */
  var chatbotId =
    "${id}";

  var baseUrl =
    "${FRONTEND_URL}";

  /*
  ========================================
  MOBILE CHECK
  ========================================
  */
  var isMobile =
    window.innerWidth < 768;

  /*
  ========================================
  BUTTON
  ========================================
  */
  var button =
    document.createElement(
      "button"
    );

  button.innerHTML =
    "💬";

  button.setAttribute(
    "aria-label",
    "Open AI Chat"
  );

  /*
  ========================================
  BUTTON STYLE
  ========================================
  */
  button.style.position =
    "fixed";

  button.style.bottom =
    isMobile
      ? "16px"
      : "24px";

  button.style.right =
    isMobile
      ? "16px"
      : "24px";

  button.style.width =
    isMobile
      ? "62px"
      : "68px";

  button.style.height =
    isMobile
      ? "62px"
      : "68px";

  button.style.border =
    "none";

  button.style.outline =
    "none";

  button.style.cursor =
    "pointer";

  button.style.borderRadius =
    "50%";

  button.style.background =
    "linear-gradient(135deg,#7f5af0,#4f46e5)";

  button.style.color =
    "#ffffff";

  button.style.fontSize =
    "28px";

  button.style.display =
    "flex";

  button.style.alignItems =
    "center";

  button.style.justifyContent =
    "center";

  button.style.boxShadow =
    "0 20px 60px rgba(124,58,237,0.45)";

  button.style.transition =
    "all 0.25s ease";

  button.style.zIndex =
    "2147483647";

  button.style.visibility =
    "visible";

  button.style.opacity =
    "1";

  button.style.pointerEvents =
    "auto";

  /*
  ========================================
  HOVER
  ========================================
  */
  button.onmouseenter =
    function () {

      button.style.transform =
        "scale(1.08)";
    };

  button.onmouseleave =
    function () {

      button.style.transform =
        "scale(1)";
    };

  /*
  ========================================
  CHAT CONTAINER
  ========================================
  */
  var container =
    document.createElement(
      "div"
    );

  container.style.position =
    "fixed";

  container.style.bottom =
    isMobile
      ? "0"
      : "110px";

  container.style.right =
    isMobile
      ? "0"
      : "40px";

  container.style.width =
    isMobile
      ? "100vw"
      : "350px";

  container.style.height =
    isMobile
      ? "100vh"
      : "600px";

  container.style.maxWidth =
    "calc(100vw - 20px)";

  container.style.maxHeight =
    "calc(100vh - 140px)";

  container.style.borderRadius =
    isMobile
      ? "0"
      : "26px";

  container.style.overflow =
    "hidden";

  container.style.background =
    "#0B1120";

  container.style.border =
    "1px solid rgba(255,255,255,0.08)";

  container.style.boxShadow =
    "0 25px 80px rgba(0,0,0,0.45)";

  container.style.backdropFilter =
    "blur(20px)";

  container.style.zIndex =
    "2147483647";

  container.style.display =
    "none";

  container.style.opacity =
    "0";

  container.style.transform =
    "translateY(20px) scale(0.96)";

  container.style.transition =
    "all 0.25s ease";

  /*
  ========================================
  IFRAME
  ========================================
  */
  var iframe =
    document.createElement(
      "iframe"
    );

  iframe.src =
    baseUrl +
    "/public-chatbot/" +
    chatbotId;

  iframe.allow =
    "microphone; clipboard-write";

  iframe.style.width =
    "100%";

  iframe.style.height =
    "100%";

  iframe.style.border =
    "none";

  iframe.style.display =
    "block";

  iframe.style.background =
    "#0B1120";

  iframe.style.visibility =
    "visible";

  iframe.style.opacity =
    "1";

  /*
  ========================================
  APPEND IFRAME
  ========================================
  */
  container.appendChild(
    iframe
  );

  /*
  ========================================
  TOGGLE
  ========================================
  */
  var isOpen =
    false;

  button.onclick =
    function () {

      isOpen =
        !isOpen;

      if (isOpen) {

        container.style.display =
          "block";

        requestAnimationFrame(
          function () {

            container.style.opacity =
              "1";

            container.style.transform =
              "translateY(0) scale(1)";
          }
        );

      } else {

        container.style.opacity =
          "0";

        container.style.transform =
          "translateY(20px) scale(0.96)";

        setTimeout(
          function () {

            container.style.display =
              "none";

          },
          250
        );
      }
    };

  /*
  ========================================
  ESC CLOSE
  ========================================
  */
  document.addEventListener(
    "keydown",
    function (e) {

      if (
        e.key === "Escape" &&
        isOpen
      ) {

        container.style.opacity =
          "0";

        container.style.transform =
          "translateY(20px) scale(0.96)";

        setTimeout(
          function () {

            container.style.display =
              "none";

          },
          250
        );

        isOpen =
          false;
      }
    }
  );

  /*
  ========================================
  RESPONSIVE RESIZE
  ========================================
  */
  window.addEventListener(
    "resize",
    function () {

      var mobile =
        window.innerWidth < 768;

      if (mobile) {

        container.style.width =
          "100vw";

        container.style.height =
          "100vh";

        container.style.bottom =
          "0";

        container.style.right =
          "0";

        container.style.borderRadius =
          "0";

      } else {

        container.style.width =
          "350px";

        container.style.height =
          "600px";

        container.style.bottom =
          "110px";

        container.style.right =
          "40px";

        container.style.borderRadius =
          "26px";
      }
    }
  );

  /*
  ========================================
  APPEND TO BODY
  ========================================
  */
  document.body.appendChild(
    button
  );

  document.body.appendChild(
    container
  );

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

    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    return res.send(
      script
    );

  } catch (err) {

    console.error(
      "EMBED SCRIPT ERROR:",
      err
    );

    return res
      .status(500)
      .send(
        'console.error("AIAERA widget failed to load");'
      );
  }
};

/*
========================================
PUBLIC CHATBOT DATA
========================================
*/
export const getPublicChatbot =
  async (
    req,
    res
  ) => {

    try {

      const { id } =
        req.params;

      const {
        data,
        error,
      } = await supabase
        .from("chatbots")
        .select("*")
        .eq("id", id)
        .single();

      if (
        error ||
        !data
      ) {

        return res.status(404).json({
          success: false,
          error:
            "Chatbot not found",
        });
      }

      return res.json({
        success: true,

        chatbot: {
          id:
            data.id,

          bot_name:
            data.bot_name,

          business_info:
            data.business_info,

          website_url:
            data.website_url,

          logo_url:
            data.logo_url || "",

          theme:
            data.theme || {},
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