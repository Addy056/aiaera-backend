// backend/utils/jwtConfig.js
import "dotenv/config";

const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

if (!JWT_SECRET) {
  throw new Error(
    "[JWT Config] Missing JWT_SECRET in environment variables. Set a strong secret key!"
  );
}

if (JWT_SECRET.length < 32) {
  console.warn(
    "[JWT Config] WARNING: Your JWT_SECRET is weak (less than 32 characters). Use a stronger key in production!"
  );
}

export const jwtConfig = {
  secret: JWT_SECRET,
  expiresIn: JWT_EXPIRES_IN || "7d", // default to 7 days
};
