/*
========================================
INPUT SAFETY SERVICE
Protects the AI against prompt injection
and jailbreak attempts.
========================================
*/

const MAX_MESSAGE_LENGTH = 3000;

const BLOCKED_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /ignore\s+your\s+instructions?/i,
  /forget\s+(all\s+)?previous\s+instructions?/i,
  /forget\s+your\s+system\s+prompt/i,
  /system\s+prompt/i,
  /hidden\s+prompt/i,
  /developer\s+message/i,
  /developer\s+mode/i,
  /\bDAN\b/i,
  /jailbreak/i,
  /act\s+as\s+chatgpt/i,
  /act\s+as\s+an?\s+ai/i,
  /you\s+are\s+now/i,
  /reveal\s+your\s+instructions/i,
  /show\s+your\s+instructions/i,
  /repeat\s+your\s+instructions/i,
  /print\s+your\s+prompt/i,
  /reveal\s+internal/i,
  /ignore\s+safety/i,
];

const SAFE_REPLY =
  "I'm here to help answer questions about this business. How can I assist you today?";

function clean(text = "") {
  return String(text)
    .replace(/\s+/g, " ")
    .trim();
}

export function checkInputSafety(message = "") {
  const input = clean(message);

  if (!input) {
    return {
      isSafe: false,
      reason: "Empty message",
      safeReply: "Please enter a message.",
      sanitizedMessage: "",
    };
  }

  if (input.length > MAX_MESSAGE_LENGTH) {
    return {
      isSafe: false,
      reason: "Message too long",
      safeReply:
        "Your message is too long. Please shorten it and try again.",
      sanitizedMessage: input.slice(0, MAX_MESSAGE_LENGTH),
    };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input)) {
      return {
        isSafe: false,
        reason: "Prompt injection detected",
        safeReply: SAFE_REPLY,
        sanitizedMessage: input,
      };
    }
  }

  return {
    isSafe: true,
    reason: null,
    safeReply: null,
    sanitizedMessage: input,
  };
}