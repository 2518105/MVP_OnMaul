import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoute } from "../../constants/busData";

const FAV_KEY = "bus_favorites";
function getFavs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; }
  catch { return []; }
}

export default function BusDetailPage() {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const route = getRoute(routeId);
  const [tab, setTab] = useState("route");
  const [dir, setDir] = useState("down");
  const [favs, setFavs] = useState(getFavs);

  if (!route) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sub text-sm">노선 정보를 찾을 수 없어요</p>
      </div>
    );
  }

  const isFav = favs.includes(route.id);
  function toggleFav() {
    setFavs(prev => {
      const next = prev.includes(route.id)
        ? prev.filter(x => x !== route.id)
        : [...prev, route.id];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  }

  const currentDir = (dir === "up" && route.up) ? route.up : route.down;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="px-4 pt-14 pb-3 flex items-center gap-3 sticky top-0 bg-cream z-30">
        <button
          onClick={() => navigate(-1)}
          className="text-ink text-2xl leading-none pr-1"
          aria-label="뒤로 가기"
        >
          ←
        </button>
        <div className="w-10 h-10 rounded-full bg-maul flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-extrabold text-ink leading-none">{route.id}</span>
        </div>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-base font-bold text-ink">{route.id}번</span>
          <BadgePill badge={route.badge} />
        </div>
        <button
          onClick={toggleFav}
          className="text-xl leading-none pl-2"
          aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          {isFav ? "⭐" : "☆"}
        </button>
      </header>

      {/* Route meta */}
      <div className="px-5 pb-3">
        <p className="text-xs text-sub">
          {route.origin} → {route.destination}
        </p>
        <p className="text-xs text-sub mt-0.5">{route.tripsPerDay}</p>
      </div>

      {/* Main tabs */}
      <div className="flex border-b border-gray-200 px-5">
        {[["route", "노선도"], ["schedule", "시간표"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === v
                ? "border-maul-dark text-ink font-bold"
                : "border-transparent text-sub"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Direction subtabs */}
      {route.isBidirectional && (
        <div className="flex gap-2 px-5 pt-3">
          <button
            onClick={() => setDir("down")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              dir === "down"
                ? "bg-maul border-maul text-ink font-bold"
                : "border-gray-300 text-sub bg-white"
            }`}
          >
            ↓ {route.down.label}
          </button>
          <button
            onClick={() => setDir("up")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              dir === "up"
                ? "bg-maul border-maul text-ink font-bold"
                : "border-gray-300 text-sub bg-white"
            }`}
          >
            ↑ {route.up.label}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="pb-24 mt-4">
        {tab === "route" ? (
          <RouteMap stops={currentDir.stops} />
        ) : (
          <ScheduleTable stops={currentDir.stops} />
        )}
      </div>
    </div>
  );
}

function BadgePill({ badge }) {
  if (!badge) return null;
  const cls = badge === "급행"
    ? "bg-red-500 text-white"
    : "bg-orange-400 text-white";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{badge}</span>
  );
}

function RouteMap({ stops }) {
  return (
    <div className="px-5 space-y-0">
      {stops.map((stop, i) => {
        const isFirst = i === 0;
        const isLast = i === stops.length - 1;
        const isTerminal = isFirst || isLast;
        return (
          <div key={i} className="flex gap-3">
            {/* Timeline column */}
            <div className="flex flex-col items-center w-7 flex-shrink-0">
              <div className={`w-0.5 ${isFirst ? "h-3 opacity-0" : "h-3 bg-maul-dark"}`} />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 ${
                isTerminal
                  ? "bg-maul border-maul-dark text-ink"
                  : "bg-white border-maul text-ink"
              }`}>
                {i + 1}
              </div>
              <div className={`w-0.5 flex-1 ${isLast ? "opacity-0" : "bg-maul-dark"}`} style={{ minHeight: "12px" }} />
            </div>
            {/* Stop info */}
            <div className={`pb-2 pt-1 flex-1 min-w-0 ${isLast ? "" : "border-b border-gray-100"}`}>
              <p className={`text-sm leading-snug ${isTerminal ? "font-bold text-ink" : "text-ink"}`}>
                {stop.name}
              </p>
              {stop.note && (
                <p className="text-xs text-sub mt-0.5">{stop.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScheduleTable({ stops }) {
  const tripCount = stops[0]?.times?.length ?? 0;
  if (tripCount === 0) {
    return (
      <p className="text-center py-10 text-sub text-sm">시간표 정보가 없어요</p>
    );
  }

  return (
    <div className="overflow-x-auto mx-4 rounded-xl shadow-sm">
      <table className="w-max min-w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-maul text-ink text-left px-3 py-2.5 text-xs font-bold min-w-[120px] border-r border-maul-dark">
              정류장
            </th>
            {Array.from({ length: tripCount }, (_, i) => (
              <th key={i} className="bg-maul text-ink text-center px-4 py-2.5 text-xs font-bold min-w-[68px] whitespace-nowrap">
                {i + 1}회차
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stops.map((stop, i) => {
            const isTerminal = i === 0 || i === stops.length - 1;
            const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
            return (
              <tr key={i}>
                <td className={`sticky left-0 z-10 px-3 py-2 text-left border-r border-gray-100 text-xs ${rowBg} ${
                  isTerminal ? "font-bold text-ink" : "text-ink"
                }`}>
                  <span>{stop.name}</span>
                  {stop.note && (
                    <span className="block text-sub font-normal text-[10px] leading-tight">{stop.note}</span>
                  )}
                </td>
                {stop.times.map((t, j) => (
                  <td key={j} className={`text-center text-xs px-4 py-2 ${rowBg} ${
                    isTerminal ? "font-bold text-ink" : "text-ink"
                  }`}>
                    {t}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
