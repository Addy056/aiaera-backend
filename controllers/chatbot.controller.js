import Groq from "groq-sdk";

import { supabase }
  from "../config/supabaseClient.js";

import { scrapeWebsite }
  from "../utils/scraper.js";

import { extractLeadData }
  from "../utils/leadExtractor.js";

/*
========================================
GROQ
========================================
*/
const groq =
  new Groq({

    apiKey:
      process.env.GROQ_API_KEY,
  });

/*
========================================
CREATE CHATBOT
========================================
*/
export const createChatbot =
  async (
    req,
    res
  ) => {

    try {

      const {

        name,

        business_info,

        website_url,

        theme,

      } = req.body;

      /*
      ========================================
      VALIDATION
      ========================================
      */
      if (!name) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Chatbot name is required",
          });
      }

      /*
      ========================================
      CREATE
      ========================================
      */
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "chatbots"
          )
          .insert([{

            user_id:
              req.user.id,

            bot_name:
              name,

            business_info,

            website_url,

            theme:
              theme ||
              {},

          }])
          .select()
          .maybeSingle();

      if (error)
        throw error;

      return res
        .status(201)
        .json({

          success:
            true,

          chatbot:
            data,
        });

    } catch (err) {

      console.error(
        "❌ CREATE CHATBOT ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message ||
            "Failed to create chatbot",
        });
    }
  };

/*
========================================
GET USER CHATBOTS
========================================
*/
export const getUserChatbots =
  async (
    req,
    res
  ) => {

    try {

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "chatbots"
          )
          .select("*")
          .eq(
            "user_id",
            req.user.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      if (error)
        throw error;

      return res.json({

        success:
          true,

        chatbots:
          data || [],
      });

    } catch (err) {

      console.error(
        "❌ GET CHATBOTS ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

            error:
              err.message,
        });
    }
  };

/*
========================================
GET PUBLIC CHATBOT
========================================
*/
export const getPublicChatbot =
  async (
    req,
    res
  ) => {

    try {

      const { id } =
        req.params;

      /*
      ========================================
      GET CHATBOT
      ========================================
      */
      const {
        data: chatbot,
        error,
      } =
        await supabase
          .from(
            "chatbots"
          )
          .select("*")
          .eq(
            "id",
            id
          )
          .maybeSingle();

      if (
        error ||
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
      CHECK SUBSCRIPTION
      ========================================
      */
      const {
        data:
          subscription,
      } =
        await supabase
          .from(
            "user_subscriptions"
          )
          .select("*")
          .eq(
            "user_id",
            chatbot.user_id
          )
          .maybeSingle();

      let subscription_expired =
        false;

      if (
        subscription?.expires_at
      ) {

        subscription_expired =
          new Date(
            subscription.expires_at
          ) <
          new Date();
      }

      /*
      ========================================
      GET INTEGRATIONS
      ========================================
      */
      const {
        data:
          integrations,
      } =
        await supabase
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
          .maybeSingle();

      return res.json({

        success:
          true,

        chatbot,

        integrations:
          integrations ||
          null,

        subscription_expired,
      });

    } catch (err) {

      console.error(
        "❌ PUBLIC CHATBOT ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "Failed to fetch chatbot",
        });
    }
  };

/*
========================================
GET CHATBOT CONFIG
========================================
*/
export const getChatbotConfig =
  async (
    req,
    res
  ) => {

    try {

      const { id } =
        req.params;

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "chatbots"
          )
          .select("*")
          .eq(
            "id",
            id
          )
          .eq(
            "user_id",
            req.user.id
          )
          .maybeSingle();

      if (
        error ||
        !data
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

      return res.json({

        success:
          true,

        chatbot:
          data,
      });

    } catch (err) {

      console.error(
        "❌ GET CHATBOT ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message,
        });
    }
  };

