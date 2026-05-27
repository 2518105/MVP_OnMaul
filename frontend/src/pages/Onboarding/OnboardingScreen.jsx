import { useNavigate } from "react-router-dom";

const FEATURES = [
  {
    num: "01",
    icon: "💬",
    title: "게시판",
    desc: "이웃에게 한 마디 묻기",
    highlight: true,
  },
  {
    num: "02",
    icon: "🚌",
    title: "버스",
    desc: "시간표 + 출발 알림",
    highlight: false,
  },
  {
    num: "03",
    icon: "📋",
    title: "행정",
    desc: "마을 일정 + 회의록",
    highlight: false,
  },
];

export default function OnboardingScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream flex flex-col px-6 pt-14 pb-10">
      {/* 상단 */}
      <div className="flex items-center justify-between mb-8 fade-in">
        <h2 className="text-2xl font-bold text-ink">처음 오셨어요?</h2>
        <button
          onClick={() => navigate("/home")}
          className="text-sm text-sub underline underline-offset-2"
        >
          건너뛰기
        </button>
      </div>

      {/* 기능 카드 목록 */}
      <div className="flex flex-col gap-3 flex-1">
        {FEATURES.map((f, i) => (
          <div
            key={f.num}
            className={`rounded-2xl p-5 shadow-sm fade-in-${i + 1} ${
              f.highlight ? "bg-maul" : "bg-white"
            }`}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{f.icon}</span>
              <div>
                <p className="text-xs font-semibold text-ink/50 mb-0.5">{f.num}</p>
                <h3 className="text-lg font-bold text-ink">{f.title}</h3>
                <p className="text-sm text-sub mt-0.5">{f.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 CTA */}
      <div className="mt-6 fade-in-4">
        <button
          onClick={() => navigate("/home")}
          className="btn-maul"
        >
          3가지 모두 살펴보기
        </button>
      </div>
    </div>
  );
}
