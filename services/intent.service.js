/*
========================================
INTENT SERVICE
========================================
*/

export const INTENTS = {
  GREETING: "greeting",
  GOODBYE: "goodbye",
  THANKS: "thanks",
  BOOKING: "booking",
  PRICING: "pricing",
  LOCATION: "location",
  CONTACT: "contact",
  SUPPORT: "support",
  LEAD: "lead",
  GENERAL: "general",
};

/*
========================================
KEYWORDS
========================================
*/

const KEYWORDS = {
  [INTENTS.GREETING]: [
    "hi",
    "hello",
    "hey",
    "good morning",
    "good afternoon",
    "good evening",
    "greetings",
    "hii",
    "helo",
  ],

  [INTENTS.GOODBYE]: [
    "bye",
    "goodbye",
    "see you",
    "take care",
    "later",
    "farewell",
  ],

  [INTENTS.THANKS]: [
    "thanks",
    "thank you",
    "thankyou",
    "thx",
    "ty",
    "much appreciated",
  ],

  [INTENTS.BOOKING]: [
    "book",
    "booking",
    "appointment",
    "meeting",
    "schedule",
    "demo",
    "consultation",
    "consult",
    "call",
    "zoom",
    "google meet",
    "teams",
    "calendly",
    "reserve",
    "slot",
  ],

  [INTENTS.PRICING]: [
    "price",
    "pricing",
    "cost",
    "fee",
    "fees",
    "charges",
    "quote",
    "quotation",
    "subscription",
    "plan",
    "plans",
    "package",
    "packages",
  ],

  [INTENTS.LOCATION]: [
    "location",
    "address",
    "where",
    "map",
    "maps",
    "directions",
    "office",
    "located",
  ],

  [INTENTS.CONTACT]: [
    "phone",
    "mobile",
    "telephone",
    "email",
    "contact",
    "reach",
    "number",
    "whatsapp",
  ],

  [INTENTS.SUPPORT]: [
    "problem",
    "issue",
    "bug",
    "error",
    "support",
    "help",
    "not working",
    "failed",
    "failure",
    "broken",
    "unable",
  ],

  [INTENTS.LEAD]: [
    "interested",
    "buy",
    "purchase",
    "need",
    "looking for",
    "want",
    "looking to",
    "can you provide",
    "can i get",
  ],
};

/*
========================================
MATCH KEYWORD
========================================
*/

const matchesKeyword = (
  text,
  keyword
) => {
  if (keyword.includes(" ")) {
    return text.includes(keyword);
  }

  const escaped = keyword.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  const regex = new RegExp(
    `\\b${escaped}\\b`,
    "i"
  );

  return regex.test(text);
};

/*
========================================
DETECT INTENT
========================================
*/

export const detectIntent = (
  message = ""
) => {
  const text = String(message)
    .trim()
    .toLowerCase();

  if (!text) {
    return INTENTS.GENERAL;
  }

  /*
  ========================================
  PRIORITY ORDER
  Higher priority intents are checked first.
  ========================================
  */

  const priority = [
    INTENTS.BOOKING,
    INTENTS.PRICING,
    INTENTS.SUPPORT,
    INTENTS.CONTACT,
    INTENTS.LOCATION,
    INTENTS.LEAD,
    INTENTS.THANKS,
    INTENTS.GOODBYE,
    INTENTS.GREETING,
  ];

  for (const intent of priority) {
    const keywords =
      KEYWORDS[intent] || [];

    const matched =
      keywords.some((keyword) =>
        matchesKeyword(
          text,
          keyword
        )
      );

    if (matched) {
      return intent;
    }
  }

  return INTENTS.GENERAL;
};