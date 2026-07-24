import {
  generateAIReply as generateGroqReply,
} from "./groq.service.js";

import {
  supabase,
} from "../config/supabaseClient.js";

import {
  buildSystemPrompt,
} from "./prompt.service.js";

import {
  getConversationHistory,
  saveMessage,
  trimConversationHistory,
} from "./conversation.service.js";

import {
  detectIntent,
} from "./intent.service.js";

import {
  applyReplyRules,
} from "./replyRules.service.js";

/*
========================================
HELPERS
========================================
*/

const clean = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .trim();

/*
========================================
GENERATE AI REPLY
========================================
*/

export const generateAIReply = async ({
  message,
  chatbot_id,
  session_id,
}) => {
  try {
    const userMessage =
      clean(message);

    if (
      !chatbot_id ||
      !session_id ||
      !userMessage
    ) {
      return "Invalid request.";
    }

    /*
    ========================================
    GET CHATBOT
    ========================================
    */

    const {
      data: chatbot,
      error: chatbotError,
    } = await supabase
      .from("chatbots")
      .select("*")
      .eq(
        "id",
        chatbot_id
      )
      .single();

    if (
      chatbotError ||
      !chatbot
    ) {
      console.error(
        "CHATBOT ERROR:",
        chatbotError
      );

      return "Chatbot not found.";
    }

    /*
    ========================================
    GET USER INTEGRATIONS
    ========================================
    */

    const {
      data: integrations,
      error: integrationError,
    } = await supabase
      .from("user_integrations")
      .select(`
        maps_link,
        meeting_provider,
        meeting_link
      `)
      .eq(
        "user_id",
        chatbot.user_id
      )
      .maybeSingle();

    if (integrationError) {
      console.error(
        "INTEGRATION ERROR:",
        integrationError
      );
    }

    /*
    ========================================
    BUILD SYSTEM PROMPT
    ========================================
    */

    const systemPrompt =
      buildSystemPrompt({
        chatbot,
        integrations:
          integrations || {},
      });

    /*
    ========================================
    DETECT USER INTENT
    ========================================
    */

    const intent =
      detectIntent(
        userMessage
      );

    console.log(
      "Detected Intent:",
      intent
    );

    /*
    ========================================
    LOAD CONVERSATION HISTORY

    IMPORTANT:
    Load history BEFORE saving the
    current user message so the
    current message isn't sent twice
    to the LLM.
    ========================================
    */

    const history =
      await getConversationHistory(
        session_id
      );

    /*
    ========================================
    SAVE USER MESSAGE
    ========================================
    */

    await saveMessage({
      chatbotId:
        chatbot_id,
      sessionId:
        session_id,
      role: "user",
      message:
        userMessage,
    });

    /*
    ========================================
    GENERATE AI RESPONSE
    ========================================
    */

    let reply =
      await generateGroqReply({
        systemPrompt,
        userMessage,
        history,
      });

    if (
      !reply ||
      !reply.trim()
    ) {
      reply =
        "I'm sorry, I couldn't generate a response at the moment.";
    }

    reply =
      reply.trim();
          /*
    ========================================
    APPLY REPLY RULES
    ========================================
    */

    reply = applyReplyRules({
      reply,
      history,
      intent,
    });

    /*
    ========================================
    FINAL CLEANUP
    ========================================
    */

    reply = clean(reply);

    if (!reply) {
      reply =
        "I'm sorry, I couldn't generate a response at the moment.";
    }

    /*
    ========================================
    SAVE ASSISTANT MESSAGE
    ========================================
    */

  const shouldSave =
  reply !== "I'm sorry, I couldn't generate a response at the moment." &&
  reply !== "Sorry, chatbot is temporarily unavailable. Please try again in a few moments.";

if (shouldSave) {
  await saveMessage({
    chatbotId: chatbot_id,
    sessionId: session_id,
    role: "assistant",
    message: reply,
  });
}
    /*
    ========================================
    TRIM CONVERSATION HISTORY
    ========================================
    */

    await trimConversationHistory(
      session_id
    );

    /*
    ========================================
    LOGGING
    ========================================
    */

    console.log(
      "AI Reply Generated Successfully"
    );

    console.log({
      chatbotId:
        chatbot_id,
      sessionId:
        session_id,
      intent,
      historyMessages:
        history.length,
    });

    /*
    ========================================
    RETURN RESPONSE
    ========================================
    */

    return reply;

  } catch (err) {

    console.error(
      "AI REPLY SERVICE ERROR:"
    );

    console.error(err);

    console.error(
      err?.stack
    );

    return "Sorry, AI is temporarily unavailable. Please try again in a few moments.";
  }
};