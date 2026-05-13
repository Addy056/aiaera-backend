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

      /*
      ========================================
      DELETE TRAINING DATA
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

      /*
      ========================================
      DELETE FILES
      ========================================
      */
      await supabase
        .from(
          "chatbot_files"
        )
        .delete()
        .eq(
          "chatbot_id",
          id
        );

      /*
      ========================================
      DELETE LEADS
      ========================================
      */
      await supabase
        .from("leads")
        .delete()
        .eq(
          "chatbot_id",
          id
        );

      /*
      ========================================
      DELETE APPOINTMENTS
      ========================================
      */
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
        session_id,
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
        error: trainingError,
      } = await supabase
        .from(
          "chatbot_file_data"
        )
        .select("content")
        .eq(
          "chatbot_id",
          chatbot_id
        );

      if (trainingError) {

        console.error(
          "TRAINING DATA ERROR:",
          trainingError
        );
      }

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
- Be conversational and human-like
- Keep responses concise and useful
- Use business knowledge whenever relevant
- Prioritize uploaded training data
- Ask follow-up questions naturally
- Help convert visitors into leads
- If unsure, answer honestly
`;

      /*
      ========================================
      GENERATE AI RESPONSE
      ========================================
      */
      const completion =
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

      /*
      ========================================
      GET REPLY
      ========================================
      */
      const reply =
        completion
          ?.choices?.[0]
          ?.message
          ?.content ||
        "Sorry, I couldn't generate a response.";

      /*
      ========================================
      EXTRACT LEAD DATA
      ========================================
      */
      const leadData =
        extractLeadData(
          message
        );

      /*
      ========================================
      SAVE LEAD
      ========================================
      */
      if (
        leadData?.isLead
      ) {

        const {
          email,
          name,
        } = leadData;

        await supabase
          .from("leads")
          .insert([
            {
              chatbot_id,

              user_id:
                chatbot.user_id,

              name:
                name ||
                "Unknown",

              email:
                email ||
                null,

              message,
            },
          ]);
      }

      /*
      ========================================
      RETURN RESPONSE
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

      /*
      ========================================
      SCRAPE WEBSITE
      ========================================
      */
      const content =
        await scrapeWebsite(
          website_url
        );

      /*
      ========================================
      SAVE TRAINING DATA
      ========================================
      */
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