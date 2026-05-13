(function () {

  /*
  ========================================
  STOP IF INSIDE IFRAME
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
  PREVENT DUPLICATES
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
  SCRIPT TAG
  ========================================
  */
  const scriptTag =
    document.currentScript;

  if (!scriptTag) {

    console.error(
      "AIAERA: Script tag missing"
    );

    return;
  }

  /*
  ========================================
  CHATBOT ID
  ========================================
  */
  const chatbotId =
    scriptTag.getAttribute(
      "data-chatbot-id"
    );

  if (!chatbotId) {

    console.error(
      "AIAERA: Missing chatbot ID"
    );

    return;
  }

  /*
  ========================================
  URLS
  ========================================
  */
  const FRONTEND_URL =
    "https://your-frontend.vercel.app";

  const API_URL =
    "https://your-backend.onrender.com";

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
    `${FRONTEND_URL}/public-chatbot/${chatbotId}`;

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

      bottom: "84px",

      right: "20px",

      width: "320px",

      height: "480px",

      border: "none",

      borderRadius: "22px",

      overflow: "hidden",

      background: "#0B1120",

      zIndex: "999999",

      opacity: "0",

      visibility: "hidden",

      pointerEvents: "none",

      transform:
        "translateY(20px) scale(0.95)",

      transition:
        "all 0.22s ease",

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
      "94vw";

    iframe.style.height =
      "72vh";

    iframe.style.right =
      "3vw";

    iframe.style.bottom =
      "78px";
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

      bottom: "18px",

      right: "18px",

      width: "58px",

      height: "58px",

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
        "all 0.22s ease",
    }
  );

  /*
  ========================================
  DEFAULT BUTTON ICON
  ========================================
  */
  button.innerHTML =
    `
      <div
        style="
          color:white;
          font-size:26px;
          display:flex;
          align-items:center;
          justify-content:center;
          width:100%;
          height:100%;
        "
      >
        💬
      </div>
    `;

  /*
  ========================================
  LOAD BUSINESS LOGO
  ========================================
  */
  fetch(
    `${API_URL}/api/embed/chatbot/${chatbotId}`
  )
    .then((res) =>
      res.json()
    )
    .then((data) => {

      const logo =
        data?.chatbot?.theme?.logo;

      if (logo) {

        button.innerHTML =
          `
            <img
              src="${logo}"
              alt="logo"
              style="
                width:100%;
                height:100%;
                object-fit:cover;
                border-radius:50%;
              "
            />
          `;
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
  let isOpen = false;

  button.onclick =
    function () {

      isOpen = !isOpen;

      if (isOpen) {

        iframe.style.visibility =
          "visible";

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

        setTimeout(() => {

          iframe.style.visibility =
            "hidden";

        }, 200);
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