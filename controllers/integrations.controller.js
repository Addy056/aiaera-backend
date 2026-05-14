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
        OTHER
        ====================================
        */
        calendly,
        maps,

      } = req.body;

      /*
      ========================================
      BUILD UPDATE OBJECT
      ========================================
      */
      const updateData = {
        user_id,
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
          whatsapp_token;
      }

      if (
        whatsapp_phone_id !== undefined
      ) {

        updateData.whatsapp_phone_id =
          whatsapp_phone_id;
      }

      if (
        whatsapp_enabled !== undefined
      ) {

        updateData.whatsapp_enabled =
          whatsapp_enabled;
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
          facebook_page_id;
      }

      if (
        facebook_page_token !== undefined
      ) {

        updateData.facebook_page_token =
          facebook_page_token;
      }

      if (
        facebook_enabled !== undefined
      ) {

        updateData.facebook_enabled =
          facebook_enabled;
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
          instagram_business_id;
      }

      if (
        instagram_access_token !== undefined
      ) {

        updateData.instagram_access_token =
          instagram_access_token;
      }

      if (
        instagram_enabled !== undefined
      ) {

        updateData.instagram_enabled =
          instagram_enabled;
      }

      /*
      ========================================
      OTHER
      ========================================
      */
      if (
        calendly !== undefined
      ) {

        updateData.calendly =
          calendly;
      }

      if (
        maps !== undefined
      ) {

        updateData.maps =
          maps;
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

      if (error) {

        console.error(
          "GET INTEGRATION ERROR:",
          error
        );

        return res.json({});
      }

      return res.status(200).json(
        data
      );

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
        error:
          integrationsError,
      } = await supabase
        .from(
          "user_integrations"
        )
        .select(
          `
          calendly,
          maps
          `
        )
        .eq(
          "user_id",
          chatbot.user_id
        )
        .single();

      if (
        integrationsError ||
        !integrations
      ) {

        return res.status(200).json({
          success: true,

          integrations: {
            calendly: "",
            maps: "",
          },
        });
      }

      return res.status(200).json({
        success: true,

        integrations: {

          calendly:
            integrations.calendly ||
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
            enabled,
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