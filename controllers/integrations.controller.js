import axios from "axios";
import { supabase } from "../config/supabaseClient.js";
import { chatWithBot } from "./chatbot.controller.js";

/*
========================================
SAVE INTEGRATION
========================================
*/
export const saveIntegration =
  async (req, res) => {

    try {

      const user_id =
        req.user.id;

      const {
        whatsapp_token,
        whatsapp_phone_id,
        facebook,
        calendly,
        maps,
      } = req.body;

      const {
        data,
        error,
      } = await supabase
        .from(
          "user_integrations"
        )
        .upsert(
          [
            {
              user_id,

              whatsapp_token:
                whatsapp_token || "",

              whatsapp_phone_id:
                whatsapp_phone_id || "",

              facebook:
                facebook || "",

              calendly:
                calendly || "",

              maps:
                maps || "",
            },
          ],
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
            error,
          });
      }

      return res.json(
        data
      );

    } catch (err) {

      console.error(
        "CONTROLLER ERROR:",
        err
      );

      return res.status(500).json({
        error:
          "Internal server error",
      });
    }
  };

/*
========================================
GET INTEGRATION
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

        return res.json(
          {}
        );
      }

      return res.json(
        data
      );

    } catch (err) {

      console.error(
        "GET CONTROLLER ERROR:",
        err
      );

      return res.status(500).json({
        error:
          "Internal server error",
      });
    }
  };

/*
========================================
GET PUBLIC INTEGRATIONS
USED BY EMBED CHATBOT
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
        data:
          integrations,
        error:
          integrationsError,
      } = await supabase
        .from(
          "user_integrations"
        )
        .select(
          "calendly, maps"
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
VERIFY WHATSAPP WEBHOOK
========================================
*/
export const verifyWhatsApp =
  (
    req,
    res
  ) => {

    const VERIFY_TOKEN =
      process.env
        .WHATSAPP_VERIFY_TOKEN;

    const mode =
      req.query[
        "hub.mode"
      ];

    const token =
      req.query[
        "hub.verify_token"
      ];

    const challenge =
      req.query[
        "hub.challenge"
      ];

    if (
      mode ===
        "subscribe" &&
      token ===
        VERIFY_TOKEN
    ) {

      return res
        .status(200)
        .send(
          challenge
        );

    } else {

      return res.sendStatus(
        403
      );
    }
  };

/*
========================================
HANDLE WHATSAPP WEBHOOK
========================================
*/
export const handleWhatsAppWebhook =
  async (
    req,
    res
  ) => {

    try {

      const body =
        req.body;

      if (
        body.object
      ) {

        const msg =
          body.entry?.[0]
            ?.changes?.[0]
            ?.value
            ?.messages?.[0];

        if (!msg) {

          return res.sendStatus(
            200
          );
        }

        const from =
          msg.from;

        const text =
          msg.text?.body;

        console.log(
          "Incoming:",
          text
        );

        /*
        ========================================
        FIND USER BY PHONE ID
        ========================================
        */
        const phone_id =
          body.entry?.[0]
            ?.changes?.[0]
            ?.value
            ?.metadata
            ?.phone_number_id;

        const {
          data:
            integration,
        } = await supabase
          .from(
            "user_integrations"
          )
          .select("*")
          .eq(
            "whatsapp_phone_id",
            phone_id
          )
          .single();

        if (
          !integration
        ) {

          return res.sendStatus(
            200
          );
        }

        /*
        ========================================
        GET CHATBOT
        ========================================
        */
        const {
          data: chatbot,
        } = await supabase
          .from(
            "chatbots"
          )
          .select("*")
          .eq(
            "user_id",
            integration.user_id
          )
          .limit(1)
          .single();

        if (
          !chatbot
        ) {

          return res.sendStatus(
            200
          );
        }

        /*
        ========================================
        GENERATE AI REPLY
        ========================================
        */
        const session_id =
          from;

        const fakeReq = {
          body: {
            message:
              text,

            chatbot_id:
              chatbot.id,

            session_id,
          },
        };

        let replyText =
          "Sorry, something went wrong.";

        const fakeRes = {
          json: (
            data
          ) => {

            replyText =
              data.reply;
          },
        };

        await chatWithBot(
          fakeReq,
          fakeRes
        );

        /*
        ========================================
        SEND WHATSAPP MESSAGE
        ========================================
        */
        await axios.post(
          `https://graph.facebook.com/v19.0/${integration.whatsapp_phone_id}/messages`,
          {
            messaging_product:
              "whatsapp",

            to: from,

            text: {
              body:
                replyText,
            },
          },
          {
            headers: {
              Authorization:
                `Bearer ${integration.whatsapp_token}`,

              "Content-Type":
                "application/json",
            },
          }
        );

        return res.sendStatus(
          200
        );
      }

      return res.sendStatus(
        404
      );

    } catch (err) {

      console.error(
        "Webhook Error:",
        err.response
          ?.data ||
          err.message
      );

      return res.sendStatus(
        500
      );
    }
  };