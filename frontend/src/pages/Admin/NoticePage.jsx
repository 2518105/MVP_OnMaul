import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client";

const SOURCE_FILTERS = ["전체", "면사무소", "이장", "자치회"];

const SOURCE_STYLE = {
  자치회:   { bg: "bg-[#FFE8E8]", badge: "bg-[#FFE8E8] text-[#C0392B]" },
  면사무소: { bg: "bg-[#FFFAE8]", badge: "bg-[#F5C842] text-[#7A6A00]" },
  이장:     { bg: "bg-[#E8F4E8]", badge: "bg-[#E8F4E8] text-[#2E7D32]" },
};

const DUMMY_NOTICES = [
  { id: 1, source: "자치회",   daysAgo: "어제",    title: "5월 마을회의 안건 안내", read: false, attachments: 0, type: "notice" },
  { id: 2, source: "면사무소", daysAgo: "2일 전",  title: "농약 안전교육 신청",     read: false, attachments: 0, type: "notice" },
  { id: 3, source: "이장",     daysAgo: "5일 전",  title: "4월 마을 운영비 정산",   read: true,  attachments: 0, type: "minutes" },
  { id: 4, source: "면사무소", daysAgo: "10일 전", title: "대청호 모기 방역 일정",  read: true,  attachments: 1, type: "notice" },
];

export default function NoticePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewType = searchParams.get("type") === "minutes" ? "minutes" : "notice";
  const [filter, setFilter] = useState("전체");
  const [notices, setNotices] = useState(DUMMY_NOTICES);
  const [readIds, setReadIds] = useState(new Set(DUMMY_NOTICES.filter(n => n.read).map(n => n.id)));

  useEffect(() => {
    api.get("/admin/notices", { params: viewType === "minutes" ? { category: "회의록" } : {} })
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        const mapped = list.map(n => ({
          id: `api-${n.id}`,
          source: n.category,
          daysAgo: new Date(n.created_at).toLocaleDateString("ko-KR"),
          title: n.title,
          read: false,
          attachments: 0,
          type: "notice",
        }));
        if (mapped.length > 0) setNotices(prev => [...prev, ...mapped]);
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
    <div className="min-h-screen bg-cream">
      {/* 헤더 */}
      <header className="px-5 pt-14 pb-3 flex items-center justify-between sticky top-0 bg-cream z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
          <h1 className="text-base font-bold text-ink">{title}</h1>
        </div>
        <button className="text-xl">🔍</button>
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
                  {n.attachments > 0 && <span>📎 {n.attachments}개</span>}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="h-8" />
    </div>
  );
}
