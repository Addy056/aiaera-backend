import express from "express";
import supabase from "../config/supabaseClient.js";
import Groq from "groq-sdk";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.get("/preview-stream/:id", async (req, res) => {
  // ✅ MUST BE BEFORE TRY BLOCK — VERY IMPORTANT
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // ✅ Prevent reverse proxy buffering
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  try {
    const chatbotId = req.params.id;
    const raw = req.query.messages;

    if (!raw || !chatbotId) {
      res.write(`event: done\ndata: {}\n\n`);
      return;
    }

    // ✅ Safe Unicode Parse
    let messages = [];
    try {
      messages = JSON.parse(decodeURIComponent(raw));
    } catch {
      messages = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    }

    const { data: bot, error } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", chatbotId)
      .single();

    if (error || !bot) {
      res.write(`event: token\ndata: "Chatbot not found."\n\n`);
      res.write(`event: done\ndata: {}\n\n`);
      return;
    }

    const memory = messages.slice(-10);

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

    // ✅ Stream tokens properly
    for await (const chunk of stream) {
      const token = chunk?.choices?.[0]?.delta?.content;
      if (!token) continue;

      res.write(`event: token\ndata: ${JSON.stringify(token)}\n\n`);
    }

    res.write(`event: done\ndata: {}\n\n`);
    res.end();

    // ✅ Close if client disconnects
    req.on("close", () => {
      res.end();
    });

  } catch (err) {
    console.error("🔥 Preview Stream Error:", err);

    // ✅ NEVER send JSON/HTML in SSE error
    try {
      res.write(`event: token\ndata: "⚠️ Stream failed."\n\n`);
      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    } catch (_) {}
  }
});

export default router;
