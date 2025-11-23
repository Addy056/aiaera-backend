// backend/utils/excelUtils.js
import XLSX from "xlsx";

/**
 * Parse Excel or CSV buffer and return structured data.
 *
 * Supports:
 *  - .xls
 *  - .xlsx
 *  - .csv
 *
 * @param {Buffer} buffer
 * @param {string} [fileType="excel"] - 'csv' or 'excel'
 * @returns {Promise<Object>} Object with sheet names as keys, array of row objects as values
 */
export async function parseExcelBuffer(buffer, fileType = "excel") {
  try {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error("Invalid or missing buffer.");
    }

    // 🔍 Detect CSV vs Excel
    const isCSV = fileType === "csv";

    // Read workbook
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      raw: false, // enables proper parsing
      codepage: 65001,
      ...(isCSV && { FS: ",", type: "binary" }),
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error("Workbook contains no sheets");
    }

    const result = {};

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return;

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: "", // prevents undefined values
        blankrows: false,
        raw: false,
        dateNF: "yyyy-mm-dd",
      });

      result[sheetName] = rows;
    });

    return result;
  } catch (err) {
    console.error("❌ [ExcelUtils] parseExcelBuffer error:", err.message);
    return {}; // return empty object so upload doesn't break
  }
}
