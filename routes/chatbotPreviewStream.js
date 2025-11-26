import express from "express";
import supabase from "../config/supabaseClient.js";
import Groq from "groq-sdk";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.get("/preview-stream/:id", async (req, res) => {
  // ✅ SSE HEADERS (BEFORE ANY ASYNC)
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Accel-Buffering", "no"); // ✅ disables proxy buffering
  res.flushHeaders();

  // ✅ IMMEDIATE FIRST FLUSH (CRITICAL FOR RENDER/CLOUDFLARE)
  res.write(`event: open\ndata: "connected"\n\n`);

  // ✅ HEARTBEAT EVERY 10s TO PREVENT BUFFERING
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

    // ✅ SAFE PARSE
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

    const systemPrompt = `
You are the official AI assistant for the business:
${bot.name || "Our Business"}

${bot.business_info || "We help customers."}
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
      res.flush?.(); // ✅ FORCE PUSH EACH TOKEN
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

  // ✅ CLEAN CLOSE IF CLIENT DISCONNECTS
  req.on("close", () => {
    clearInterval(heartbeat);
    res.end();
  });
});

export default router;
