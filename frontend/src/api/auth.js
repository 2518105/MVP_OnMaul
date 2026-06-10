import api from "./client";

function saveSession(data) {
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("user", JSON.stringify({ nickname: data.nickname, userType: data.user_type, id: data.user_id }));
  localStorage.setItem("onboarding_completed", String(data.onboarding_completed ?? false));
}

export async function register(username, nickname, password, userType) {
  const { data } = await api.post("/auth/register", { username, nickname, password, user_type: userType });
  saveSession(data);
  return data;
}

export async function login(username, password) {
  const { data } = await api.post("/auth/login", { username, password });
  saveSession(data);
  return data;
}

export async function kakaoLogin(code, redirectUri) {
  const { data } = await api.post("/auth/kakao", { code, redirect_uri: redirectUri });
  saveSession(data);
  return data;  // is_new_user 포함
}

export function initiateKakaoOAuth() {
  const restApiKey = import.meta.env.VITE_KAKAO_REST_API_KEY;
  if (!restApiKey) {
    alert("카카오 로그인 키가 설정되지 않았습니다.");
    return;
  }
  const redirectUri = `${window.location.origin}/auth/kakao/callback`;
  const url = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${restApiKey}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  window.location.href = url;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("onboarding_completed");
}

export async function checkNickname(nickname) {
  const { data } = await api.get(`/users/check-nickname?nickname=${encodeURIComponent(nickname)}`);
  return data;
}

export async function completeOnboarding({ nickname, residentType, villageName }) {
  const { data } = await api.patch("/users/me/onboarding", {
    nickname,
    resident_type: residentType,
    village_name: villageName,
  });
  const user = getUser();
  if (user) {
    user.nickname = nickname;
    user.userType = residentType;
    localStorage.setItem("user", JSON.stringify(user));
  }
  localStorage.setItem("onboarding_completed", "true");
  return data;
}

export function getUser() {
  if (!localStorage.getItem("token")) return null;
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

// 현재 로그인한 사용자의 프사만 localStorage에서 꺼낼 수 있음.
// 다른 사람의 사진은 백엔드에 저장되지 않아 null 반환.
export function getAuthorPhoto(nickname) {
  const user = getUser();
  if (user && user.nickname === nickname) {
    return localStorage.getItem("profile_photo") || null;
  }
  return null;
}
