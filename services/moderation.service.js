/*
========================================
MODERATION SERVICE
Basic moderation for user messages.
========================================
*/

const MAX_REPEAT_CHARACTERS = 15;

const SPAM_PATTERNS = [
  /(.)\1{15,}/i,                     // aaaaaaaaaaaaaaaa
  /(https?:\/\/\S+){3,}/i,           // many links
];

const ABUSIVE_PATTERNS = [
  /\b(fuck|fucking|motherfucker)\b/i,
  /\b(shit|bullshit)\b/i,
  /\b(bitch|bastard|asshole)\b/i,
];

function clean(text = "") {
  return String(text)
    .replace(/\s+/g, " ")
    .trim();
}

export function moderateMessage(message = "") {
  const input = clean(message);

  if (!input) {
    return {
      allowed: false,
      reason: "Empty message",
      reply: "Please enter a message.",
    };
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(input)) {
      return {
        allowed: false,
        reason: "Spam detected",
        reply:
          "Your message looks like spam. Please send a normal question.",
      };
    }
  }

  for (const pattern of ABUSIVE_PATTERNS) {
    if (pattern.test(input)) {
      return {
        allowed: true,
        reason: "Abusive language",
        sanitizedMessage: input,
      };
    }
  }

  return {
    allowed: true,
    reason: null,
    sanitizedMessage: input,
  };
}