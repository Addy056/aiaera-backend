// backend/utils/textUtils.js
/**
 * Parse plain text buffer or string
 * @param {Buffer|string} input
 * @returns {string} UTF-8 string content
 */
export function parseTextBuffer(input) {
  try {
    if (Buffer.isBuffer(input)) {
      return input.toString("utf-8").trim();
    }
    if (typeof input === "string") {
      return input.trim();
    }
    console.warn("[TextUtils] Unsupported input type for parseTextBuffer");
    return "";
  } catch (err) {
    console.error("[TextUtils] parseTextBuffer error:", err);
    return "";
  }
}
