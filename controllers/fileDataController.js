// backend/controllers/fileDataController.js
import supabase from "../config/supabaseClient.js";
import { parsePDFBuffer } from "../utils/pdfUtils.js";
import { parseExcelBuffer } from "../utils/excelUtils.js";

/**
 * Extract content from a file (PDF, CSV, Excel, TXT) and save to Supabase
 */
export const extractAndSaveFileContent = async (req, res) => {
  try {
    const user = req.user;
    const { file_id } = req.body;

    if (!file_id) {
      return res.status(400).json({ error: "file_id is required" });
    }

    // Fetch file metadata
    const { data: fileRow, error: fetchError } = await supabase
      .from("chatbot_files")
      .select("*")
      .eq("id", file_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !fileRow) {
      console.error("❌ File not found or fetch error:", fetchError);
      return res.status(404).json({ error: "File not found" });
    }

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(fileRow.bucket)
      .download(fileRow.path);

    if (downloadError || !fileData) {
      console.error("❌ Failed to download file:", downloadError);
      return res.status(500).json({ error: "Failed to download file" });
    }

    // Convert Blob → Buffer (for Node.js parsers)
    let fileBuffer;
    try {
      fileBuffer = Buffer.from(await fileData.arrayBuffer());
    } catch (convErr) {
      console.error("❌ Failed to convert file Blob to Buffer:", convErr);
      return res.status(500).json({ error: "File conversion failed" });
    }

    let extractedContent = null;
    let contentType = "";

    // Extract content based on MIME type
    try {
      if (fileRow.mime_type === "application/pdf") {
        extractedContent = await parsePDFBuffer(fileBuffer);
        contentType = "pdf";
      } else if (fileRow.mime_type === "text/csv") {
        extractedContent = await parseExcelBuffer(fileBuffer);
        contentType = "csv";
      } else if (
        fileRow.mime_type.includes("excel") ||
        fileRow.mime_type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        extractedContent = await parseExcelBuffer(fileBuffer);
        contentType = "excel";
      } else if (fileRow.mime_type === "text/plain") {
        extractedContent = fileBuffer.toString("utf-8");
        contentType = "text";
      } else {
        return res
          .status(400)
          .json({ error: "Unsupported file type for content extraction" });
      }
    } catch (parseErr) {
      console.error("❌ Error during content extraction:", parseErr);
      return res.status(500).json({ error: "Failed to parse file content" });
    }

    if (!extractedContent) {
      return res
        .status(500)
        .json({ error: "Failed to extract content from file" });
    }

    // Save extracted content to Supabase
    const { data: contentData, error: contentError } = await supabase
      .from("chatbot_file_data")
      .insert([
        {
          file_id: fileRow.id,
          user_id: user.id,
          type: contentType,
          content: extractedContent,
        },
      ])
      .select()
      .single();

    if (contentError) {
      console.error("❌ Failed to save extracted content:", contentError);
      return res
        .status(500)
        .json({ error: "Failed to save extracted content" });
    }

    return res.status(201).json({
      success: true,
      message: "Content extracted and saved successfully",
      content: contentData,
    });
  } catch (err) {
    console.error("❌ Extract content error (unexpected):", err);
    res.status(500).json({ error: "Failed to extract file content" });
  }
};