/*
========================================
UPDATE CHATBOT
========================================
*/
export const updateChatbot =
  async (
    req,
    res
  ) => {

    try {

      const { id } =
        req.params;

      const updates =
        req.body;

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "chatbots"
          )
          .update(
            updates
          )
          .eq(
            "id",
            id
          )
          .eq(
            "user_id",
            req.user.id
          )
          .select()
          .maybeSingle();

      if (error)
        throw error;

      return res.json({

        success:
          true,

        chatbot:
          data,
      });

    } catch (err) {

      console.error(
        "❌ UPDATE CHATBOT ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message,
        });
    }
  };

/*
========================================
DELETE CHATBOT
========================================
*/
export const deleteChatbot =
  async (
    req,
    res
  ) => {

    try {

      const { id } =
        req.params;

      /*
      ========================================
      DELETE RELATED DATA
      ========================================
      */
      await supabase
        .from(
          "chatbot_file_data"
        )
        .delete()
        .eq(
          "chatbot_id",
          id
        );

      await supabase
        .from(
          "chatbot_files"
        )
        .delete()
        .eq(
          "chatbot_id",
          id
        );

      await supabase
        .from("leads")
        .delete()
        .eq(
          "chatbot_id",
          id
        );

      await supabase
        .from(
          "appointments"
        )
        .delete()
        .eq(
          "chatbot_id",
          id
        );

      /*
      ========================================
      DELETE CHATBOT
      ========================================
      */
      const { error } =
        await supabase
          .from(
            "chatbots"
          )
          .delete()
          .eq(
            "id",
            id
          )
          .eq(
            "user_id",
            req.user.id
          );

      if (error)
        throw error;

      return res.json({

        success:
          true,

        message:
          "Chatbot deleted successfully",
      });

    } catch (err) {

      console.error(
        "❌ DELETE CHATBOT ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message,
        });
    }
  };

