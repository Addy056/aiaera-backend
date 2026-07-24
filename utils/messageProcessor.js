import { supabase } from "../config/supabaseClient.js";

/*
========================================
CHECK DUPLICATE MESSAGE
========================================
*/
export const isDuplicateMessage = async (
  messageId
) => {
  try {
    if (!messageId) {
      return false;
    }

    const { data, error } = await supabase
      .from("processed_messages")
      .select("id")
      .eq("message_id", messageId)
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
  async ({
    messageId,
    platform = "website",
    senderId = null,
    chatbotId = null,
    metadata = null,
  }) => {
    try {
      if (!messageId) {
        return false;
      }

      const { error } = await supabase
        .from("processed_messages")
        .upsert(
          {
            message_id: messageId,
            platform,
            sender_id: senderId,
            chatbot_id: chatbotId,
            metadata,
          },
          {
            onConflict: "message_id",
          }
        );

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
export const saveLead = async ({
  user_id,
  chatbot_id,
  name = null,
  email = null,
  phone = null,
  message = null,
  source = "website",
  metadata = null,
}) => {
  try {
    /*
    ========================================
    VALIDATION
    ========================================
    */
    if (!user_id || !chatbot_id) {
      console.error(
        "SAVE LEAD ERROR: Missing user_id or chatbot_id."
      );

      return false;
    }

    /*
    ========================================
    CHECK EXISTING LEAD
    ========================================
    */
    let existingLead = null;

    if (phone) {
      const { data } = await supabase
        .from("leads")
        .select("id")
        .eq("chatbot_id", chatbot_id)
        .eq("phone", phone)
        .maybeSingle();

      existingLead = data;
    } else if (email) {
      const { data } = await supabase
        .from("leads")
        .select("id")
        .eq("chatbot_id", chatbot_id)
        .eq("email", email)
        .maybeSingle();

      existingLead = data;
    }

       /*
    ========================================
    UPDATE EXISTING LEAD
    ========================================
    */
    if (existingLead) {
      const {
        data: updatedLead,
        error,
      } = await supabase
        .from("leads")
        .update({
          name,
          email,
          phone,
          message,
          source,
          metadata,
          updated_at: new Date().toISOString(),
        })
        .eq(
          "id",
          existingLead.id
        )
        .select()
        .single();

      if (error) {
        console.error(
          "UPDATE LEAD ERROR:",
          error
        );

        return false;
      }

      console.log(
        "✅ Existing lead updated."
      );

      return updatedLead;
    }

    /*
    ========================================
    CREATE NEW LEAD
    ========================================
    */
    const {
      data,
      error,
    } = await supabase
      .from("leads")
      .insert([
        {
          user_id,
          chatbot_id,
          name,
          email,
          phone,
          message,
          source,
          metadata,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(
        "SAVE LEAD ERROR:",
        error
      );

      return false;
    }

    console.log(
      "✅ New lead created."
    );

    return data;

  } catch (err) {
    console.error(
      "SAVE LEAD EXCEPTION:",
      err
    );

    console.error(
      err?.stack
    );

    return false;
  }
};