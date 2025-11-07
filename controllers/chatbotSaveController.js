// backend/controllers/chatbotSaveController.js
import supabase from "../config/supabaseClient.js";
import pdfParse from "pdf-parse-fixed";
import csv from "csv-parser";
import { Readable } from "stream";

async function extractFileText(fileBuffer, mimeType, fileName) {
  try {
    if (mimeType === "application/pdf") {
      const data = await pdfParse(fileBuffer);
      return data.text.slice(0, 8000);
    }
    if (mimeType === "text/csv") {
      const rows = [];
      await new Promise((resolve, reject) => {
        Readable.from(fileBuffer)
          .pipe(csv())
          .on("data", (row) => rows.push(row))
          .on("end", resolve)
          .on("error", reject);
      });
      return JSON.stringify(rows).slice(0, 8000);
    }
    // Fallback: plain text
    return fileBuffer.toString("utf-8").slice(0, 8000);
  } catch (err) {
    console.error(`[File Extract Error] ${fileName}:`, err.message);
    return "";
  }
}

export const saveChatbotConfig = async (req, res) => {
  try {
    const { userId, name, businessDescription, websiteUrl, theme, files } = req.body;

    if (!userId) return res.status(400).json({ success: false, error: "Missing userId" });
    if (!name) return res.status(400).json({ success: false, error: "Missing chatbot name" });

    // 1️⃣ Upsert into chatbots
    const { data: chatbot, error: chatbotError } = await supabase
      .from("chatbots")
      .upsert(
        {
          user_id: userId,
          name,
          config: { businessDescription, websiteUrl, theme, files },
          updated_at: new Date(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (chatbotError) throw chatbotError;

    // 2️⃣ Upsert into business_data (store textual info)
    await supabase.from("business_data").upsert(
      {
        user_id: userId,
        title: name,
        business_type: "AI Chatbot",
        description: businessDescription,
        updated_at: new Date(),
      },
      { onConflict: "user_id" }
    );

    // 3️⃣ Handle uploaded files (optional)
    if (Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        const { name: fileName, path, bucket, mimeType, size, publicUrl } = file;

        // Save metadata
        const { data: fileRecord, error: fileError } = await supabase
          .from("chatbot_files")
          .upsert(
            {
              user_id: userId,
              chatbot_id: chatbot.id,
              bucket,
              path,
              filename: fileName,
              mime_type: mimeType,
              size,
              created_at: new Date(),
            },
            { onConflict: "path" }
          )
          .select()
          .single();

        if (fileError) {
          console.warn(`[File Save Warning] ${fileName}:`, fileError.message);
          continue;
        }

        // Download file from public URL and extract text
        const fileRes = await fetch(publicUrl);
        const arrayBuffer = await fileRes.arrayBuffer();
        const fileText = await extractFileText(Buffer.from(arrayBuffer), mimeType, fileName);

        // Save text content into chatbot_file_data
        await supabase.from("chatbot_file_data").upsert(
          {
            file_id: fileRecord.id,
            chatbot_id: chatbot.id,
            content: { text: fileText },
            created_at: new Date(),
          },
          { onConflict: "file_id" }
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "✅ Chatbot configuration saved successfully.",
      chatbot,
    });
  } catch (err) {
    console.error("[Chatbot Save Error]", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to save chatbot configuration.",
    });
  }
};
