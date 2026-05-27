import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { kakaoLogin } from "../../api/auth";

export default function KakaoCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      navigate("/login", { replace: true });
      return;
    }

    // sessionStorage로 중복 호출 방지 (React StrictMode 대응)
    const key = `kakao_processed_${code}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    const redirectUri = `${window.location.origin}/auth/kakao/callback`;
    kakaoLogin(code, redirectUri)
      .then((data) => {
        sessionStorage.removeItem(key);
        if (data.is_new_user) {
          navigate("/onboarding", { replace: true });
        } else {
          navigate("/home", { replace: true });
        }
      })
      .catch((err) => {
        sessionStorage.removeItem(key);
        const msg = err.response?.data?.detail || err.message || "카카오 로그인 오류";
        setErrorMsg(msg);
      });
  }, []);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-red-500 text-sm text-center font-medium">{errorMsg}</p>
        <button onClick={() => navigate("/login")} className="btn-maul w-auto px-8">
          다시 로그인하기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-maul-dark dot-bounce" />
        <span className="w-2.5 h-2.5 rounded-full bg-maul-dark dot-bounce" />
        <span className="w-2.5 h-2.5 rounded-full bg-maul-dark dot-bounce" />
      </div>
      <p className="text-sub text-sm">카카오 로그인 중...</p>
    </div>
  );
}
