// config/env.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// For ESM modules, get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Supabase settings
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Backend base URL
export const BACKEND_URL = process.env.VITE_BACKEND_URL || "https://aiaera-backend.onrender.com";

// Default Supabase storage bucket
export const SUPABASE_BUCKET = process.env.VITE_SUPABASE_BUCKET || "chatbot-files";

// Validate critical variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase URL or Service Role Key missing in .env!");
  process.exit(1);
}
