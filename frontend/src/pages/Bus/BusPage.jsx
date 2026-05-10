import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { logEvent } from "../../api/client";

const DUMMY_STOPS = [
  { id: 1, name: "청산주차장", dist: "150m", next: 7, fav: true },
  { id: 2, name: "청산초등학교", dist: "320m", next: 22, fav: false },
  { id: 3, name: "면사무소 앞", dist: "480m", next: 35, fav: false },
  { id: 4, name: "궁촌 마을회관", dist: "1.2km", next: null, fav: false },
];

const FILTERS = [
  { value: "near", label: "📍 가까운 순" },
  { value: "fav", label: "⭐ 즐겨찾기" },
  { value: "alpha", label: "가나다순" },
];

export default function BusPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("near");
  const [stops, setStops] = useState(DUMMY_STOPS);
  const [apiStops, setApiStops] = useState([]);
  const redirected = useRef(false);

  useEffect(() => {
    logEvent("bus_tab_open");
    if (!redirected.current && !localStorage.getItem("busOnboardingDone")) {
      redirected.current = true;
      navigate("/bus/onboarding", { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.get("/bus/stops")
      .then(r => setApiStops(r.data))
      .catch(() => {});
  }, []);

  function toggleFav(id) {
    setStops(prev => prev.map(s => s.id === id ? { ...s, fav: !s.fav } : s));
  }

  const displayed = [...stops].filter(s => filter === "fav" ? s.fav : true)
    .sort((a, b) => {
      if (filter === "alpha") return a.name.localeCompare(b.name, "ko");
      return 0;
    });

  return (
    <div className="min-h-screen bg-cream">
      {/* 헤더 */}
      <header className="px-5 pt-14 pb-3 flex items-center justify-between sticky top-0 bg-cream z-10">
        <h1 className="text-xl font-bold text-ink">버스</h1>
        <button
          onClick={() => navigate("/bus/route")}
          className="text-ink text-xl"
        >
          🗺
        </button>
      </header>

      {/* 필터 칩 */}
      <div className="px-4 pb-3 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                filter === f.value
                  ? "bg-maul border-maul text-ink font-bold"
                  : "border-gray-300 text-sub bg-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 정류장 리스트 */}
      <div className="bg-white rounded-2xl mx-4 shadow-sm overflow-hidden fade-in">
        {displayed.length === 0 ? (
          <p className="text-center py-10 text-sub text-sm">즐겨찾기한 정류장이 없어요</p>
        ) : (
          displayed.map((stop, i) => (
            <div
              key={stop.id}
              className={`flex items-center px-5 py-4 ${i > 0 ? "border-t border-gray-100" : ""}`}
            >
              <button
                className="flex-1 flex items-center gap-4 text-left"
                onClick={() => {
                  logEvent("stop_viewed", { stop_id: stop.id });
                  navigate(`/bus/${stop.id}`);
                }}
              >
                <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-lg">
                  🚏
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{stop.name}</p>
                  <p className="text-xs text-sub mt-0.5">📍 {stop.dist}</p>
                </div>
                <div className="flex items-center gap-2 mr-2">
                  {stop.next !== null ? (
                    <span className="bg-maul text-ink text-xs font-bold px-2.5 py-1 rounded-full">
                      {stop.next}분
                    </span>
                  ) : (
                    <span className="text-xs text-sub">—</span>
                  )}
                </div>
              </button>
              <button
                onClick={() => toggleFav(stop.id)}
                className="text-xl ml-1 leading-none"
              >
                {stop.fav ? "⭐" : "☆"}
              </button>
            </div>
          ))
        )}
        {/* API 정류장 */}
        {apiStops.map((s, i) => (
          <div
            key={`api-${s.id}`}
            className="flex items-center px-5 py-4 border-t border-gray-100 cursor-pointer hover:bg-gray-50"
            onClick={() => navigate(`/bus/${s.id}`)}
          >
            <div className="w-10 h-10 rounded-full bg-cream flex items-center justify-center text-lg mr-4">
              🚏
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">{s.name}</p>
              {s.is_main && <p className="text-xs text-sub">주요 정류장</p>}
            </div>
            <span className="text-sub">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
