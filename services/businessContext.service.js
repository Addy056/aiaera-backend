import { supabase } from "../config/supabaseClient.js";

/*
========================================
HELPERS
========================================
*/

const clean = (value = "") =>
  typeof value === "string"
    ? value.trim()
    : "";

const bool = (value) => Boolean(value);

/*
========================================
GET BUSINESS CONTEXT
========================================
*/

export const getBusinessContext = async (
  chatbotId
) => {
  try {
    if (!chatbotId) {
      throw new Error(
        "Chatbot ID is required."
      );
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
      .select(`
        id,
        user_id,
        name,
        business_description,
        website,
        phone,
        email,
        timezone,
        language
      `)
      .eq("id", chatbotId)
      .single();

    if (chatbotError || !chatbot) {
      console.error(
        "CHATBOT ERROR:",
        chatbotError
      );

      return null;
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
        meeting_link,
        whatsapp_enabled,
        facebook_enabled,
        instagram_enabled
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
    GET CHATBOT FILES
    ========================================
    */

    const {
      data: files,
      error: filesError,
    } = await supabase
      .from("chatbot_files")
      .select(`
        id,
        chatbot_id,
        file_name,
        name,
        file_type,
        file_url,
        extracted_text,
        content,
        created_at
      `)
      .eq(
        "chatbot_id",
        chatbot.id
      );

    if (filesError) {
      console.error(
        "FILES ERROR:",
        filesError
      );
    }

    /*
    ========================================
    NORMALIZED BUSINESS
    ========================================
    */

    const business = {
      id: chatbot.id,

      userId: chatbot.user_id,

      name:
        clean(chatbot.name) ||
        "Business",

      description: clean(
        chatbot.business_description
      ),

      website: clean(
        chatbot.website
      ),

      phone: clean(
        chatbot.phone
      ),

      email: clean(
        chatbot.email
      ),

      mapsLink: clean(
        integrations?.maps_link
      ),

      address: clean(
        integrations?.maps_link
      ),

      meetingProvider: clean(
        integrations?.meeting_provider
      ),

      meetingLink: clean(
        integrations?.meeting_link
      ),

      timezone:
        clean(chatbot.timezone) ||
        "UTC",

      language:
        clean(chatbot.language) ||
        "English",

      whatsappEnabled: bool(
        integrations?.whatsapp_enabled
      ),

      facebookEnabled: bool(
        integrations?.facebook_enabled
      ),

      instagramEnabled: bool(
        integrations?.instagram_enabled
      ),
    };

    /*
    ========================================
    NORMALIZED KNOWLEDGE FILES
    ========================================
    */

    const knowledgeFiles = (files || [])
      .filter(Boolean)
      .map((file) => ({
        id: file.id,

        chatbotId:
          file.chatbot_id,

        fileName:
          clean(file.file_name) ||
          clean(file.name),

        fileType:
          clean(file.file_type),

        fileUrl:
          clean(file.file_url),

        extractedText:
          clean(file.extracted_text) ||
          clean(file.content),

        createdAt:
          file.created_at || null,
      }));

    /*
    ========================================
    RETURN CONTEXT
    ========================================
    */

    return {
      chatbot,

      integrations:
        integrations || {},

      files:
        knowledgeFiles,

      business,
    };
  } catch (err) {
    console.error(
      "BUSINESS CONTEXT ERROR:",
      err
    );

    console.error(
      err?.stack
    );

    return null;
  }
};