/*
========================================
CHAT WITH BOT
========================================
*/
export const chatWithBot =
  async (
    req,
    res
  ) => {

    try {

      const {

        message,

        chatbotId,

        chatbot_id,

      } = req.body;

      /*
      ========================================
      SUPPORT BOTH KEYS
      ========================================
      */
      const finalChatbotId =
        chatbotId ||
        chatbot_id;

      /*
      ========================================
      VALIDATION
      ========================================
      */
      if (
        !message ||
        !finalChatbotId
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Message and chatbot ID are required",
          });
      }

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
          .select("*")
          .eq(
            "id",
            finalChatbotId
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
      CHECK SUBSCRIPTION
      ========================================
      */
      const {
        data:
          subscription,
      } =
        await supabase
          .from(
            "user_subscriptions"
          )
          .select("*")
          .eq(
            "user_id",
            chatbot.user_id
          )
          .maybeSingle();

      if (
        subscription?.expires_at &&
        new Date(
          subscription.expires_at
        ) <
          new Date()
      ) {

        return res.json({

          success:
            false,

          error:
            "This chatbot subscription has expired.",
        });
      }

      /*
      ========================================
      GET INTEGRATIONS
      ========================================
      */
      const {
        data:
          integrations,
      } =
        await supabase
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
          .maybeSingle();

      /*
      ========================================
      GET TRAINING DATA
      ========================================
      */
      const {
        data:
          trainingData,
      } =
        await supabase
          .from(
            "chatbot_file_data"
          )
          .select(
            "content"
          )
          .eq(
            "chatbot_id",
            finalChatbotId
          );

      const trainingContent =
        (
          trainingData ||
          []
        )
          .map(
            (
              item
            ) =>
              item.content ||
              ""
          )
          .join("\n\n")
          .slice(
            0,
            12000
          );

      /*
      ========================================
      QUICK REPLIES
      ========================================
      */
      const lowerMessage =
        message.toLowerCase();

      /*
      ========================================
      APPOINTMENT
      ========================================
      */
      if (

        lowerMessage.includes(
          "appointment"
        ) ||

        lowerMessage.includes(
          "book"
        ) ||

        lowerMessage.includes(
          "meeting"
        ) ||

        lowerMessage.includes(
          "demo"
        )

      ) {

        if (
          integrations?.meeting_link
        ) {

          return res.json({

            success:
              true,

            reply:
`📅 You can book an appointment here:

${integrations.meeting_link}`,
          });
        }
      }

      /*
      ========================================
      LOCATION
      ========================================
      */
      if (

        lowerMessage.includes(
          "location"
        ) ||

        lowerMessage.includes(
          "office"
        ) ||

        lowerMessage.includes(
          "address"
        )

      ) {

        if (
          integrations?.maps
        ) {

          return res.json({

            success:
              true,

            reply:
`📍 Visit us here:

${integrations.maps}`,
          });
        }
      }

      /*
      ========================================
      SYSTEM PROMPT
      ========================================
      */
      const systemPrompt = `
You are a professional human customer support and sales representative.

IMPORTANT LANGUAGE RULES:
- Detect the language of the user's message automatically
- ALWAYS reply in the SAME language as the user
- If the user switches language, switch automatically
- Never mention language detection
- Never say you are AI
- Sound natural and human

BUSINESS:
${chatbot.business_info || "Not provided"}

WEBSITE:
${chatbot.website_url || "Not provided"}

TRAINING:
${trainingContent || "No training data"}

BEHAVIOR RULES:
- Be conversational
- Be professional
- Keep replies concise
- Use training data accurately
- Avoid hallucinations
- Collect leads naturally
- Encourage appointments naturally
- If information is unavailable, politely say so
`;

      /*
      ========================================
      GROQ RESPONSE
      ========================================
      */
      const completion =
        await groq.chat.completions.create({

          model:
            "llama-3.1-8b-instant",

          temperature:
            0.7,

          max_tokens:
            500,

          messages: [

            {
              role:
                "system",

              content:
                systemPrompt,
            },

            {
              role:
                "user",

              content:
                message,
            },
          ],
        });

      const reply =
        completion
          ?.choices?.[0]
          ?.message
          ?.content
          ?.trim() ||
        "I'm here to help.";

      /*
      ========================================
      LEAD EXTRACTION
      ========================================
      */
      try {

        const leadData =
          extractLeadData(
            message
          );

        if (
          leadData?.isLead
        ) {

          await supabase
            .from(
              "leads"
            )
            .insert([{

              chatbot_id:
                finalChatbotId,

              user_id:
                chatbot.user_id,

              name:
                leadData.name ||
                "Unknown",

              email:
                leadData.email ||
                null,

              message,
            }]);
        }

      } catch (
        leadError
      ) {

        console.error(
          "❌ LEAD ERROR:",
          leadError
        );
      }

      /*
      ========================================
      SUCCESS
      ========================================
      */
      return res.json({

        success:
          true,

        reply,
      });

    } catch (err) {

      console.error(
        "❌ CHAT ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            "AI service unavailable",
        });
    }
  };

/*
========================================
SCRAPE WEBSITE TRAINING
========================================
*/
export const scrapeWebsiteTraining =
  async (
    req,
    res
  ) => {

    try {

      const {

        chatbot_id,

        website_url,

      } = req.body;

      if (
        !chatbot_id ||
        !website_url
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            error:
              "Missing chatbot_id or website_url",
          });
      }

      /*
      ========================================
      SCRAPE
      ========================================
      */
      const content =
        await scrapeWebsite(
          website_url
        );

      /*
      ========================================
      SAVE DATA
      ========================================
      */
      const { error } =
        await supabase
          .from(
            "chatbot_file_data"
          )
          .insert([{

            chatbot_id,

            user_id:
              req.user.id,

            content,
          }]);

      if (error)
        throw error;

      return res.json({

        success:
          true,

        message:
          "Website trained successfully",
      });

    } catch (err) {

      console.error(
        "❌ SCRAPER ERROR:",
        err
      );

      return res
        .status(500)
        .json({

          success:
            false,

          error:
            err.message ||
            "Failed to scrape website",
        });
    }
  };