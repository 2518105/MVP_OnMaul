import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { initiateKakaoOAuth } from "../../api/auth";
import api from "../../api/client";

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 1C4.582 1 1 3.896 1 7.46c0 2.26 1.498 4.243 3.76 5.367l-.96 3.572c-.084.314.29.566.563.38L8.57 14.4A9.8 9.8 0 0 0 9 14.42c4.418 0 8-2.896 8-6.46C17 3.896 13.418 1 9 1z"
        fill="#191919"
      />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "";

  // Render 슬립 방지: 페이지 진입 시 백엔드 미리 깨움
  useEffect(() => {
    api.get("/health").catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-16 pb-10">
      <div className="mb-10 fade-in">
        <h1 className="text-3xl font-bold text-ink leading-snug">
          환영해요<br />청산면 이웃 님
        </h1>
        <p className="text-sub mt-2 text-sm">카카오로 로그인하고 이웃과 연결되세요</p>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 fade-in-1">
        <button
          type="button"
          onClick={initiateKakaoOAuth}
          className="w-full flex items-center justify-center gap-2 bg-[#FEE500] text-[#191919] font-semibold py-4 rounded-xl hover:bg-[#f5dc00] active:bg-[#e5d500] transition-colors text-base"
        >
          <KakaoIcon />
          카카오로 로그인
        </button>
      </div>

      <div className="mt-6 text-center fade-in-2">
        <button
          type="button"
          onClick={() => next ? navigate(-1) : navigate("/home")}
          className="text-sm text-sub underline underline-offset-2"
        >
          먼저 둘러볼게요
        </button>
      </div>
    </div>
  );
}
