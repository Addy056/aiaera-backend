import { supabase } from "../config/supabaseClient.js";

/*
========================================
GET PUBLIC CHATBOT
========================================
*/
export const getPublicChatbot = async (
  req,
  res
) => {
  try {

    const { id } =
      req.params;

    if (!id) {

      return res.status(400).json({
        success: false,
        error: "Chatbot ID required",
      });
    }

    const { data, error } =
      await supabase
        .from("chatbots")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {

      console.error(
        "CHATBOT FETCH ERROR:",
        error
      );

      return res.status(404).json({
        success: false,
        error: "Chatbot not found",
      });
    }

    /*
    ========================================
    PARSE THEME SAFELY
    ========================================
    */
    let parsedTheme = {};

    if (
      typeof data.theme ===
      "string"
    ) {

      try {

        parsedTheme =
          JSON.parse(
            data.theme
          );

      } catch (err) {

        console.error(
          "THEME PARSE ERROR:",
          err
        );

        parsedTheme = {};
      }

    } else {

      parsedTheme =
        data.theme || {};
    }

    /*
    ========================================
    RESPONSE
    ========================================
    */
    return res.status(200).json({
      success: true,

      chatbot: {
        id: data.id,

        name: data.name,

        bot_name:
          data.bot_name,

        business_info:
          data.business_info,

        website_url:
          data.website_url,

        theme: {
          botName:
            parsedTheme.botName ||
            data.bot_name ||
            "Assistant",

          logo:
            parsedTheme.logo ||
            "",

          chatBg:
            "#ffffff",

          botBubble:
            "#ffffff",

          userBubble:
            "#000000",

          textColor:
            "#111111",
        },

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
export const getEmbedScript = async (
  req,
  res
) => {
  try {

    const { id } =
      req.params;

    if (!id) {

      return res
        .status(400)
        .send(
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
  PREVENT DUPLICATE
  ========================================
  */
  if (
    document.getElementById(
      "aiaera-chatbot-button"
    )
  ) {
    return;
  }

  /*
  ========================================
  CHAT STATE
  ========================================
  */
  let isOpen = false;

  /*
  ========================================
  CONTAINER
  ========================================
  */
  const container =
    document.createElement(
      "div"
    );

  container.id =
    "aiaera-chatbot-container";

  Object.assign(
    container.style,
    {
      position: "fixed",
      bottom: "88px",
      right: "20px",
      width: "380px",
      height: "640px",
      zIndex: "999999",
      overflow: "hidden",
      borderRadius: "28px",
      display: "none",
      background: "#ffffff",
      boxShadow:
        "0 20px 60px rgba(0,0,0,0.15)",
    }
  );

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
    "${frontendUrl}/public-chatbot/${id}?embed=true";

  iframe.id =
    "aiaera-chatbot-widget";

  iframe.title =
    "AIAERA Chatbot";

  iframe.allow =
    "microphone; clipboard-write";

  Object.assign(
    iframe.style,
    {
      width: "100%",
      height: "100%",
      border: "none",
      overflow: "hidden",
      background: "#ffffff",
      display: "block",
    }
  );

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
  MOBILE RESPONSIVE
  ========================================
  */
  function handleMobileView() {

    if (
      window.innerWidth <= 768
    ) {

      container.style.width =
        "100vw";

      container.style.height =
        "100dvh";

      container.style.right =
        "0px";

      container.style.bottom =
        "0px";

      container.style.borderRadius =
        "0px";

    } else {

      container.style.width =
        "380px";

      container.style.height =
        "640px";

      container.style.right =
        "20px";

      container.style.bottom =
        "88px";

      container.style.borderRadius =
        "28px";
    }
  }

  handleMobileView();

  window.addEventListener(
    "resize",
    handleMobileView
  );

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
      bottom: "18px",
      right: "18px",
      width: "64px",
      height: "64px",
      borderRadius: "50%",
      border: "none",
      cursor: "pointer",
      overflow: "hidden",
      background: "#000000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow:
        "0 10px 35px rgba(0,0,0,0.18)",
      zIndex: "999999",
      transition:
        "transform 0.2s ease",
      padding: "0px",
    }
  );

  /*
  ========================================
  DEFAULT CHAT ICON
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
          font-size:28px;
          color:white;
        "
      >
        💬
      </div>
    \`;

  /*
  ========================================
  LOAD LOGO
  ========================================
  */
  fetch(
    "${backendUrl}/api/embed/chatbot/${id}"
  )
    .then((res) => res.json())
    .then((data) => {

      const logo =
        data?.chatbot?.theme?.logo;

      if (logo) {

        button.innerHTML =
          \`
            <img
              src="\${logo}"
              alt="Business Logo"
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
    .catch((err) => {
      console.log(
        "Logo load failed",
        err
      );
    });

  /*
  ========================================
  BUTTON HOVER
  ========================================
  */
  button.addEventListener(
    "mouseenter",
    () => {
      button.style.transform =
        "scale(1.08)";
    }
  );

  button.addEventListener(
    "mouseleave",
    () => {
      button.style.transform =
        "scale(1)";
    }
  );

  /*
  ========================================
  TOGGLE CHATBOT
  ========================================
  */
  button.addEventListener(
    "click",
    () => {

      isOpen = !isOpen;

      if (isOpen) {

        container.style.display =
          "block";

      } else {

        container.style.display =
          "none";
      }
    }
  );

  /*
  ========================================
  APPEND ELEMENTS
  ========================================
  */
  document.body.appendChild(
    container
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
      "no-store"
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
        "Embed script failed"
      );
  }
};