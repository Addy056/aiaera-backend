import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
CHECK DUPLICATE MESSAGE
========================================
*/
export const isDuplicateMessage =
  async (messageId) => {

    try {

      const {
        data,
        error,
      } = await supabase
        .from("processed_messages")
        .select("id")
        .eq(
          "message_id",
          messageId
        )
        .maybeSingle();

      if (error) {

        console.error(
          "CHECK DUPLICATE ERROR:",
          error
        );

        return false;
      }

      return !!data;

    } catch (err) {

      console.error(
        "CHECK DUPLICATE EXCEPTION:",
        err
      );

      return false;
    }
  };

/*
========================================
MARK MESSAGE HANDLED
========================================
*/
export const markMessageHandled =
  async (messageId) => {

    try {

      const {
        error,
      } = await supabase
        .from("processed_messages")
        .insert([
          {
            message_id:
              messageId,
          },
        ]);

      if (error) {

        console.error(
          "MARK MESSAGE ERROR:",
          error
        );

        return false;
      }

      console.log(
        "✅ Message marked as handled."
      );

      return true;

    } catch (err) {

      console.error(
        "MARK MESSAGE EXCEPTION:",
        err
      );

      return false;
    }
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

      const {
        error,
      } = await supabase
        .from("leads")
        .insert([
          {
            user_id,

            chatbot_id,

            name:
              name ||
              "WhatsApp User",

            email:
              phone
                ? `${phone}@whatsapp.com`
                : null,

            phone,

            message,
          },
        ]);

      if (error) {

        console.error(
          "SAVE LEAD ERROR:",
          error
        );

        return false;
      }

      console.log(
        "✅ Lead saved successfully."
      );

      return true;

    } catch (err) {

      console.error(
        "SAVE LEAD EXCEPTION:",
        err
      );

      return false;
    }
  };