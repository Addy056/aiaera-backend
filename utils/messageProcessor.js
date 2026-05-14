import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
CHECK DUPLICATE MESSAGE
========================================
*/
export const isDuplicateMessage =
  async (messageId) => {

    const {
      data,
    } = await supabase
      .from(
        "messages_handled"
      )
      .select("id")
      .eq(
        "message_id",
        messageId
      )
      .single();

    return !!data;
  };

/*
========================================
MARK MESSAGE HANDLED
========================================
*/
export const markMessageHandled =
  async (messageId) => {

    await supabase
      .from(
        "messages_handled"
      )
      .insert([
        {
          message_id:
            messageId,
        },
      ]);
  };

/*
========================================
SAVE LEAD
========================================
*/
export const saveLead =
  async ({
    user_id,
    chatbot_id,
    name,
    phone,
    message,
  }) => {

    try {

      await supabase
        .from("leads")
        .insert([
          {
            user_id,
            chatbot_id,

            name:
              name || "WhatsApp User",

            email:
              `${phone}@whatsapp.com`,

            message,
          },
        ]);

    } catch (err) {

      console.error(
        "SAVE LEAD ERROR:",
        err.message
      );
    }
  };