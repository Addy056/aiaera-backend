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

      const { id } = req.params;

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
      if (error || !data) {
        return res.status(404).json({
          success: false,
          error:
            "Chatbot not found",
        });
      }

      /*
      ========================================
      SUCCESS RESPONSE
      ========================================
      */
      return res.status(200).json({
        success: true,

        chatbot: {
          id: data.id,
          name: data.name,
          business_info:
            data.business_info,
          website_url:
            data.website_url,
          theme:
            data.theme,
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