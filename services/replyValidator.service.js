/*
========================================
REPLY VALIDATOR SERVICE
Validates AI replies before they are
sent to the customer.
========================================
*/

const MAX_REPLY_LENGTH = 2000;

const FALLBACK_REPLY =
  "I'm sorry, I couldn't generate a proper response. Could you please rephrase your question?";

const BLOCKED_PATTERNS = [
  /system prompt/i,
  /developer message/i,
  /internal instruction/i,
  /ignore previous instructions/i,
  /hidden prompt/i,
];

function clean(text = "") {
  return String(text)
    .replace(/\s+/g, " ")
    .trim();
}

export function validateAIReply(reply = "") {
  let text = clean(reply);

  if (!text) {
    return {
      valid: false,
      reply: FALLBACK_REPLY,
      reason: "Empty reply",
    };
  }

  if (text.length > MAX_REPLY_LENGTH) {
    text = text.slice(0, MAX_REPLY_LENGTH).trim();
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return {
        valid: false,
        reply: FALLBACK_REPLY,
        reason: "Internal information detected",
      };
    }
  }

  return {
    valid: true,
    reply: text,
    reason: null,
  };
}