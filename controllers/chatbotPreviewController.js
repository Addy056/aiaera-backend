// backend/controllers/chatbotPreviewController.js

// --------------------
// Safe dynamic imports
// --------------------
let askLLM, supabase, pdfParse, csv, fetch, Readable;

try {
  const { askLLM: importedAskLLM } = await import("../utils/groqClient.js");
  askLLM = importedAskLLM;
} catch (err) {
  console.warn("[ChatbotPreview] ⚠️ groqClient.js not found — using mock AI replies.");
  askLLM = async () => ({
    ok: true,
    content: "🤖 (Mock AI) This is a chatbot preview reply.",
  });
}

try {
  const importedSupabase = (await import("../config/supabaseClient.js")).default;
  supabase = importedSupabase;
} catch {
  console.warn("[ChatbotPreview] ⚠️ supabaseClient.js not found — skipping DB features.");
  supabase = null;
}

try {
  const pdf = await import("pdf-parse-fixed");
  pdfParse = pdf.default || pdf;
} catch {
  console.warn("[ChatbotPreview] ⚠️ pdf-parse-fixed not found — skipping PDF parsing.");
}

try {
  const csvPkg = await import("csv-parser");
  csv = csvPkg.default || csvPkg;
} catch {
  console.warn("[ChatbotPreview] ⚠️ csv-parser not found — skipping CSV parsing.");
}

try {
  const nf = await import("node-fetch");
  fetch = nf.default || nf;
} catch {
  console.warn("[ChatbotPreview] ⚠️ node-fetch not found — skipping fetch.");
}

try {
  const streamPkg = await import("stream");
  Readable = streamPkg.Readable;
} catch {
  console.warn("[ChatbotPreview] ⚠️ stream not found — skipping CSV reading.");
}

// --------------------
// Helper: Parse files from Supabase
// --------------------
async function getFileContentFromSupabase(fileUrl) {
  if (!fileUrl || !fetch) return "";
  try {
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const extension = fileUrl.split(".").pop().toLowerCase();

    if (extension === "pdf" && pdfParse) {
      const data = await pdfParse(Buffer.from(buffer));
      return data.text.slice(0, 8000);
    }

    if (extension === "csv" && csv && Readable) {
      const rows = [];
      await new Promise((resolve, reject) => {
        Readable.from(Buffer.from(buffer))
          .pipe(csv())
          .on("data", (row) => rows.push(row))
          .on("end", resolve)
          .on("error", reject);
      });
      return JSON.stringify(rows).slice(0, 8000);
    }

    // Default: plain text
    return Buffer.from(buffer).toString("utf-8").slice(0, 8000);
  } catch (err) {
    console.error("[ChatbotPreview] File parse error:", err.message);
    return "";
  }
}

// --------------------
// Main Controller
// --------------------
export const getChatbotPreviewReply = async (req, res) => {
  try {
    const { messages = [], chatbotConfig = {}, userId } = req.body || {};

    // Validate
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Messages array is required.",
      });
    }

    const lastUserMessage =
      messages[messages.length - 1]?.content?.toString()?.trim() || "Hi";

    // If no chatbot config, use fallback
    if (!chatbotConfig?.name && !chatbotConfig?.businessDescription) {
      return res.status(200).json({
        success: true,
        reply: "🤖 This is a chatbot preview (mock response).",
      });
    }

    // Optional: Fetch uploaded file text (for context)
    const knowledge = [];
    if (chatbotConfig?.files?.length) {
      for (const file of chatbotConfig.files) {
        const text = await getFileContentFromSupabase(file.publicUrl);
        knowledge.push({ name: file.name, content: text });
      }
    }

    // Use Groq (real AI) if available
    if (askLLM) {
      try {
        const aiResponse = await askLLM({
          systemPrompt: `You are an AI assistant representing ${chatbotConfig?.name || "a business"}.
Business description: ${chatbotConfig?.businessDescription || "N/A"}.
Respond conversationally to the user's message.`,
          userPrompt: lastUserMessage,
          model: process.env.LLM_MODEL || "gemma2-9b-it",
        });

        if (aiResponse?.ok && aiResponse?.content) {
          return res.status(200).json({
            success: true,
            reply: aiResponse.content,
            knowledge,
            provider: "groq",
          });
        }
      } catch (err) {
        console.error("[ChatbotPreview] LLM generation error:", err.message);
      }
    }

    // Default Fallback (no AI)
    return res.status(200).json({
      success: true,
      reply: `🤖 Hello! This is a fallback chatbot preview for ${
        chatbotConfig?.name || "your business"
      }.`,
      provider: "mock",
    });
  } catch (err) {
    console.error("[ChatbotPreview] Unexpected error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Internal server error in chatbot preview.",
    });
  }
};
