(function () {

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
    "https://aiaera-frontend.vercel.app";

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

  iframe.scrolling =
    "no";

  Object.assign(
    iframe.style,
    {
      position: "fixed",

      bottom: "90px",

      right: "20px",

      width: "390px",

      height: "700px",

      border: "none",

      borderRadius: "28px",

      overflow: "hidden",

      background:
        "#0B1120",

      zIndex: "999999",

      opacity: "0",

      visibility:
        "hidden",

      pointerEvents:
        "none",

      transform:
        "translateY(20px)",

      transition:
        "all 0.25s ease",

      boxShadow:
        "0 25px 80px rgba(0,0,0,0.45)",
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
      "95vw";

    iframe.style.height =
      "80vh";

    iframe.style.right =
      "2.5vw";

    iframe.style.bottom =
      "85px";

    iframe.style.borderRadius =
      "24px";
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

  Object.assign(
    button.style,
    {
      position: "fixed",

      bottom: "20px",

      right: "20px",

      width: "65px",

      height: "65px",

      borderRadius:
        "50%",

      border: "none",

      cursor: "pointer",

      background:
        "linear-gradient(135deg,#7f5af0,#5b8cff)",

      display: "flex",

      alignItems:
        "center",

      justifyContent:
        "center",

      boxShadow:
        "0 12px 35px rgba(127,90,240,0.45)",

      zIndex: "999999",

      transition:
        "all 0.2s ease",
    }
  );

  button.innerHTML =
    `
      <div
        style="
          color:white;
          font-size:28px;
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
  TOGGLE
  ========================================
  */
  let opened = false;

  button.onclick = () => {

    opened = !opened;

    if (opened) {

      iframe.style.opacity =
        "1";

      iframe.style.visibility =
        "visible";

      iframe.style.pointerEvents =
        "auto";

      iframe.style.transform =
        "translateY(0)";

      button.innerHTML =
        `
          <div
            style="
              color:white;
              font-size:30px;
              font-weight:bold;
            "
          >
            ×
          </div>
        `;

    } else {

      iframe.style.opacity =
        "0";

      iframe.style.visibility =
        "hidden";

      iframe.style.pointerEvents =
        "none";

      iframe.style.transform =
        "translateY(20px)";

      button.innerHTML =
        `
          <div
            style="
              color:white;
              font-size:28px;
            "
          >
            💬
          </div>
        `;
    }
  };

  /*
  ========================================
  APPEND TO BODY
  ========================================
  */
  document.body.appendChild(
    iframe
  );

  document.body.appendChild(
    button
  );

})();