// utils/unifiedAIEngine.js
// Temporary unified AI engine shim so webhook controllers don't crash.
// You can later replace this with a richer Groq-based implementation.

console.log("✅ unifiedAIEngine shim loaded");

/**
 * Main processing engine (original)
 */
export async function processIncomingMessage(context = {}) {
  const {
    platform = "unknown",
    userMessage = "",
    businessName = "this business",
  } = context;

  // Safe generic fallback reply
  const baseReply =
    "Thanks for reaching out! Our assistant has received your message and someone will follow up shortly.";

  if (!userMessage) {
    return baseReply;
  }

  return [
    `Hi! 👋 Thanks for messaging ${businessName}.`,
    "",
    "I'm an automated assistant. I’ve received your message:",
    `"${userMessage}"`,
    "",
    "We'll get back to you shortly with more details.",
  ].join("\n");
}

/**
 * ALIAS → facebookController, whatsappController and others expect this.
 * Simply reuses the existing logic.
 */
export async function getUnifiedAIReply(context = {}) {
  return processIncomingMessage(context);
}

/**
 * Default export (kept for backward compatibility)
 */
export default {
  processIncomingMessage,
  getUnifiedAIReply,
};
