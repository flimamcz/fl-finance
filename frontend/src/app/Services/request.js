
import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://fl-finance.onrender.com");

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfToken = sessionStorage.getItem("csrfToken");
    if (csrfToken) {
      config.headers = config.headers || {};
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }
  return config;
});

export const requestPost = async (endpoint, body) => {
  const { data } = await api.post(endpoint, body);
  return data;
};

export const requestGet = async (endpoint) => {
  const { data } = await api.get(endpoint);
  return data;
};

export const requestUpdate = async (endpoint, body) => {
  const { data } = await api.patch(endpoint, body);
  return data;
};

export const requestDelete = async (endpoint) => {
  const { data } = await api.delete(endpoint);
  return data;
};

export default api;
