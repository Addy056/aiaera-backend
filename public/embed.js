(function () {

  const scriptTag =
    document.currentScript;

  const chatbotId =
    scriptTag.getAttribute(
      "data-chatbot-id"
    );

  if (!chatbotId) {
    console.error(
      "Missing chatbot ID"
    );

    return;
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

  button.innerHTML = "💬";

  Object.assign(
    button.style,
    {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "60px",
      height: "60px",
      borderRadius: "50%",
      border: "none",
      cursor: "pointer",
      zIndex: "999999",
      fontSize: "24px",
      background: "#7f5af0",
      color: "#fff",
      boxShadow:
        "0 10px 30px rgba(0,0,0,0.25)",
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
    `http://localhost:5173/public-chatbot/${chatbotId}`;

  Object.assign(
    iframe.style,
    {
      position: "fixed",
      bottom: "90px",
      right: "20px",
      width: "380px",
      height: "650px",
      border: "none",
      borderRadius: "20px",
      overflow: "hidden",
      zIndex: "999999",
      display: "none",
      background: "#fff",
      boxShadow:
        "0 10px 40px rgba(0,0,0,0.3)",
    }
  );

  /*
  ========================================
  TOGGLE CHAT
  ========================================
  */
  button.onclick = () => {

    iframe.style.display =
      iframe.style.display ===
      "none"
        ? "block"
        : "none";
  };

  document.body.appendChild(
    button
  );

  document.body.appendChild(
    iframe
  );

})();