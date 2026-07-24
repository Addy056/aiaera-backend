import { supabase } from "../config/supabaseClient.js";

const MAX_HISTORY_MESSAGES = 20;

const VALID_ROLES = [
  "user",
  "assistant",
  "system",
];

const clean = (value = "") =>
  String(value)
    .replace(/\s+/g, " ")
    .trim();

/*
========================================
GET CONVERSATION HISTORY
========================================
*/

export const getConversationHistory = async (
  sessionId,
  limit = MAX_HISTORY_MESSAGES
) => {
  try {
    const id = clean(sessionId);

    if (!id) {
      return [];
    }

    const {
      data,
      error,
    } = await supabase
      .from("chat_messages")
      .select(`
        role,
        message,
        created_at
      `)
      .eq(
        "session_id",
        id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(
  Math.max(
    1,
    Number(limit) || MAX_HISTORY_MESSAGES
  )
);

    if (error) {
      console.error(
        "GET CONVERSATION ERROR:",
        error
      );

      return [];
    }

    return (data || [])
      .reverse()
      .map((item) => ({
        role: item.role,
        content: item.message,
      }));
  } catch (err) {
    console.error(
      "CONVERSATION SERVICE ERROR:",
      err
    );

    console.error(
      err?.stack
    );

    return [];
  }
};

/*
========================================
SAVE MESSAGE
========================================
*/

export const saveMessage = async ({
  chatbotId,
  sessionId,
  role,
  message,
}) => {
  try {
    const chatbot =
      clean(chatbotId);

    const session =
      clean(sessionId);

    const text =
      clean(message);

    const messageRole =
      clean(role).toLowerCase();

    if (
      !chatbot ||
      !session ||
      !text ||
      !VALID_ROLES.includes(messageRole)
    ) {
      return false;
    }

    const { error } =
      await supabase
        .from("chat_messages")
        .insert({
          chatbot_id: chatbot,
          session_id: session,
          role: messageRole,
          message: text,
        });

    if (error) {
      console.error(
        "SAVE MESSAGE ERROR:",
        error
      );

      return false;
    }

    return true;
  } catch (err) {
    console.error(
      "SAVE MESSAGE SERVICE ERROR:",
      err
    );

    console.error(
      err?.stack
    );

    return false;
  }
};

/*
========================================
DELETE OLD HISTORY
========================================
*/

export const trimConversationHistory =
  async (
    sessionId,
    keepLast = MAX_HISTORY_MESSAGES
  ) => {
    try {
      const id =
        clean(sessionId);

      if (!id) {
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("chat_messages")
        .select("id")
        .eq(
          "session_id",
          id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          "TRIM CONVERSATION ERROR:",
          error
        );

        return;
      }

      if (
        !data ||
        data.length <= keepLast
      ) {
        return;
      }

      const idsToDelete =
        data
          .slice(keepLast)
          .map(
            (row) => row.id
          );

      if (
        !idsToDelete.length
      ) {
        return;
      }

      const {
        error: deleteError,
      } = await supabase
        .from("chat_messages")
        .delete()
        .in(
          "id",
          idsToDelete
        );

      if (deleteError) {
        console.error(
          "DELETE HISTORY ERROR:",
          deleteError
        );
      }
    } catch (err) {
      console.error(
        "TRIM CONVERSATION SERVICE ERROR:",
        err
      );

      console.error(
        err?.stack
      );
    }
  };

/*
========================================
CLEAR CONVERSATION
========================================
*/

export const clearConversation =
  async (
    sessionId
  ) => {
    try {
      const id =
        clean(sessionId);

      if (!id) {
        return false;
      }

      const {
        error,
      } = await supabase
        .from("chat_messages")
        .delete()
        .eq(
          "session_id",
          id
        );

      if (error) {
        console.error(
          "CLEAR CONVERSATION ERROR:",
          error
        );

        return false;
      }

      return true;
    } catch (err) {
      console.error(
        "CLEAR CONVERSATION SERVICE ERROR:",
        err
      );

      console.error(
        err?.stack
      );

      return false;
    }
  };