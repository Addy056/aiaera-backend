import express from "express";
import supabase from "../config/supabaseClient.js";
import Groq from "groq-sdk";

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.get("/preview-stream/:id", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  try {
    const chatbotId = req.params.id;
    const raw = req.query.messages;

    if (!raw || !chatbotId) {
      res.write(`event: done\ndata: {}\n\n`);
      return res.end();
    }

    // ✅ Unicode-safe parse
    let messages = [];
    try {
      messages = JSON.parse(decodeURIComponent(raw));
    } catch {
      messages = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    }

    const { data: bot } = await supabase
      .from("chatbots")
      .select("*")
      .eq("id", chatbotId)
      .single();

    let cfg = bot?.config || {};

    const memory = messages.slice(-10);

    const systemPrompt = `
You are the official AI assistant for the business:
${bot?.name || "Our Business"}

${bot?.business_info || "We help customers."}
`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...memory,
    ];

    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: groqMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk?.choices?.[0]?.delta?.content || "";
      if (!token) continue;
      res.write(`event: token\ndata: ${JSON.stringify(token)}\n\n`);
    }

    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    console.error("🔥 Preview Stream Error:", err);
    res.end();
  }
});

export default router;
