import { supabase } from "../config/supabaseClient.js";

/*
========================================
GET PUBLIC CHATBOT
========================================
*/
export const getPublicChatbot =
  async (req, res) => {

    try {

      const { id } =
        req.params;

      if (!id) {

        return res.status(400).json({
          success: false,
          error:
            "Chatbot ID required",
        });
      }

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

        console.error(
          "CHATBOT FETCH ERROR:",
          error
        );

        return res.status(404).json({
          success: false,
          error:
            "Chatbot not found",
        });
      }

      return res.status(200).json({
        success: true,

        chatbot: {
          id:
            data.id,

          name:
            data.name,

          bot_name:
            data.bot_name,

          business_info:
            data.business_info,

          website_url:
            data.website_url,

          theme:
            data.theme || {},

          user_id:
            data.user_id,
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
          "Failed to load chatbot",
      });
    }
  };

/*
========================================
GET EMBED SCRIPT
========================================
*/
export const getEmbedScript =
  async (req, res) => {

    try {

      const { id } =
        req.params;

      if (!id) {

        return res.status(400).send(
          "Chatbot ID required"
        );
      }

      /*
      ========================================
      URLS
      ========================================
      */
      const frontendUrl =
        process.env.FRONTEND_URL;

      const backendUrl =
        process.env.BACKEND_URL;

      /*
      ========================================
      EMBED SCRIPT
      ========================================
      */
      const script = `
(function () {

  /*
  ========================================
  STOP INSIDE IFRAME
  ========================================
  */
  if (
    window.self !==
    window.top
  ) {
    return;
  }

  /*
  ========================================
  PREVENT DUPLICATE
  ========================================
  */
  if (
    document.getElementById(
      "aiaera-chatbot-widget"
    )
  ) {
    return;
  }

  /*
  ========================================
  CREATE IFRAME
  ========================================
  */
  const iframe =
    document.createElement(
      "iframe"
    );

  iframe.src =
    "${frontendUrl}/public-chatbot/${id}";

  iframe.id =
    "aiaera-chatbot-widget";

  iframe.title =
    "AIAERA Chatbot";

  iframe.allow =
    "microphone; clipboard-write";

  Object.assign(
    iframe.style,
    {
      position: "fixed",

      bottom: "82px",

      right: "20px",

      width: "340px",

      height: "520px",

      border: "none",

      borderRadius: "24px",

      overflow: "hidden",

      background: "#0B1120",

      zIndex: "999999",

      opacity: "0",

      pointerEvents: "none",

      transform:
        "translateY(20px) scale(0.95)",

      transition:
        "all 0.25s ease",

      boxShadow:
        "0 20px 60px rgba(0,0,0,0.35)",
    }
  );

  /*
  ========================================
  MOBILE RESPONSIVE
  ========================================
  */
  if (
    window.innerWidth < 480
  ) {

    iframe.style.width =
      "92vw";

    iframe.style.height =
      "75vh";

    iframe.style.right =
      "4vw";

    iframe.style.bottom =
      "80px";
  }

  /*
  ========================================
  CREATE BUTTON
  ========================================
  */
  const button =
    document.createElement(
      "button"
    );

  button.id =
    "aiaera-chatbot-button";

  button.setAttribute(
    "aria-label",
    "Open AI Chatbot"
  );

  Object.assign(
    button.style,
    {
      position: "fixed",

      bottom: "20px",

      right: "20px",

      width: "62px",

      height: "62px",

      borderRadius: "50%",

      border: "none",

      cursor: "pointer",

      overflow: "hidden",

      background:
        "linear-gradient(135deg,#7f5af0,#5b8cff)",

      display: "flex",

      alignItems: "center",

      justifyContent: "center",

      boxShadow:
        "0 12px 35px rgba(127,90,240,0.45)",

      zIndex: "999999",

      transition:
        "all 0.25s ease",
    }
  );

  /*
  ========================================
  DEFAULT ICON
  ========================================
  */
  button.innerHTML =
    \`
      <div
        style="
          width:100%;
          height:100%;
          display:flex;
          align-items:center;
          justify-content:center;
          color:white;
          font-size:28px;
        "
      >
        💬
      </div>
    \`;

  /*
  ========================================
  LOAD BUSINESS LOGO
  ========================================
  */
  fetch(
    "${backendUrl}/api/embed/chatbot/${id}"
  )
    .then((res) =>
      res.json()
    )
    .then((data) => {

      const logo =
        data?.chatbot?.theme?.logo;

      if (logo) {

        button.innerHTML =
          \`
            <img
              src="\${logo}"
              alt="logo"
              style="
                width:100%;
                height:100%;
                object-fit:cover;
                border-radius:50%;
              "
            />
          \`;
      }
    })
    .catch(() => {

      console.log(
        "Logo load failed"
      );
    });

  /*
  ========================================
  HOVER EFFECT
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
  TOGGLE CHAT
  ========================================
  */
  let open = false;

  button.onclick =
    function () {

      open = !open;

      if (open) {

        iframe.style.opacity =
          "1";

        iframe.style.pointerEvents =
          "auto";

        iframe.style.transform =
          "translateY(0px) scale(1)";

      } else {

        iframe.style.opacity =
          "0";

        iframe.style.pointerEvents =
          "none";

        iframe.style.transform =
          "translateY(20px) scale(0.95)";
      }
    };

  /*
  ========================================
  APPEND ELEMENTS
  ========================================
  */
  document.body.appendChild(
    iframe
  );

  document.body.appendChild(
    button
  );

})();
`;

      /*
      ========================================
      HEADERS
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

      res.send(script);

    } catch (err) {

      console.error(
        "EMBED SCRIPT ERROR:",
        err
      );

      res.status(500).send(
        "Embed script failed"
      );
    }
  };