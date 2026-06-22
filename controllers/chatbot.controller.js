import Groq from "groq-sdk";

import { supabase }
  from "../config/supabaseClient.js";

import { scrapeWebsite }
  from "../utils/scraper.js";


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
        error:
          integrationError,
      } =
        await supabase
          .from(
            "user_integrations"
          )
          .select("*")
          .eq(
            "user_id",
            chatbot.user_id
          )
          .maybeSingle();

      if (integrationError) {

        console.error(
          "❌ INTEGRATION ERROR:",
          integrationError
        );
      }

      /*
      ========================================
      RESPONSE
      ========================================
      */
      return res.json({

        success:
          true,

        subscription_expired,

       integrations: {

  meeting_provider:
    integrations?.meeting_provider ||
    "calendly",

  meeting_link:
    integrations?.meeting_link ||
    "",

  maps_link:
    integrations?.maps_link ||
    "",
},

        chatbot,
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

        visitorId,

        messages = [],

      } = req.body;

      const finalChatbotId =
        chatbotId ||
        chatbot_id;

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
        error:
          integrationError,
      } =
        await supabase
          .from(
            "user_integrations"
          )
          .select("*")
          .eq(
            "user_id",
            chatbot.user_id
          )
          .maybeSingle();

      if (integrationError) {

        console.error(
          "❌ INTEGRATION ERROR:",
          integrationError
        );
      }

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

      const lowerMessage =
        message.toLowerCase();
const {
  data: session,
} =
  await supabase
    .from("chat_sessions")
    .select("*")
    .eq(
      "chatbot_id",
      finalChatbotId
    )
    .eq(
      "visitor_id",
      visitorId
    )
    .maybeSingle();
    /*
      ========================================
      LOCATION QUICK REPLY
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
        ) ||

        lowerMessage.includes(
          "visit"
        ) ||

        lowerMessage.includes(
          "map"
        )

      ) {

        const mapsLink =
  integrations?.maps_link;

        if (mapsLink) {

          return res.json({

            success:
              true,

            reply:
`📍 You can visit us here:

${mapsLink}`,
          });
        }
      }
   /*
========================================
APPOINTMENT REQUEST
========================================
*/
if (

  lowerMessage.includes("appointment") ||
  lowerMessage.includes("book") ||
  lowerMessage.includes("meeting") ||
  lowerMessage.includes("demo") ||
  lowerMessage.includes("call") ||
  lowerMessage.includes("schedule")

) {

  if (!session) {

    await supabase
      .from("chat_sessions")
      .insert([{

        chatbot_id:
          finalChatbotId,

        visitor_id:
          visitorId,

        stage:
          "name",

      }]);
  }

  return res.json({

    success: true,

    reply:
      "I'd be happy to help. What is your full name?",

  });
}
/*
========================================
NAME COLLECTION
========================================
*/
if (
  session?.stage === "name"
) {

  await supabase
    .from("chat_sessions")
    .update({

      name: message,

      stage: "email",

    })
    .eq(
      "id",
      session.id
    );

  return res.json({

    success: true,

    reply:
      "Thank you. What is your email address?",

  });
}
/*
========================================
EMAIL COLLECTION
========================================
*/
if (
  session?.stage === "email"
) {

  await supabase
    .from("chat_sessions")
    .update({

      email: message,

      stage: "phone",

    })
    .eq(
      "id",
      session.id
    );

  return res.json({

    success: true,

    reply:
      "Perfect. What is your phone number?",

  });
}
/*
========================================
PHONE COLLECTION
========================================
*/
if (
  session?.stage === "phone"
) {

  await supabase
    .from("chat_sessions")
    .update({

      phone: message,

      stage: "complete",

    })
    .eq(
      "id",
      session.id
    );

  const {
    data: completedSession,
  } =
    await supabase
      .from("chat_sessions")
      .select("*")
      .eq(
        "id",
        session.id
      )
      .single();

  const {
    data: existingLead,
  } =
    await supabase
      .from("leads")
      .select("id")
      .eq(
        "chatbot_id",
        finalChatbotId
      )
      .eq(
        "email",
        completedSession.email
      )
      .maybeSingle();

  if (!existingLead) {

    await supabase
      .from("leads")
      .insert([{

        chatbot_id:
          finalChatbotId,

        user_id:
          chatbot.user_id,

        name:
          completedSession.name,

        email:
          completedSession.email,

        phone:
          completedSession.phone,

        source:
          "website",

        message:
          "Appointment Lead",

      }]);
  }

  /*
  ========================================
  CREATE APPOINTMENT
  ========================================
  */
  const {
    data: existingAppointment,
  } =
    await supabase
      .from("appointments")
      .select("id")
      .eq(
        "chatbot_id",
        finalChatbotId
      )
      .eq(
        "customer_email",
        completedSession.email
      )
      .maybeSingle();

  if (!existingAppointment) {

    await supabase
      .from("appointments")
      .insert([{

        user_id:
          chatbot.user_id,

        chatbot_id:
          finalChatbotId,

        customer_name:
          completedSession.name,

        customer_email:
          completedSession.email,

        customer_phone:
          completedSession.phone,

        meeting_link:
          integrations?.meeting_link ||
          integrations?.calendly_link ||
          null,

        provider:
  integrations?.meeting_provider ||
  "custom",

        status:
          "pending",

      }]);
  }

  await supabase
    .from("chat_sessions")
    .delete()
    .eq(
      "id",
      session.id
    );

  return res.json({

    success: true,

    reply:
      integrations?.meeting_link ||
      integrations?.calendly_link
        ? `Thank you. Your appointment request has been submitted.

Status: Pending

Please choose a suitable time below:

${integrations.meeting_link || integrations.calendly_link}`
        : "Thank you. Your appointment request has been submitted and is currently pending approval.",

  });
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

- If a user asks for:
  appointment
booking
demo
meeting
consultation
call
pricing
quote

  ask for:

  1. Full Name
  2. Email Address
  3. Phone Number

  before giving booking information.

- Never ask for the same information twice.

- Use previous conversation messages as context.

- Remember information already provided by the user.

- Encourage appointments naturally.
- If information is unavailable, politely say so
`;

      /*
      ========================================
      GROQ RESPONSE
      ========================================
      */
      const conversationHistory =
  (messages || [])
    .slice(-20)
    .map((msg) => ({

      role:
        msg.role === "bot"
          ? "assistant"
          : "user",

      content:
        msg.text || "",
    }));

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
        role: "system",
        content: systemPrompt,
      },

      ...conversationHistory,
    ],
  });
  const reply =
  completion
    ?.choices?.[0]
    ?.message
    ?.content
    ?.trim() ||
  "I'm here to help.";

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

      const content =
        await scrapeWebsite(
          website_url
        );

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