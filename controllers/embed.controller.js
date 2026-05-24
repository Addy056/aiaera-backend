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

    /*
    ========================================
    FETCH CHATBOT
    ========================================
    */
    const {
      data,
      error,
    } =
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
    CHECK SUBSCRIPTION
    ========================================
    */
    const {
      data: subscription,
    } =
      await supabase
        .from(
          "user_subscriptions"
        )
        .select("*")
        .eq(
          "user_id",
          data.user_id
        )
        .single();

    let subscriptionExpired =
      false;

    if (
      subscription?.expires_at
    ) {

      const now =
        new Date();

      const expiry =
        new Date(
          subscription.expires_at
        );

      if (expiry < now) {

        subscriptionExpired =
          true;
      }
    }

    /*
    ========================================
    GET INTEGRATIONS
    ========================================
    */
    const {
      data: integrations,
    } =
      await supabase
        .from(
          "user_integrations"
        )
        .select("*")
        .eq(
          "user_id",
          data.user_id
        )
        .maybeSingle();

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

      subscription_expired:
        subscriptionExpired,

      integrations: {

        provider:
          integrations?.provider ||
          "calendly",

        meeting_link:
          integrations?.meeting_link ||
          integrations?.calendly_link ||
          "",

        maps:
          integrations?.maps ||
          integrations?.google_maps_link ||
          "",
      },

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
            parsedTheme.chatBg ||
            "#0B1120",

          botBubble:
            parsedTheme.botBubble ||
            "#111827",

          userBubble:
            parsedTheme.userBubble ||
            "#7f5af0",

          textColor:
            parsedTheme.textColor ||
            "#ffffff",
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
      bottom: "92px",
      right: "20px",
      width: "390px",
      height: "760px",
      maxWidth: "calc(100vw - 20px)",
      maxHeight: "calc(100dvh - 100px)",
      zIndex: "999999",
      overflow: "hidden",
      borderRadius: "32px",
      display: "none",
      background: "#0B1120",
      boxShadow:
        "0 20px 80px rgba(0,0,0,0.45)",
      border:
        "1px solid rgba(255,255,255,0.08)",
      transition:
        "all 0.25s ease",
      backdropFilter:
        "blur(20px)",
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
      background: "#0B1120",
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
        "390px";

      container.style.height =
        "760px";

      container.style.right =
        "20px";

      container.style.bottom =
        "92px";

      container.style.borderRadius =
        "32px";
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
      width: "68px",
      height: "68px",
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
        "0 12px 40px rgba(127,90,240,0.45)",
      zIndex: "999999",
      transition:
        "all 0.25s ease",
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
  LOAD BUSINESS LOGO
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

        button.style.transform =
          "scale(0.95)";

      } else {

        container.style.display =
          "none";

        button.style.transform =
          "scale(1)";
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