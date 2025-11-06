// backend/utils/fileUtils.js
import { parsePDFBuffer } from "./pdfUtils.js";
import { parseExcelBuffer } from "./excelUtils.js";
import { parseTextBuffer } from "./textUtils.js";

/**
 * Unified file parser
 * @param {Buffer} buffer - file buffer
 * @param {string} mimetype - MIME type of the file
 * @returns {Promise<{ type: string, content: any }>} parsed content with type
 */
export async function parseFile(buffer, mimetype) {
  if (!buffer || !mimetype) {
    throw new Error("Buffer and mimetype are required");
  }

  let parsed = { type: "unknown", content: null };

  try {
    if (mimetype === "application/pdf") {
      const { text, images } = await parsePDFBuffer(buffer);
      parsed.type = "pdf";
      parsed.content = { text, images };
    } else if (
      mimetype === "text/csv" ||
      mimetype === "text/plain" ||
      mimetype.includes("excel") ||
      mimetype === "application/vnd.ms-excel" ||
      mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      if (mimetype === "text/csv") {
        const excelData = await parseExcelBuffer(buffer, "csv");
        parsed.type = "csv";
        parsed.content = excelData;
      } else if (
        mimetype.includes("excel") ||
        mimetype ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        const excelData = await parseExcelBuffer(buffer, "excel");
        parsed.type = "excel";
        parsed.content = excelData;
      } else {
        parsed.type = "text";
        parsed.content = parseTextBuffer(buffer);
      }
    } else if (mimetype === "text/plain") {
      parsed.type = "text";
      parsed.content = parseTextBuffer(buffer);
    } else {
      console.warn(`[FileUtils] Unsupported mimetype: ${mimetype}`);
      parsed.type = "unsupported";
      parsed.content = null;
    }
  } catch (err) {
    console.error("[FileUtils] parseFile error:", err);
    parsed.type = "error";
    parsed.content = null;
  }

  return parsed;
}
