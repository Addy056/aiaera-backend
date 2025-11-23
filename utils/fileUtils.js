// backend/utils/fileUtils.js
import { parsePDFBuffer } from "./pdfUtils.js";
import { parseExcelBuffer } from "./excelUtils.js";
import { parseTextBuffer } from "./textUtils.js";

/**
 * Unified file parser
 * Determines file type from mimetype and parses accordingly.
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @returns {Promise<{ type: string, content: any }>}
 */
export async function parseFile(buffer, mimetype) {
  if (!buffer || !mimetype) {
    throw new Error("Buffer and mimetype are required");
  }

  let parsed = { type: "unknown", content: null };

  try {
    /* -------------------------------------------------------------
     * 📝 PDF FILE
     * ------------------------------------------------------------- */
    if (mimetype === "application/pdf") {
      const { text, images } = await parsePDFBuffer(buffer);
      return {
        type: "pdf",
        content: { text, images },
      };
    }

    /* -------------------------------------------------------------
     * 🧾 CSV FILE
     * ------------------------------------------------------------- */
    if (mimetype === "text/csv") {
      const csvData = await parseExcelBuffer(buffer, "csv");
      return {
        type: "csv",
        content: csvData,
      };
    }

    /* -------------------------------------------------------------
     * 📊 EXCEL FILE (.xls, .xlsx)
     * ------------------------------------------------------------- */
    if (
      mimetype === "application/vnd.ms-excel" || // .xls
      mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || // .xlsx
      mimetype.includes("spreadsheet") || // fallback
      mimetype.includes("excel") // generic
    ) {
      const excelData = await parseExcelBuffer(buffer, "excel");
      return {
        type: "excel",
        content: excelData,
      };
    }

    /* -------------------------------------------------------------
     * 📄 PLAIN TEXT
     * ------------------------------------------------------------- */
    if (mimetype === "text/plain") {
      return {
        type: "text",
        content: parseTextBuffer(buffer),
      };
    }

    /* -------------------------------------------------------------
     * ❌ UNSUPPORTED FORMAT
     * ------------------------------------------------------------- */
    console.warn(`[FileUtils] Unsupported file type: ${mimetype}`);
    return {
      type: "unsupported",
      content: null,
    };

  } catch (err) {
    console.error("[FileUtils] parseFile error:", err.message || err);
    return {
      type: "error",
      content: null,
    };
  }
}
