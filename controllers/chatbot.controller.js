import Groq from "groq-sdk";

import { supabase } from "../config/supabaseClient.js";

import { scrapeWebsite } from "../utils/scraper.js";

import { extractLeadData } from "../utils/leadExtractor.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/*
========================================
CREATE CHATBOT
========================================
*/
export const createChatbot =
  async (req, res) => {

    try {

      const {
        name,
        business_info,
        website_url,
        theme,
      } = req.body;

      if (!name) {

        return res.status(400).json({
          success: false,
          error:
            "Chatbot name is required",
        });
      }

      const {
        data,
        error,
      } = await supabase
        .from("chatbots")
        .insert([
          {
            user_id:
              req.user.id,

            bot_name:
              name,

            business_info,

            website_url,

            theme,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.status(201).json({
        success: true,
        chatbot: data,
      });

    } catch (err) {

      console.error(
        "CREATE CHATBOT ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
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
  async (req, res) => {

    try {

      const {
        data,
        error,
      } = await supabase
        .from("chatbots")
        .select("*")
        .eq(
          "user_id",
          req.user.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        chatbots:
          data || [],
      });

    } catch (err) {

      console.error(
        "GET USER CHATBOTS ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        error:
          err.message,
      });
    }
  };

/*
========================================
GET CHATBOT CONFIG
========================================
*/
export const getChatbotConfig =
  async (req, res) => {

    try {

      const { id } =
        req.params;

      const {
        data,
        error,
      } = await supabase
        .from("chatbots")
        .select("*")
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          req.user.id
        )
        .single();

      if (
        error ||
        !data
      ) {

        return res.status(404).json({
          success: false,
          error:
            "Chatbot not found",
        });
      }

      return res.json({
        success: true,
        chatbot: data,
      });

    } catch (err) {

      console.error(
        "GET CHATBOT ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
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
  async (req, res) => {

    try {

      const { id } =
        req.params;

      const updates =
        req.body;

      const {
        data,
        error,
      } = await supabase
        .from("chatbots")
        .update(updates)
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          req.user.id
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        chatbot: data,
      });

    } catch (err) {

      console.error(
        "UPDATE CHATBOT ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
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
  async (req, res) => {

    try {

      const { id } =
        req.params;

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

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        message:
          "Chatbot deleted successfully",
      });

    } catch (err) {

      console.error(
        "DELETE CHATBOT ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
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
  async (req, res) => {

    try {

      const {
        message,
        chatbot_id,
      } = req.body;

      /*
      ========================================
      VALIDATION
      ========================================
      */
      if (
        !message ||
        !chatbot_id
      ) {

        return res.status(400).json({
          success: false,
          reply:
            "Invalid request",
        });
      }

      /*
      ========================================
      CHECK GROQ KEY
      ========================================
      */
      if (
        !process.env.GROQ_API_KEY
      ) {

        console.error(
          "GROQ API KEY MISSING"
        );

        return res.status(500).json({
          success: false,
          reply:
            "AI service unavailable",
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
        .select("*")
        .eq(
          "id",
          chatbot_id
        )
        .single();

      if (
        chatbotError ||
        !chatbot
      ) {

        console.error(
          "CHATBOT FETCH ERROR:",
          chatbotError
        );

        return res.status(404).json({
          success: false,
          reply:
            "Chatbot not found",
        });
      }

      /*
      ========================================
      GET TRAINING DATA
      ========================================
      */
      const {
        data: trainingData,
      } = await supabase
        .from(
          "chatbot_file_data"
        )
        .select("content")
        .eq(
          "chatbot_id",
          chatbot_id
        );

      /*
      ========================================
      FORMAT TRAINING DATA
      ========================================
      */
      const trainingContent =
        (
          trainingData || []
        )
          .map(
            (item) =>
              item.content || ""
          )
          .join("\n\n")
          .slice(0, 12000);

      /*
      ========================================
      QUICK REPLIES
      ========================================
      */
      const lowerMessage =
        message.toLowerCase();

      if (
        lowerMessage.includes("appointment") ||
        lowerMessage.includes("meeting") ||
        lowerMessage.includes("book")
      ) {

        return res.json({
          success: true,
          reply:
            "📅 You can book an appointment using the booking button above.",
        });
      }

      if (
        lowerMessage.includes("office") ||
        lowerMessage.includes("location") ||
        lowerMessage.includes("visit")
      ) {

        return res.json({
          success: true,
          reply:
            "📍 You can view our office location using the Visit Office button above.",
        });
      }

      /*
      ========================================
      SYSTEM PROMPT
      ========================================
      */
      const systemPrompt = `
You are an intelligent AI assistant for ${
        chatbot.bot_name ||
        "AI Assistant"
      }.

BUSINESS INFO:
${
  chatbot.business_info ||
  "Not provided"
}

WEBSITE:
${
  chatbot.website_url ||
  "Not provided"
}

TRAINING DATA:
${
  trainingContent ||
  "No training data"
}

RULES:
- Be conversational and professional
- Keep responses concise
- Use business knowledge whenever relevant
- Use uploaded training data first
- Answer naturally
- Help customers clearly
- If unsure, say you don't know
`;

      /*
      ========================================
      GENERATE RESPONSE
      ========================================
      */
      let completion;

      try {

        completion =
          await groq.chat.completions.create(
            {
              model:
                "llama3-70b-8192",

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
            }
          );

      } catch (groqError) {

        console.error(
          "GROQ ERROR:",
          groqError
        );

        return res.status(500).json({
          success: false,
          reply:
            "AI service temporarily unavailable",
        });
      }

      /*
      ========================================
      SAFE RESPONSE
      ========================================
      */
      const reply =
        completion
          ?.choices?.[0]
          ?.message
          ?.content
          ?.trim() ||
        "I'm here to help you.";

      /*
      ========================================
      EXTRACT LEADS
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
            .from("leads")
            .insert([
              {
                chatbot_id,

                user_id:
                  chatbot.user_id,

                name:
                  leadData.name ||
                  "Unknown",

                email:
                  leadData.email ||
                  null,

                message,
              },
            ]);
        }

      } catch (leadError) {

        console.error(
          "LEAD EXTRACTION ERROR:",
          leadError
        );
      }

      /*
      ========================================
      SUCCESS
      ========================================
      */
      return res.json({
        success: true,
        reply,
      });

    } catch (err) {

      console.error(
        "CHAT ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        reply:
          "Server error",
      });
    }
  };

/*
========================================
SCRAPE WEBSITE TRAINING
========================================
*/
export const scrapeWebsiteTraining =
  async (req, res) => {

    try {

      const {
        chatbot_id,
        website_url,
      } = req.body;

      if (
        !chatbot_id ||
        !website_url
      ) {

        return res.status(400).json({
          success: false,
          error:
            "Missing chatbot_id or website_url",
        });
      }

      const content =
        await scrapeWebsite(
          website_url
        );

      const { error } =
        await supabase
          .from(
            "chatbot_file_data"
          )
          .insert([
            {
              chatbot_id,

              user_id:
                req.user.id,

              content,
            },
          ]);

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        message:
          "Website trained successfully",
      });

    } catch (err) {

      console.error(
        "SCRAPER ERROR:",
        err
      );

      return res.status(500).json({
        success: false,
        error:
          err.message ||
          "Failed to scrape website",
      });
    }
  };