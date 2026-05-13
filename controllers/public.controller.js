import { supabase } from "../config/supabaseClient.js";

/*
========================================
GET PUBLIC CHATBOT
========================================
Used By:
- Website Widget
- Public Chatbot Page
- External Integrations
========================================
*/

export const getPublicChatbot =
  async (req, res) => {

    try {

      const { id } =
        req.params;

      /*
      ========================================
      VALIDATION
      ========================================
      */
      if (!id) {

        return res.status(400).json({
          success: false,
          error:
            "Chatbot ID is required",
        });
      }

      /*
      ========================================
      FETCH CHATBOT
      ========================================
      */
      const {
        data,
        error,
      } = await supabase
        .from("chatbots")
        .select(`
          id,
          name,
          bot_name,
          business_info,
          website_url,
          theme
        `)
        .eq("id", id)
        .single();

      /*
      ========================================
      NOT FOUND
      ========================================
      */
      if (
        error ||
        !data
      ) {

        console.error(
          "CHATBOT FETCH ERROR:",
          error
        );

        return res.status(404).json({
          success: false,
          error:
            "Chatbot not found",
        });
      }

      /*
      ========================================
      THEME
      ========================================
      */
      const theme =
        data.theme || {};

      /*
      ========================================
      FIX LOGO
      ========================================
      */
      const logoUrl =
        theme.logo || "";

      /*
      ========================================
      FIX BOT NAME
      ========================================
      */
      const botName =
        data.bot_name ||
        data.name ||
        theme.botName ||
        "AI Assistant";

      /*
      ========================================
      DEBUG LOGS
      ========================================
      */
      console.log(
        "PUBLIC CHATBOT:",
        {
          id:
            data.id,

          botName,

          logoUrl,

          theme,
        }
      );

      /*
      ========================================
      SUCCESS RESPONSE
      ========================================
      */
      return res.status(200).json({
        success: true,

        chatbot: {
          /*
          ========================================
          BASIC INFO
          ========================================
          */
          id:
            data.id,

          name:
            data.name ||

            "AI Assistant",

          bot_name:
            botName,

          business_info:
            data.business_info ||

            "",

          website_url:
            data.website_url ||

            "",

          /*
          ========================================
          FIXED LOGO
          ========================================
          */
          logo_url:
            logoUrl,

          /*
          ========================================
          THEME
          ========================================
          */
          theme: {
            botName,

            logo:
              logoUrl,

            chatBg:
              theme.chatBg ||
              "#161126",

            botBubble:
              theme.botBubble ||
              "rgba(255,255,255,0.06)",

            userBubble:
              theme.userBubble ||
              "#7f5af0",

            textColor:
              theme.textColor ||
              "#ffffff",

            radius:
              theme.radius ||
              "lg",
          },
        },
      });

    } catch (err) {

      console.error(
        "PUBLIC CHATBOT ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to load chatbot",
      });
    }
  };