import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "";
const api = axios.create({ baseURL: `${BASE}/api`, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

export async function logEvent(eventKey, properties = {}) {
  try {
    await api.post("/events", { event_key: eventKey, properties });
  } catch {}
}
