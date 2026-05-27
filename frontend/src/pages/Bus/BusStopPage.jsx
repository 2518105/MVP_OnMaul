import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { logEvent } from "../../api/client";

const DAY_TABS = [
  { value: "weekday", label: "평일" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일·공휴일" },
];

const DUMMY_SCHEDULES = {
  weekday: [
    { time: "08:00", route: "541번", dir: "옥천행" },
    { time: "10:30", route: "541번", dir: "옥천행" },
    { time: "12:30", route: "541번", dir: "옥천행" },
    { time: "15:30", route: "541번", dir: "옥천행" },
    { time: "17:00", route: "503번", dir: "동이행" },
  ],
  sat: [
    { time: "09:00", route: "541번", dir: "옥천행" },
    { time: "14:00", route: "541번", dir: "옥천행" },
  ],
  sun: [
    { time: "10:00", route: "541번", dir: "옥천행" },
  ],
};

function isPast(timeStr) {
  const now = new Date();
  const [h, m] = timeStr.split(":").map(Number);
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  return now > t;
}

function minutesUntil(timeStr) {
  const now = new Date();
  const [h, m] = timeStr.split(":").map(Number);
  const t = new Date(now);
  t.setHours(h, m, 0, 0);
  return Math.round((t - now) / 60000);
}

function Toast({ msg }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
      {msg}
    </div>
  );
}

export default function BusStopPage() {
  const { stopId } = useParams();
  const navigate = useNavigate();
  const [day, setDay] = useState("weekday");
  const [fav, setFav] = useState(stopId === "1");
  const [toast, setToast] = useState("");
  const [apiStop, setApiStop] = useState(null);

  useEffect(() => {
    api.get(`/bus/stops/${stopId}`)
      .then(r => setApiStop(r.data))
      .catch(() => {});
    logEvent("stop_viewed", { stop_id: Number(stopId) });
  }, [stopId]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  const stopName = apiStop?.name ?? (stopId === "1" ? "청산주차장" : `정류장 ${stopId}`);
  const schedules = DUMMY_SCHEDULES[day];
  const nextIdx = schedules.findIndex(s => !isPast(s.time));
  const nextBus = nextIdx >= 0 ? schedules[nextIdx] : null;
  const nextMins = nextBus ? minutesUntil(nextBus.time) : null;

  return (
    <div className="min-h-screen bg-cream">
      {toast && <Toast msg={toast} />}

      {/* 헤더 */}
      <header className="px-5 pt-14 pb-3 flex items-center justify-between sticky top-0 bg-cream z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
          <h1 className="text-base font-bold text-ink">{stopName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setFav(v => !v)} className="text-xl">
            {fav ? "⭐" : "☆"}
          </button>
          <button
            onClick={() => navigate(`/bus/alarm/${stopId}`)}
            className="text-xl"
          >
            🔔
          </button>
        </div>
      </header>

      {/* 요일 탭 */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl flex overflow-hidden shadow-sm">
          {DAY_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setDay(t.value)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                day === t.value
                  ? "border-maul text-ink font-bold"
                  : "border-transparent text-sub"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="flex items-center px-3">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">🌱봄철</span>
          </div>
        </div>
      </div>

      {/* 다음 버스 카드 */}
      {nextBus ? (
        <div className="mx-4 mb-4 bg-maul rounded-2xl p-5 shadow-sm fade-in">
          <p className="text-xs text-ink/60 font-medium mb-1">다음 버스</p>
          <p className="text-4xl font-bold text-ink">{nextMins}분 후</p>
          <p className="text-sm text-ink/70 mt-1">{nextBus.dir} · {nextBus.route}</p>
        </div>
      ) : (
        <div className="mx-4 mb-4 bg-gray-200 rounded-2xl p-5 text-center fade-in">
          <p className="text-sm text-sub">오늘 운행 종료</p>
        </div>
      )}

      {/* 시간표 */}
      <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden fade-in-1">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-bold text-ink">오늘의 시간표</span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">[봄철]</span>
        </div>
        {schedules.map((s, i) => {
          const past = isPast(s.time);
          const isNext = i === nextIdx;
          return (
            <div
              key={i}
              className={`flex items-center px-5 py-3 ${i > 0 ? "border-t border-gray-50" : ""} ${
                isNext ? "bg-maul/10" : ""
              }`}
            >
              <span
                className={`font-mono text-sm w-14 ${
                  past ? "text-gray-300 line-through" : isNext ? "text-ink font-bold" : "text-ink"
                }`}
              >
                {s.time}
              </span>
              <span
                className={`text-sm ml-3 flex-1 ${
                  past ? "text-gray-300 line-through" : isNext ? "text-ink font-bold" : "text-sub"
                }`}
              >
                {s.dir} {s.route}
              </span>
              {isNext && (
                <span className="text-xs bg-maul text-ink font-bold px-2 py-0.5 rounded-full">
                  다음
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 노선도 버튼 */}
      <div className="mx-4 mt-4 mb-8">
        <button
          onClick={() => navigate("/bus/route")}
          className="btn-maul"
        >
          🗺 이 정류장 노선도
        </button>
      </div>
    </div>
  );
}
