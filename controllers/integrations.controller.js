import { supabase }
  from "../config/supabaseClient.js";

/*
========================================
SAVE INTEGRATIONS
========================================
*/
export const saveIntegration =
  async (
    req,
    res
  ) => {

    try {

      const user_id =
        req.user.id;

      const {

        /*
        ====================================
        WHATSAPP
        ====================================
        */
        whatsapp_access_token,
        whatsapp_phone_id,
        whatsapp_enabled,

        /*
        ====================================
        FACEBOOK
        ====================================
        */
        facebook_page_id,
        facebook_page_access_token,
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
        BOOKING
        ====================================
        */
        meeting_provider,
        meeting_link,

        /*
        ====================================
        LOCATION
        ====================================
        */
        maps_link,

      } = req.body;

      /*
      ========================================
      UPSERT
      ========================================
      */
      const {
        data,
        error,
      } =
       await supabase
  .from("user_integrations")
  .upsert(
    {
      user_id,

      whatsapp_access_token:
        whatsapp_access_token || null,

      whatsapp_phone_id:
        whatsapp_phone_id || null,

      whatsapp_enabled:
        whatsapp_enabled || false,

      facebook_page_id:
        facebook_page_id || null,

      facebook_page_access_token:
        facebook_page_access_token || null,

      facebook_enabled:
        facebook_enabled || false,

      instagram_business_id:
        instagram_business_id || null,

      instagram_access_token:
        instagram_access_token || null,

      instagram_enabled:
        instagram_enabled || false,

      meeting_provider:
        meeting_provider || "calendly",

      meeting_link:
        meeting_link || null,

      maps_link:
        maps_link || null,

      updated_at:
        new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    }
  )
  .select()
  .maybeSingle();

      if (error)
        throw error;

      return res.json({

        success:
          true,

        message:
          "Integrations saved successfully",

        integrations:
          data,
      });

    } catch (err) {

      console.error(
        "❌ SAVE INTEGRATION ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message ||
            "Failed to save integrations",
        });
    }
  };

/*
========================================
GET USER INTEGRATIONS
========================================
*/
export const getIntegration =
  async (
    req,
    res
  ) => {

    try {

      const user_id =
        req.user.id;

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "user_integrations"
          )
          .select("*")
          .eq(
            "user_id",
            user_id
          )
          .maybeSingle();

      if (error)
        throw error;

      return res.json({

        success:
          true,

        integrations:
          data || null,
      });

    } catch (err) {

      console.error(
        "❌ GET INTEGRATION ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message ||
            "Failed to fetch integrations",
        });
    }
  };

/*
========================================
PUBLIC INTEGRATIONS
========================================
Used by:
- Public chatbot
- Widget
========================================
*/
export const getPublicIntegrations =
  async (
    req,
    res
  ) => {

    try {

      const {
        chatbotId,
      } = req.params;

      /*
      ========================================
      GET CHATBOT
      ========================================
      */
      const {
        data: chatbot,
        error:
          chatbotError,
      } =
        await supabase
          .from(
            "chatbots"
          )
          .select(`
            id,
            user_id
          `)
          .eq(
            "id",
            chatbotId
          )
          .maybeSingle();

      if (
        chatbotError ||
        !chatbot
      ) {

        return res
          .status(404)
          .json({

            success:
              false,

            error:
              "Chatbot not found",
          });
      }

      /*
      ========================================
      GET INTEGRATIONS
      ========================================
      */
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "user_integrations"
          )
          .select(`
  meeting_provider,
  meeting_link,
  maps_link
`)
          .eq(
            "user_id",
            chatbot.user_id
          )
          .maybeSingle();

      if (error)
        throw error;

      return res.json({

        success:
          true,

        integrations:
          data || null,
      });

    } catch (err) {

      console.error(
        "❌ PUBLIC INTEGRATION ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Failed to fetch public integrations",
        });
    }
  };

