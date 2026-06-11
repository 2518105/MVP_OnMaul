import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "";
const api = axios.create({ baseURL: `${BASE}/api`, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("onboarding_completed");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

export async function logEvent(eventKey, properties = {}) {
  try {
    await api.post("/events", { event_key: eventKey, properties });
  } catch {}
}
