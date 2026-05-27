import api from "./client";

export async function login(username, password) {
  const { data } = await api.post("/auth/login", { username, password });
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("user", JSON.stringify({ nickname: data.nickname, userType: data.user_type, id: data.user_id }));
  return data;
}

export async function register(username, nickname, password, userType) {
  const { data } = await api.post("/auth/register", { username, nickname, password, user_type: userType });
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("user", JSON.stringify({ nickname: data.nickname, userType: data.user_type, id: data.user_id }));
  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getUser() {
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}
