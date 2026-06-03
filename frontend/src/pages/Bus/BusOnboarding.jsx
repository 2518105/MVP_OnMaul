import { useNavigate } from "react-router-dom";

const DESTINATIONS = [
  {
    icon: "🏙",
    label: "옥천읍 (장보기)",
    desc: "하루 4회 · 약 40분",
    stopId: "1",
  },
  {
    icon: "🏥",
    label: "병원",
    desc: "옥천 보건소 · 성모병원",
    stopId: "1",
  },
  {
    icon: "🚉",
    label: "대전 (환승)",
    desc: "옥천터미널 환승 약 1시간 20분",
    stopId: "1",
  },
  {
    icon: "🌲",
    label: "보은",
    desc: "하루 5회 · 약 50분",
    stopId: "1",
  },
  {
    icon: "✋",
    label: "나중에 정할게요",
    desc: "정류장 목록 보기",
    stopId: null,
  },
];

export default function BusOnboarding() {
  const navigate = useNavigate();

  function handleSelect(dest) {
    localStorage.setItem("busOnboardingDone", "1");
    if (dest.stopId) {
      navigate(`/bus/${dest.stopId}`);
    } else {
      navigate("/bus");
    }
  }

  function handleSkip() {
    localStorage.setItem("busOnboardingDone", "1");
    navigate("/bus");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="px-5 pt-14 pb-3 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleSkip} className="text-ink text-xl font-light">←</button>
          <div>
            <p className="text-xs text-sub">이주민 전용 가이드 · Step 1/3</p>
          </div>
        </div>
        <button onClick={handleSkip} className="text-sm text-sub underline underline-offset-2">
          건너뛰기
        </button>
      </header>

      {/* 안내 카드 */}
      <div className="mx-4 mb-5">
        <div className="bg-maul rounded-2xl p-5 shadow-sm fade-in">
          <p className="text-lg font-bold text-ink leading-snug">
            안녕하세요!<br />
            청산면에서<br />
            버스로 어디까지 갈 수 있는지<br />
            보여드릴게요 🚌
          </p>
        </div>
      </div>

      {/* 질문 */}
      <p className="px-5 text-sm font-bold text-ink mb-3 fade-in-1">
        가장 자주 가는 곳은?
      </p>

      {/* 목적지 리스트 */}
      <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden fade-in-1">
        {DESTINATIONS.map((dest, i) => (
          <button
            key={dest.label}
            onClick={() => handleSelect(dest)}
            className={`w-full flex items-center px-5 py-4 text-left hover:bg-white transition-colors ${
              i > 0 ? "border-t border-gray-100" : ""
            }`}
          >
            <span className="text-2xl mr-4">{dest.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">{dest.label}</p>
              <p className="text-xs text-sub mt-0.5">{dest.desc}</p>
            </div>
            <span className="text-sub text-lg">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
