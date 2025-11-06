// backend/utils/index.js
// Centralized exports for cleaner imports

export { default as supabase } from "./supabaseClient.js";
export { askLLM } from "./groqClient.js";  // ✅ fix: export named function, not default
export { jwtConfig } from "./jwtConfig.js";
export { default as razorpay } from "./razorpayConfig.js";
export { metaConfig } from "./metaConfig.js";
