// backend/utils/excelUtils.js
import XLSX from "xlsx";

/**
 * Parse Excel or CSV buffer and return structured data
 * @param {Buffer} buffer
 * @param {string} [fileType="excel"] - 'csv' or 'excel'
 * @returns {Promise<Object>} Object with sheet names as keys and array of rows as values
 */
export async function parseExcelBuffer(buffer, fileType = "excel") {
  try {
    // Read workbook from buffer
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const result = {};

    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      result[sheetName] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    });

    return result;
  } catch (err) {
    console.error("[ExcelUtils] parseExcelBuffer error:", err);
    return {};
  }
}
