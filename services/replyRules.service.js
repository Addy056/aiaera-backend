/*
========================================
REPLY RULES SERVICE
========================================
*/

const MAX_REPLY_LENGTH = 1200;

/*
========================================
HELPERS
========================================
*/

const normalizeWhitespace = (
  text = ""
) =>
  text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const GREETINGS = [
  "hi",
  "hello",
  "hey",
  "good morning",
  "good afternoon",
  "good evening",
];

const startsWithGreeting = (
  text = ""
) => {

  const lower =
    text
      .trim()
      .toLowerCase();

  return GREETINGS.some(
    (greeting) =>
      lower === greeting ||
      lower.startsWith(
        `${greeting} `
      ) ||
      lower.startsWith(
        `${greeting},`
      ) ||
      lower.startsWith(
        `${greeting}!`
      )
  );
};

/*
========================================
REMOVE REPEATED GREETING
========================================
*/

const removeRepeatedGreeting = (
  reply,
  history = []
) => {

  const assistantMessages =
    history.filter(
      (item) =>
        item.role ===
        "assistant"
    );

  if (
    !assistantMessages.length ||
    !startsWithGreeting(reply)
  ) {
    return reply;
  }

  const greeted =
    assistantMessages.some(
      (item) =>
        startsWithGreeting(
          item.content
        )
    );

  if (!greeted) {
    return reply;
  }

  return reply
    .replace(
      /^(hi|hello|hey|good morning|good afternoon|good evening)[!,. ]*/i,
      ""
    )
    .trim();
};

/*
========================================
REMOVE REPEATED INTRODUCTION
========================================
*/

const removeRepeatedIntroduction =
  (reply) => {

    const phrases = [
      "I'm here to help",
      "I am here to help",
      "I'm happy to help",
      "I would be happy to help",
      "It's nice to meet you",
      "As your AI assistant",
      "I am your AI assistant",
    ];

    let cleaned = reply;

    for (const phrase of phrases) {

      let found = false;

      cleaned =
        cleaned.replace(
          new RegExp(
            phrase,
            "gi"
          ),
          () => {

            if (!found) {

              found = true;
              return phrase;

            }

            return "";
          }
        );
    }

    return cleaned;
  };

/*
========================================
REMOVE DUPLICATE PARAGRAPHS
========================================
*/

const removeDuplicateParagraphs =
  (reply) => {

    const paragraphs =
      reply
        .split("\n\n")
        .map((p) =>
          p.trim()
        );

    const unique = [];

    for (const paragraph of paragraphs) {

      if (
        !unique.includes(
          paragraph
        )
      ) {
        unique.push(
          paragraph
        );
      }
    }

    return unique.join(
      "\n\n"
    );
  };

/*
========================================
REMOVE BOOKING LINKS
========================================
*/

const shouldRemoveBooking =
  (intent) =>
    ![
      "booking",
      "lead",
    ].includes(intent);

const removeBookingSection =
  (reply) => {

    return reply

      .replace(
        /https?:\/\/\S+/gi,
        ""
      )

      .replace(
        /\b(calendly|zoom|google meet|google calendar|teams|microsoft teams)\b/gi,
        ""
      )

      .replace(
        /\b(book|booking|appointment|schedule a meeting|schedule your meeting)\b.*$/gim,
        ""
      );
  };

/*
========================================
PREVENT IDENTICAL REPLY
========================================
*/

const avoidDuplicateReply = (
  reply,
  history = []
) => {

  const lastAssistant =
    [...history]
      .reverse()
      .find(
        (m) =>
          m.role ===
          "assistant"
      );

  if (!lastAssistant) {
    return reply;
  }

  if (
    normalizeWhitespace(
      lastAssistant.content
    ) ===
    normalizeWhitespace(
      reply
    )
  ) {
    return `${reply}\n\nIs there anything else you'd like to know?`;
  }

  return reply;
};

/*
========================================
LIMIT RESPONSE LENGTH
========================================
*/

const trimLength =
  (reply) => {

    if (
      reply.length <=
      MAX_REPLY_LENGTH
    ) {
      return reply;
    }

    return (
      reply.slice(
        0,
        MAX_REPLY_LENGTH
      ) + "..."
    );
  };

/*
========================================
APPLY RULES
========================================
*/

export const applyReplyRules =
  ({
    reply,
    history = [],
    intent = "general",
  }) => {

    if (!reply) {
      return "";
    }

    let cleaned =
      normalizeWhitespace(
        reply
      );

    cleaned =
      removeRepeatedGreeting(
        cleaned,
        history
      );

    cleaned =
      removeRepeatedIntroduction(
        cleaned
      );

    cleaned =
      removeDuplicateParagraphs(
        cleaned
      );

    if (
      shouldRemoveBooking(
        intent
      )
    ) {
      cleaned =
        removeBookingSection(
          cleaned
        );
    }

    cleaned =
      avoidDuplicateReply(
        cleaned,
        history
      );

    cleaned =
      normalizeWhitespace(
        cleaned
      );

    cleaned =
      trimLength(
        cleaned
      );

    return cleaned;
  };