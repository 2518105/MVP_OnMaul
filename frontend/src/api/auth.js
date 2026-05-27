import api from "./client";

function saveSession(data) {
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("user", JSON.stringify({ nickname: data.nickname, userType: data.user_type, id: data.user_id }));
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
}

export function getUser() {
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}
