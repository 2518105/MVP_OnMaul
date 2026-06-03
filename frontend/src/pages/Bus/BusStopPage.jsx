import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { logEvent } from "../../api/client";


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
  const [fav, setFav] = useState(false);
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

  const schedules = apiStop?.schedules ?? [];
  const nextIdx = schedules.findIndex(s => !isPast(s.departure_time));
  const nextBus = nextIdx >= 0 ? schedules[nextIdx] : null;
  const nextMins = nextBus ? minutesUntil(nextBus.departure_time) : null;

  return (
    <div className="min-h-screen bg-white">
      {toast && <Toast msg={toast} />}

      {/* 헤더 */}
      <header className="px-5 pt-14 pb-3 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
          <h1 className="text-base font-bold text-ink">{apiStop?.name ?? `정류장 ${stopId}`}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setFav(v => !v)} className="text-xl">
            <svg width="20" height="20" viewBox="0 0 24 24" fill={fav ? "#F59E0B" : "none"} stroke={fav ? "#F59E0B" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
        </div>
      </header>

      {/* 다음 버스 카드 */}
      {nextBus ? (
        <div className="mx-4 mb-4 bg-maul rounded-2xl p-5 shadow-sm fade-in">
          <p className="text-xs text-ink/60 font-medium mb-1">다음 버스</p>
          <p className="text-4xl font-bold text-ink">{nextMins}분 후</p>
          <p className="text-sm text-ink/70 mt-1">{nextBus.direction} · {nextBus.route_name}</p>
        </div>
      ) : (
        <div className="mx-4 mb-4 bg-gray-200 rounded-2xl p-5 text-center fade-in">
          <p className="text-sm text-sub">{schedules.length === 0 ? "시간표 없음" : "오늘 운행 종료"}</p>
        </div>
      )}

      {/* 시간표 */}
      <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden fade-in-1">
        <div className="px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-bold text-ink">시간표</span>
        </div>
        {schedules.length === 0 ? (
          <p className="text-center py-8 text-sub text-sm">등록된 시간표가 없어요</p>
        ) : (
          schedules.map((s, i) => {
            const past = isPast(s.departure_time);
            const isNext = i === nextIdx;
            return (
              <div
                key={s.id}
                className={`flex items-center px-5 py-3 ${i > 0 ? "border-t border-gray-50" : ""} ${isNext ? "bg-maul/10" : ""}`}
              >
                <span className={`font-mono text-sm w-14 ${past ? "text-gray-300 line-through" : isNext ? "text-ink font-bold" : "text-ink"}`}>
                  {s.departure_time}
                </span>
                <span className={`text-sm ml-3 flex-1 ${past ? "text-gray-300 line-through" : isNext ? "text-ink font-bold" : "text-sub"}`}>
                  {s.direction} · {s.route_name}
                </span>
                {isNext && (
                  <span className="text-xs bg-maul text-ink font-bold px-2 py-0.5 rounded-full">다음</span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mx-4 mt-4 mb-8">
        <button onClick={() => navigate("/bus")} className="btn-maul">
          ← 정류장 목록으로
        </button>
      </div>
    </div>
  );
}
