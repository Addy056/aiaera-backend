import express from "express";
import supabase from "../config/supabaseClient.js";
import Groq from "groq-sdk";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.get("/preview-stream/:id", async (req, res) => {
  // ✅ ABSOLUTE REQUIRED SSE HEADERS
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const safeEnd = () => {
    try {
      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    } catch (_) {}
  };

  try {
    const chatbotId = req.params.id;
    const raw = req.query.messages;

    if (!chatbotId || !raw) {
      res.write(`event: token\ndata: "Invalid stream request."\n\n`);
      return safeEnd(); // ✅ HARD RETURN
    }

    // ✅ SAFE PARSE (NO THROWS LEAKING TO EXPRESS)
    let messages = [];
    try {
      const decoded = decodeURIComponent(raw);
      messages = JSON.parse(decoded);
    } catch {
      try {
        messages = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
      } catch {
        res.write(`event: token\ndata: "Invalid message payload."\n\n`);
        return safeEnd(); // ✅ HARD RETURN
      }
    }

    const { data: bot, error } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", chatbotId)
      .single();

    if (error || !bot) {
      res.write(`event: token\ndata: "Chatbot not found."\n\n`);
      return safeEnd(); // ✅ HARD RETURN
    }

    const memory = Array.isArray(messages) ? messages.slice(-10) : [];

    const systemPrompt = `
You are the official AI assistant for the business:
${bot.name || "Our Business"}

${bot.business_info || "We help customers."}
    `.trim();

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...memory,
    ];

    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
      stream: true,
    });

    // ✅ HANDLE CLIENT DISCONNECT BEFORE STREAMING
    req.on("close", () => {
      safeEnd();
    });

    // ✅ STREAM TOKENS
    for await (const chunk of stream) {
      const token = chunk?.choices?.[0]?.delta?.content;
      if (!token) continue;

      res.write(`event: token\ndata: ${JSON.stringify(token)}\n\n`);
    }

    safeEnd(); // ✅ ALWAYS END CLEANLY

  } catch (err) {
    console.error("🔥 Preview Stream Error:", err);

    try {
      res.write(`event: token\ndata: "⚠️ Stream failed."\n\n`);
      safeEnd();
    } catch (_) {}
  }
});

export default router;
