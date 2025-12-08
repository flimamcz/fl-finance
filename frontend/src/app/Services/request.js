import axios from "axios";

const api = axios.create({
  baseURL: `http://192.168.0.10:3001}`,
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
  api.defaults.headers.common.Authorization = token;
};

export default api;
