import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BEFORE_OPTS = ["5분", "10분", "15분", "30분"];
const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const NOTIFY_OPTS = ["푸시", "소리+진동", "진동만"];

function Toast({ msg }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
      {msg}
    </div>
  );
}

function PillGroup({ options, value, onChange, multi = false }) {
  function handleClick(opt) {
    if (multi) {
      onChange(prev =>
        prev.includes(opt) ? prev.filter(d => d !== opt) : [...prev, opt]
      );
    } else {
      onChange(opt);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = multi ? value.includes(opt) : value === opt;
        return (
          <button
            key={opt}
            onClick={() => handleClick(opt)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              active
                ? "bg-maul border-maul text-ink font-bold"
                : "border-gray-300 text-sub bg-white"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function BusAlarmPage() {
  const { stopId } = useParams();
  const navigate = useNavigate();
  const [before, setBefore] = useState("10분");
  const [days, setDays] = useState(["월", "화", "수", "목", "금"]);
  const [notify, setNotify] = useState("소리+진동");
  const [toast, setToast] = useState("");

  function handleSave() {
    setToast("알림이 설정됐어요 🔔");
    setTimeout(() => navigate("/bus"), 1800);
  }

  return (
    <div className="min-h-screen bg-white">
      {toast && <Toast msg={toast} />}

      {/* 헤더 */}
      <header className="px-5 pt-14 pb-3 flex items-center gap-3 sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
        <h1 className="text-base font-bold text-ink">출발 알림 설정</h1>
      </header>

      <div className="px-4 space-y-5 pb-10">
        {/* 정류장 카드 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 fade-in">
          <span className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center"><span className="w-4 h-4 rounded-full bg-red-500 block" /></span>
          <div>
            <p className="text-sm font-bold text-ink">
              {stopId === "1" ? "청산주차장" : `정류장 ${stopId}`}
            </p>
            <p className="text-xs text-sub">541번 옥천행</p>
          </div>
        </div>

        {/* 몇 분 전 알림 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm fade-in-1">
          <p className="text-sm font-bold text-ink mb-3">몇 분 전에 알림 받을까요?</p>
          <PillGroup options={BEFORE_OPTS} value={before} onChange={setBefore} />
        </div>

        {/* 요일 선택 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm fade-in-2">
          <p className="text-sm font-bold text-ink mb-3">요일 선택</p>
          <PillGroup options={DAYS} value={days} onChange={setDays} multi />
        </div>

        {/* 시간대 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm fade-in-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink">알림 받을 시간대</p>
            <span className="text-xs text-sub">첫차 ~ 막차</span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm font-medium text-ink bg-white rounded-xl px-3 py-2">07:00</span>
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full relative">
              <div className="absolute left-0 right-0 h-1.5 bg-maul rounded-full" />
            </div>
            <span className="text-sm font-medium text-ink bg-white rounded-xl px-3 py-2">19:00</span>
          </div>
        </div>

        {/* 알림 방식 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm fade-in-4">
          <p className="text-sm font-bold text-ink mb-3">알림 방식</p>
          <PillGroup options={NOTIFY_OPTS} value={notify} onChange={setNotify} />
        </div>

        {/* 저장 버튼 */}
        <button onClick={handleSave} className="btn-maul fade-in-4">
          알림 저장
        </button>
      </div>
    </div>
  );
}
