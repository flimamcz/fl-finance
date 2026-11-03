
import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://fl-finance.onrender.com");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
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

export const setToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = token;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export default api;
