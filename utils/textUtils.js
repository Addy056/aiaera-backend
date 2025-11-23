// backend/utils/textUtils.js

/**
 * Safely parse a Buffer or string into clean UTF-8 text.
 *
 * @param {Buffer|string|null|undefined} input
 * @returns {string}
 */
export function parseTextBuffer(input) {
  try {
    // 🧹 Handle null / undefined
    if (input == null) {
      console.warn("[TextUtils] parseTextBuffer received null/undefined");
      return "";
    }

    // 🔄 Handle Buffer input
    if (Buffer.isBuffer(input)) {
      return input.toString("utf-8").trim();
    }

    // 🔤 Handle string input
    if (typeof input === "string") {
      return input.trim();
    }

    // ❓ Unknown data type
    console.warn("[TextUtils] Unsupported input type:", typeof input);
    return "";
  } catch (err) {
    console.error("[TextUtils] parseTextBuffer error:", err.message || err);
    return "";
  }
}
