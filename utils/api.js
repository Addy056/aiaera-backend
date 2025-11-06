import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // points to deployed Render backend
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
