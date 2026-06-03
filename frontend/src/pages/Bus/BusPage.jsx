import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { logEvent } from "../../api/client";

const FAV_KEY = "bus_favorites";
function getFavs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; }
  catch { return []; }
}

export default function BusPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [favs, setFavs] = useState(getFavs);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    logEvent("bus_tab_open");
    api.get("/bus/routes")
      .then(res => setRoutes(res.data))
      .catch(err => setError("노선 정보를 불러오지 못했어요"))
      .finally(() => setLoading(false));
  }, []);

  function toggleFav(id, e) {
    e.stopPropagation();
    setFavs(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  }

  const filtered = routes.filter(r => {
    if (tab === "fav" && !favs.includes(r.id)) return false;
    if (search.trim()) {
      const q = search.trim();
      return (
        r.id.includes(q) ||
        r.origin.includes(q) ||
        r.destination.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-10 bg-white">
        <header className="px-5 pt-14 pb-3">
          <h1 className="text-xl font-bold text-ink mb-3">버스</h1>
          <div className="flex items-center bg-white rounded-xl px-3 py-2.5 border border-gray-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sub mr-2 flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="flex-1 text-sm text-ink bg-transparent outline-none placeholder-sub"
              placeholder="노선번호, 지역명으로 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-sub text-xs ml-1">✕</button>
            )}
          </div>
        </header>

        <div className="flex gap-4 px-5 mb-0 border-b border-gray-200">
          {[["all", "전체 버스"], ["fav", "즐겨찾기"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`pb-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === v ? "border-maul-dark text-ink font-bold" : "border-transparent text-sub"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-2 pb-24 space-y-2">
        {loading ? (
          <p className="text-center py-12 text-sub text-sm">노선 정보를 불러오는 중...</p>
        ) : error ? (
          <p className="text-center py-12 text-sub text-sm">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-sub text-sm">
            {tab === "fav" ? "즐겨찾기한 노선이 없어요" : "검색 결과가 없어요"}
          </p>
        ) : (
          filtered.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              isFav={favs.includes(route.id)}
              onFav={toggleFav}
              onClick={() => {
                logEvent("bus_route_viewed", { route_id: route.id });
                navigate(`/bus/${route.id}`);
              }}
            />
          ))
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

function RouteCard({ route, isFav, onFav, onClick }) {
  return (
    <div
      className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
      onClick={onClick}
    >
      <div className="w-14 h-14 rounded-full bg-maul flex items-center justify-center flex-shrink-0">
        <span className="text-lg font-extrabold text-ink leading-none">{route.id}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-base font-bold text-ink">{route.id}번</span>
          <BadgePill badge={route.badge} />
        </div>
        <p className="text-xs text-sub truncate">
          {route.origin} → {route.destination}
        </p>
        <p className="text-xs text-sub mt-0.5">{route.tripsPerDay}</p>
      </div>
      <button
        onClick={e => onFav(route.id, e)}
        className="text-xl leading-none flex-shrink-0 pl-2"
        aria-label={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill={isFav ? "#F59E0B" : "none"} stroke={isFav ? "#F59E0B" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
    </div>
  );
}
