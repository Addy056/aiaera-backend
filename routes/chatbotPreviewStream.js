import express from "express";
import supabase from "../config/supabaseClient.js";
import Groq from "groq-sdk";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.get("/preview-stream/:id", async (req, res) => {
  // ✅ SSE HEADERS (MUST BE FIRST)
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Accel-Buffering", "no"); // Disable proxy buffering
  res.flushHeaders();

  // ✅ IMMEDIATE OPEN EVENT (PREVENTS MIME ISSUES)
  res.write(`event: open\ndata: "connected"\n\n`);

  // ✅ HEARTBEAT TO KEEP CONNECTION ALIVE
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: ping\ndata: "keepalive"\n\n`);
    } catch (_) {}
  }, 10000);

  try {
    const chatbotId = req.params.id;
    const raw = req.query.messages;

    if (!chatbotId || !raw) {
      res.write(`event: token\ndata: "Invalid request."\n\n`);
      res.write(`event: done\ndata: {}\n\n`);
      clearInterval(heartbeat);
      return res.end();
    }

    // ✅ SAFE MESSAGE PARSE
    let messages = [];
    try {
      messages = JSON.parse(decodeURIComponent(raw));
    } catch {
      messages = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    }

    const { data: bot, error } = await supabase
      .from("chatbots")
      .select("name, business_info")
      .eq("id", chatbotId)
      .single();

    if (error || !bot) {
      res.write(`event: token\ndata: "Chatbot not found."\n\n`);
      res.write(`event: done\ndata: {}\n\n`);
      clearInterval(heartbeat);
      return res.end();
    }

    // ✅ ✅ SHORT, IMPACTFUL, SALES-FOCUSED PROMPT
    const systemPrompt = `
You are a professional business AI chatbot.

STRICT RULES:
- Replies must be SHORT (1–3 lines max).
- Be clear, confident, and helpful.
- NEVER write long paragraphs.
- Ask only ONE question at a time.
- Be sales-focused but not pushy.
- If the user asks to book a meeting, confirm briefly and guide them.
- Avoid emojis overload (max 1 emoji per reply).

Business Name:
${bot.name || "Our Business"}

Business Description:
${bot.business_info || "We help customers with our services."}
    `.trim();

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10),
    ];

    // ✅ START GROQ STREAM
    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
      stream: true,
    });

    let tokenCount = 0;

    for await (const chunk of stream) {
      const token = chunk?.choices?.[0]?.delta?.content;
      if (!token) continue;

      tokenCount++;
      res.write(`event: token\ndata: ${JSON.stringify(token)}\n\n`);
      res.flush?.();
    }

    if (tokenCount === 0) {
      res.write(`event: token\ndata: "⚠️ No response generated."\n\n`);
    }

    res.write(`event: done\ndata: {}\n\n`);
    clearInterval(heartbeat);
    res.end();

  } catch (err) {
    console.error("🔥 Preview Stream Error:", err);

    try {
      res.write(`event: token\ndata: "⚠️ Stream failed."\n\n`);
      res.write(`event: done\ndata: {}\n\n`);
    } catch (_) {}

    clearInterval(heartbeat);
    res.end();
  }

  // ✅ CLEAN CLOSE ON CLIENT DISCONNECT
  req.on("close", () => {
    clearInterval(heartbeat);
    res.end();
  });
});

export default router;
