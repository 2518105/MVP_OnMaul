import { useNavigate, useSearchParams } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "";

  return (
    <div className="min-h-screen bg-cream flex flex-col px-6 pt-16 pb-10">
      {/* 헤더 */}
      <div className="mb-10 fade-in">
        <h1 className="text-3xl font-bold text-ink leading-snug">
          환영해요<br />청산면 이웃 님
        </h1>
        <p className="text-sub mt-2 text-sm">휴대폰 번호로 1분 만에 시작</p>
      </div>

      {/* CTA 버튼 영역 */}
      <div className="flex flex-col gap-3 fade-in-1">
        <button
          onClick={() => navigate(`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`)}
          className="btn-maul flex items-center justify-center gap-2"
        >
          <span>🏠</span>
          <span>휴대폰 번호 인증</span>
        </button>

        <button
          className="btn-outline flex items-center justify-center gap-2"
        >
          <span>💬</span>
          <span>카카오로 시작하기</span>
        </button>
      </div>

      {/* 먼저 둘러볼게요 */}
      <div className="mt-6 text-center fade-in-2">
        <button
          onClick={() => next ? navigate(-1) : navigate("/home")}
          className="text-sm text-sub underline underline-offset-2"
        >
          먼저 둘러볼게요
        </button>
      </div>

      {/* 하단 안내 */}
      <div className="mt-auto pt-8 fade-in-3">
        <p className="text-xs text-sub text-center leading-relaxed">
          가입 시 닉네임 + 이주민/주민 구분만 입력합니다.<br />
          이메일·비밀번호는 받지 않아요.
        </p>
      </div>
    </div>
  );
}
