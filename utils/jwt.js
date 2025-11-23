import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const { JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV } = process.env;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET missing in environment variables.");
  throw new Error("JWT_SECRET is required.");
}

/**
 * Generate a signed JWT token
 * @param {Object} payload - Data to encode into the token
 * @returns {string} - Signed JWT token
 */
export const generateToken = (payload) => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN || "7d", // fallback for safety
    });
  } catch (err) {
    console.error("❌ Error generating token:", err.message);
    throw new Error("Failed to generate token");
  }
};

/**
 * Verify and decode a JWT token safely
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null if invalid
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (NODE_ENV !== "production") {
      console.warn("⚠️ Invalid or expired token:", err.message);
    }
    return null; // don't crash backend → return null for invalid token
  }
};
