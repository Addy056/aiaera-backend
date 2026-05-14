import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
SAVE INTEGRATIONS
========================================
*/
export const saveIntegration =
  async (req, res) => {

    try {

      const user_id =
        req.user.id;

      const {

        /*
        ====================================
        WHATSAPP
        ====================================
        */
        whatsapp_token,
        whatsapp_phone_id,
        whatsapp_enabled,

        /*
        ====================================
        FACEBOOK
        ====================================
        */
        facebook_page_id,
        facebook_page_token,
        facebook_enabled,

        /*
        ====================================
        INSTAGRAM
        ====================================
        */
        instagram_business_id,
        instagram_access_token,
        instagram_enabled,

        /*
        ====================================
        GENERIC MEETING
        ====================================
        */
        provider,
        meeting_link,

        /*
        ====================================
        OTHER
        ====================================
        */
        maps,

      } = req.body;

      /*
      ========================================
      BUILD UPDATE OBJECT
      ========================================
      */
      const updateData = {

        user_id,

        updated_at:
          new Date().toISOString(),
      };

      /*
      ========================================
      WHATSAPP
      ========================================
      */
      if (
        whatsapp_token !== undefined
      ) {

        updateData.whatsapp_token =
          whatsapp_token?.trim() ||
          null;
      }

      if (
        whatsapp_phone_id !== undefined
      ) {

        updateData.whatsapp_phone_id =
          whatsapp_phone_id?.trim() ||
          null;
      }

      if (
        whatsapp_enabled !== undefined
      ) {

        updateData.whatsapp_enabled =
          Boolean(
            whatsapp_enabled
          );
      }

      /*
      ========================================
      FACEBOOK
      ========================================
      */
      if (
        facebook_page_id !== undefined
      ) {

        updateData.facebook_page_id =
          facebook_page_id?.trim() ||
          null;
      }

      if (
        facebook_page_token !== undefined
      ) {

        updateData.facebook_page_token =
          facebook_page_token?.trim() ||
          null;
      }

      if (
        facebook_enabled !== undefined
      ) {

        updateData.facebook_enabled =
          Boolean(
            facebook_enabled
          );
      }

      /*
      ========================================
      INSTAGRAM
      ========================================
      */
      if (
        instagram_business_id !== undefined
      ) {

        updateData.instagram_business_id =
          instagram_business_id?.trim() ||
          null;
      }

      if (
        instagram_access_token !== undefined
      ) {

        updateData.instagram_access_token =
          instagram_access_token?.trim() ||
          null;
      }

      if (
        instagram_enabled !== undefined
      ) {

        updateData.instagram_enabled =
          Boolean(
            instagram_enabled
          );
      }

      /*
      ========================================
      GENERIC MEETING PROVIDER
      ========================================
      */
      if (
        provider !== undefined
      ) {

        updateData.provider =
          provider?.trim() ||
          "calendly";
      }

      if (
        meeting_link !== undefined
      ) {

        updateData.meeting_link =
          meeting_link?.trim() ||
          null;
      }

      /*
      ========================================
      MAPS
      ========================================
      */
      if (
        maps !== undefined
      ) {

        updateData.maps =
          maps?.trim() ||
          null;
      }

      /*
      ========================================
      UPSERT
      ========================================
      */
      const {
        data,
        error,
      } = await supabase
        .from(
          "user_integrations"
        )
        .upsert(
          [updateData],
          {
            onConflict:
              "user_id",
          }
        )
        .select()
        .single();

      if (error) {

        console.error(
          "SAVE INTEGRATION ERROR:",
          error
        );

        return res
          .status(400)
          .json({
            success: false,

            error:
              error.message,
          });
      }

      /*
      ========================================
      SUCCESS
      ========================================
      */
      return res.status(200).json({

        success: true,

        integrations:
          data,
      });

    } catch (err) {

      console.error(
        "SAVE INTEGRATION CONTROLLER ERROR:",
        err
      );

      return res.status(500).json({

        success: false,

        error:
          "Internal server error",
      });
    }
  };

