// backend/controllers/chatbotSaveController.js

import supabase from "../config/supabaseClient.js";
import pdfParse from "pdf-parse-fixed";
import csv from "csv-parser";
import fetch from "node-fetch";
import { Readable } from "stream";

/* ------------------------------------------------------
   Extract file text
------------------------------------------------------ */
async function extractFileText(fileBuffer, mimeType, fileName) {
  try {
    if (mimeType === "application/pdf") {
      const data = await pdfParse(fileBuffer);
      return (data.text || "").slice(0, 8000);
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

    return fileBuffer.toString("utf-8").slice(0, 8000);
  } catch (err) {
    console.error(`[File Extract Error] ${fileName}:`, err.message);
    return "";
  }
}

/* ------------------------------------------------------
   Save chatbot config
------------------------------------------------------ */
export const saveChatbotConfig = async (req, res) => {
  try {
    const {
      userId,
      name,
      businessDescription,
      websiteUrl,
      businessEmail,
      businessPhone,
      businessAddress,
      logoUrl,
      themeColors,
      files,
    } = req.body;

    if (!userId)
      return res.status(400).json({ success: false, error: "Missing userId" });

    if (!name)
      return res.status(400).json({ success: false, error: "Missing chatbot name" });

    /* ------------------------------------------------------
       1️⃣ UPSERT → chatbots table (MAIN SOURCE OF TRUTH)
       This ensures:
       - chatbot.name stores business name
       - chatbot.business_info stores description
       - chatbot.config stores misc UI + extra data
------------------------------------------------------ */

    const buildConfig = {
      website_url: websiteUrl || null,
      businessEmail,
      businessPhone,
      businessAddress,
      logo_url: logoUrl || null,
      themeColors: themeColors || null,
      files: files || [],
    };

    const { data: chatbot, error: chatbotError } = await supabase
      .from("chatbots")
      .upsert(
        {
          user_id: userId,
          name,
          business_info: businessDescription,
          config: buildConfig,
          updated_at: new Date(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (chatbotError) throw chatbotError;

    const chatbotId = chatbot.id;

    /* ------------------------------------------------------
       2️⃣ UPSERT → business_data (SEO + extra metadata)
------------------------------------------------------ */
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

    /* ------------------------------------------------------
       3️⃣ HANDLE FILE STORAGE + FILE TEXT EXTRACTION
------------------------------------------------------ */

    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        const { name: fileName, bucket, path, mimeType, size, publicUrl } = f;

        // 3.1 Save file metadata
        const { data: fileMeta, error: fileMetaErr } = await supabase
          .from("chatbot_files")
          .upsert(
            {
              user_id: userId,
              chatbot_id: chatbotId,
              bucket,
              path,
              filename: fileName,
              mime_type: mimeType,
              size,
              updated_at: new Date(),
            },
            { onConflict: "path" }
          )
          .select()
          .single();

        if (fileMetaErr) {
          console.warn(`[File Save Warning] ${fileName}:`, fileMetaErr.message);
          continue;
        }

        // 3.2 Download + extract text
        const fetchRes = await fetch(publicUrl);
        const arrayBuffer = await fetchRes.arrayBuffer();
        const fileText = await extractFileText(
          Buffer.from(arrayBuffer),
          mimeType,
          fileName
        );

        // 3.3 Save file text
        await supabase.from("chatbot_file_data").upsert(
          {
            file_id: fileMeta.id,
            chatbot_id: chatbotId,
            content: { text: fileText },
            updated_at: new Date(),
          },
          { onConflict: "file_id" }
        );
      }
    }

    /* ------------------------------------------------------
       DONE
------------------------------------------------------ */
    return res.status(200).json({
      success: true,
      message: "Chatbot configuration saved successfully.",
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
