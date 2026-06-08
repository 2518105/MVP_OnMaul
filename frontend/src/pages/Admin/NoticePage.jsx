import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client";

const SOURCE_FILTERS = ["전체", "면사무소", "이장", "자치회"];

const SOURCE_STYLE = {
  자치회:   { bg: "bg-[#FFE8E8]", badge: "bg-[#FFE8E8] text-[#C0392B]" },
  면사무소: { bg: "bg-white", badge: "bg-maul text-white" },
  이장:     { bg: "bg-[#E8F4E8]", badge: "bg-[#E8F4E8] text-[#2E7D32]" },
};

export default function NoticePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewType = searchParams.get("type") === "minutes" ? "minutes" : "notice";
  const [filter, setFilter] = useState("전체");
  const [notices, setNotices] = useState([]);
  const [readIds, setReadIds] = useState(new Set());

  useEffect(() => {
    api.get("/admin/notices")
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        const mapped = list.map(n => ({
          id: n.id,
          source: n.category,
          daysAgo: new Date(n.created_at).toLocaleDateString("ko-KR"),
          title: n.title,
          read: false,
          attachments: 0,
          type: "notice",
        }));
        setNotices(mapped);
      })
      .catch(() => {});
  }, [viewType]);

  const displayed = (Array.isArray(notices) ? notices : [])
    .filter(n => viewType === "minutes" ? n.type === "minutes" : n.type === "notice")
    .filter(n => filter === "전체" || n.source === filter);

  function handleClick(n) {
    setReadIds(prev => new Set([...prev, n.id]));
    navigate(`/admin/detail/${n.id}`);
  }

  const title = viewType === "minutes" ? "회의록" : "공지사항";

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="px-5 pt-14 pb-3 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
          <h1 className="text-base font-bold text-ink">{title}</h1>
        </div>
        <button className="text-sub"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button>
      </header>

      {/* 출처 필터 칩 */}
      <div className="px-4 pb-3 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {SOURCE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                filter === f
                  ? "bg-maul border-maul text-ink font-bold"
                  : "border-gray-300 text-sub bg-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* 공지 카드 리스트 */}
      <div className="px-4 space-y-3 fade-in">
        {displayed.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-sub text-sm shadow-sm">
            등록된 {title}이 없어요
          </div>
        ) : (
          displayed.map(n => {
            const style = SOURCE_STYLE[n.source] ?? { bg: "bg-white", badge: "bg-gray-100 text-gray-700" };
            const isRead = readIds.has(n.id);
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow ${style.bg}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${style.badge}`}>
                    {n.source}
                  </span>
                  <span className="text-xs text-sub ml-auto">{n.daysAgo}</span>
                </div>
                <p className={`text-sm font-bold text-ink leading-snug ${isRead ? "opacity-60" : ""}`}>
                  {n.title}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-sub">
                  <span>{isRead ? "읽음" : "아직 안 읽음"}</span>
                  {n.attachments > 0 && <span className="flex items-center gap-1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg> {n.attachments}개</span>}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="px-4 pt-4 pb-6">
        <a
          href="https://www.oc.go.kr/www/selectBbsNttList.do?bbsNo=36&key=232&"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-maul rounded-2xl px-4 py-3 shadow-lg"
        >
          <span className="text-sm font-bold text-ink">더 보고싶다면? →</span>
          <span className="text-xs text-white">옥천군 홈페이지 →</span>
        </a>
      </div>
    </div>
  );
}