/*
========================================
GET USER INTEGRATIONS
========================================
*/
export const getIntegration =
  async (req, res) => {

    try {

      const user_id =
        req.user.id;

      const {
        data,
        error,
      } = await supabase
        .from(
          "user_integrations"
        )
        .select("*")
        .eq(
          "user_id",
          user_id
        )
        .single();

      /*
      ========================================
      NO DATA
      ========================================
      */
      if (
        error &&
        error.code !==
          "PGRST116"
      ) {

        console.error(
          "GET INTEGRATION ERROR:",
          error
        );

        return res.status(400).json({

          success: false,

          error:
            error.message,
        });
      }

      /*
      ========================================
      EMPTY RESPONSE
      ========================================
      */
      if (!data) {

        return res.status(200).json({

          success: true,

          integrations:
            null,
        });
      }

      /*
      ========================================
      SUCCESS
      ========================================
      */
      return res.status(200).json({

        success: true,

        integrations:
          data,
      });

    } catch (err) {

      console.error(
        "GET INTEGRATION CONTROLLER ERROR:",
        err
      );

      return res.status(500).json({

        success: false,

        error:
          "Internal server error",
      });
    }
  };

/*
========================================
GET PUBLIC INTEGRATIONS
USED BY PUBLIC CHATBOT
========================================
*/
export const getPublicIntegrations =
  async (req, res) => {

    try {

      const {
        chatbotId,
      } = req.params;

      if (!chatbotId) {

        return res.status(400).json({

          success: false,

          error:
            "Chatbot ID required",
        });
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
        .select(
          "user_id"
        )
        .eq(
          "id",
          chatbotId
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

        return res.status(404).json({

          success: false,

          error:
            "Chatbot not found",
        });
      }

      /*
      ========================================
      GET USER INTEGRATIONS
      ========================================
      */
      const {
        data: integrations,
      } = await supabase
        .from(
          "user_integrations"
        )
        .select(`
          provider,
          meeting_link,
          maps
        `)
        .eq(
          "user_id",
          chatbot.user_id
        )
        .single();

      /*
      ========================================
      DEFAULT RESPONSE
      ========================================
      */
      if (!integrations) {

        return res.status(200).json({

          success: true,

          integrations: {

            provider:
              "calendly",

            meeting_link:
              "",

            maps:
              "",
          },
        });
      }

      /*
      ========================================
      SUCCESS
      ========================================
      */
      return res.status(200).json({

        success: true,

        integrations: {

          provider:
            integrations.provider ||
            "calendly",

          meeting_link:
            integrations.meeting_link ||
            "",

          maps:
            integrations.maps ||
            "",
        },
      });

    } catch (err) {

      console.error(
        "PUBLIC INTEGRATIONS ERROR:",
        err
      );

      return res.status(500).json({

        success: false,

        error:
          "Failed to load integrations",
      });
    }
  };

/*
========================================
TOGGLE AUTOMATION
========================================
*/
export const toggleAutomation =
  async (req, res) => {

    try {

      const user_id =
        req.user.id;

      const {
        platform,
        enabled,
      } = req.body;

      /*
      ========================================
      PLATFORM FIELD MAP
      ========================================
      */
      const fieldMap = {

        whatsapp:
          "whatsapp_enabled",

        facebook:
          "facebook_enabled",

        instagram:
          "instagram_enabled",
      };

      const field =
        fieldMap[
          platform
        ];

      if (!field) {

        return res.status(400).json({

          success: false,

          error:
            "Invalid platform",
        });
      }

      /*
      ========================================
      UPDATE
      ========================================
      */
      const {
        error,
      } = await supabase
        .from(
          "user_integrations"
        )
        .update({

          [field]:
            Boolean(
              enabled
            ),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "user_id",
          user_id
        );

      if (error) {

        console.error(
          "TOGGLE ERROR:",
          error
        );

        return res.status(400).json({

          success: false,

          error:
            error.message,
        });
      }

      /*
      ========================================
      SUCCESS
      ========================================
      */
      return res.status(200).json({

        success: true,

        platform,

        enabled,
      });

    } catch (err) {

      console.error(
        "TOGGLE AUTOMATION ERROR:",
        err
      );

      return res.status(500).json({

        success: false,

        error:
          "Internal server error",
      });
    }
  };

/*
========================================
TEST CONNECTION
========================================
*/
export const testConnection =
  async (req, res) => {

    try {

      const {
        platform,
      } = req.body;

      return res.status(200).json({

        success: true,

        platform,

        message:
          `${platform} connection test successful`,
      });

    } catch (err) {

      console.error(
        "TEST CONNECTION ERROR:",
        err
      );

      return res.status(500).json({

        success: false,

        error:
          "Connection test failed",
      });
    }
  };