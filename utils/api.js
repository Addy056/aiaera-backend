// src/api/api.js
import axios from "axios";

// Ensure API root exists
const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  console.error("❌ Missing VITE_API_URL in .env");
}

const api = axios.create({
  baseURL: API_URL, // must include /api
  timeout: 20000,   // prevent hanging
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: Attach auth token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sb-access-token"); // Supabase JWT
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
