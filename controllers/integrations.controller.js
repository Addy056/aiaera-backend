import axios from "axios";
import { supabase } from "../config/supabaseClient.js";
import { chatWithBot } from "./chatbot.controller.js";

// =============================
// SAVE INTEGRATION
// =============================
export const saveIntegration = async (req, res) => {

  try {

    const user_id = req.user.id;

    const {
      whatsapp_token,
      whatsapp_phone_id,
      facebook,
      calendly,
      maps
    } = req.body;

    const { data, error } = await supabase
      .from("user_integrations")
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
              maps || ""
          }
        ],
        {
          onConflict: "user_id"
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
          error
        });
    }

    res.json(data);

  } catch (err) {

    console.error(
      "CONTROLLER ERROR:",
      err
    );

    res.status(500).json({
      error:
        "Internal server error"
    });
  }
};

// =============================
// GET INTEGRATION
// =============================
export const getIntegration = async (req, res) => {

  try {

    const user_id =
      req.user.id;

    const { data, error } =
      await supabase
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

    res.json(data);

  } catch (err) {

    console.error(
      "GET CONTROLLER ERROR:",
      err
    );

    res.status(500).json({
      error:
        "Internal server error"
    });
  }
};

// =============================
// VERIFY WEBHOOK
// =============================
export const verifyWhatsApp = (
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
    mode === "subscribe" &&
    token === VERIFY_TOKEN
  ) {

    return res
      .status(200)
      .send(challenge);

  } else {

    return res.sendStatus(
      403
    );
  }
};

// =============================
// HANDLE INCOMING MESSAGES
// =============================
export const handleWhatsAppWebhook =
  async (req, res) => {

    try {

      const body =
        req.body;

      if (body.object) {

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

        // =============================
        // FIND USER BY PHONE ID
        // =============================
        const phone_id =
          body.entry?.[0]
            ?.changes?.[0]
            ?.value
            ?.metadata
            ?.phone_number_id;

        const {
          data: integration
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

        if (!integration) {

          return res.sendStatus(
            200
          );
        }

        // =============================
        // GET CHATBOT
        // =============================
        const {
          data: chatbot
        } = await supabase
          .from("chatbots")
          .select("*")
          .eq(
            "user_id",
            integration.user_id
          )
          .limit(1)
          .single();

        if (!chatbot) {

          return res.sendStatus(
            200
          );
        }

        // =============================
        // CHATBOT RESPONSE
        // =============================
        const session_id =
          from;

        const fakeReq = {
          body: {
            message:
              text,

            chatbot_id:
              chatbot.id,

            session_id
          }
        };

        let replyText =
          "Sorry, something went wrong.";

        const fakeRes = {
          json: (data) => {
            replyText =
              data.reply;
          }
        };

        await chatWithBot(
          fakeReq,
          fakeRes
        );

        // =============================
        // SEND MESSAGE USING USER TOKEN
        // =============================
        await axios.post(
          `https://graph.facebook.com/v19.0/${integration.whatsapp_phone_id}/messages`,
          {
            messaging_product:
              "whatsapp",

            to: from,

            text: {
              body:
                replyText
            }
          },
          {
            headers: {
              Authorization:
                `Bearer ${integration.whatsapp_token}`,

              "Content-Type":
                "application/json"
            }
          }
        );

        return res.sendStatus(
          200
        );
      }

      res.sendStatus(404);

    } catch (err) {

      console.error(
        "Webhook Error:",
        err.response?.data ||
        err.message
      );

      res.sendStatus(500);
    }
  };