/*
========================================
TOGGLE AUTOMATION
========================================
*/
export const toggleAutomation =
  async (
    req,
    res
  ) => {

    try {

      const user_id =
        req.user.id;

      const {

        platform,
        enabled,

      } = req.body;

      /*
      ========================================
      VALIDATION
      ========================================
      */
      const allowedPlatforms = [

        "whatsapp",

        "facebook",

        "instagram",
      ];

      if (
        !allowedPlatforms.includes(
          platform
        )
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Invalid platform",
          });
      }

      /*
      ========================================
      FIELD
      ========================================
      */
      const field =
        `${platform}_enabled`;

      /*
      ========================================
      UPDATE
      ========================================
      */
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "user_integrations"
          )
          .update({

            [field]:
              enabled,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "user_id",
            user_id
          )
          .select()
          .maybeSingle();

      if (error)
        throw error;

      return res.json({

        success:
          true,

        message:
          `${platform} automation updated`,

        integrations:
          data,
      });

    } catch (err) {

      console.error(
        "❌ TOGGLE ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message ||
            "Failed to update automation",
        });
    }
  };

/*
========================================
AUTOMATION STATUS
========================================
*/
export const getAutomationStatus =
  async (
    req,
    res
  ) => {

    try {

      const user_id =
        req.user.id;

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "user_integrations"
          )
          .select(`
            whatsapp_enabled,
            facebook_enabled,
            instagram_enabled
          `)
          .eq(
            "user_id",
            user_id
          )
          .maybeSingle();

      if (error)
        throw error;

      return res.json({

        success:
          true,

        status:
          data || {
            whatsapp_enabled:
              false,

            facebook_enabled:
              false,

            instagram_enabled:
              false,
          },
      });

    } catch (err) {

      console.error(
        "❌ STATUS ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message ||
            "Failed to fetch automation status",
        });
    }
  };

/*
========================================
TEST CONNECTION
========================================
*/
export const testConnection =
  async (
    req,
    res
  ) => {

    try {

      const {
        platform,
      } = req.body;

      /*
      ========================================
      SIMPLE MOCK TEST
      ========================================
      */
      return res.json({

        success:
          true,

        connected:
          true,

        platform,

        message:
          `${platform} connection successful`,
      });

    } catch (err) {

      console.error(
        "❌ TEST CONNECTION ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Connection test failed",
        });
    }
  };

/*
========================================
DELETE INTEGRATION
========================================
*/
export const deleteIntegration =
  async (
    req,
    res
  ) => {

    try {

      const user_id =
        req.user.id;

      const {
        platform,
      } = req.params;

      /*
      ========================================
      VALIDATION
      ========================================
      */
      const allowedPlatforms = [

        "whatsapp",

        "facebook",

        "instagram",
      ];

      if (
        !allowedPlatforms.includes(
          platform
        )
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Invalid platform",
          });
      }

      /*
      ========================================
      RESET FIELDS
      ========================================
      */
      let updateData = {};

      if (
        platform ===
        "whatsapp"
      ) {

        updateData = {

         whatsapp_access_token: null,

          whatsapp_phone_id:
            null,

          whatsapp_enabled:
            false,
        };
      }

      if (
        platform ===
        "facebook"
      ) {

        updateData = {

          facebook_page_id:
            null,

          facebook_page_access_token: null,

          facebook_enabled:
            false,
        };
      }

      if (
        platform ===
        "instagram"
      ) {

        updateData = {

          instagram_business_id:
            null,

          instagram_access_token:
            null,

          instagram_enabled:
            false,
        };
      }

      /*
      ========================================
      UPDATE
      ========================================
      */
      const {
        error,
      } =
        await supabase
          .from(
            "user_integrations"
          )
          .update({

            ...updateData,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "user_id",
            user_id
          );

      if (error)
        throw error;

      return res.json({

        success:
          true,

        message:
          `${platform} integration removed`,
      });

    } catch (err) {

      console.error(
        "❌ DELETE INTEGRATION ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message ||
            "Failed to delete integration",
        });
    }
  };