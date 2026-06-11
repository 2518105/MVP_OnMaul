import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { logEvent } from "../../api/client";
import { getUser } from "../../api/auth";

const SOURCE_STYLE = {
  자치회:   { bg: "bg-[#FFE8E8]", badge: "bg-[#FFE8E8] text-[#C0392B]" },
  면사무소: { bg: "bg-white", badge: "bg-maul text-white" },
  이장:     { bg: "bg-[#E8F4E8]", badge: "bg-[#E8F4E8] text-[#2E7D32]" },
};

const HOST_COLOR = {
  자치회: "bg-[#FFE8E8] text-[#C0392B]",
  면사무소: "bg-maul text-white",
  이장: "bg-[#E8F4E8] text-[#2E7D32]",
};

const KO_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getWeekDates(base) {
  const dow = base.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - dow + i);
    return d;
  });
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function Toast({ msg }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
      {msg}
    </div>
  );
}

function WeekDateBar({ selected, onSelect, events, weekBase, onPrevWeek, onNextWeek }) {
  const weekDates = getWeekDates(weekBase);
  const today = new Date();
  const startMonth = weekDates[0].getMonth() + 1;
  const endMonth = weekDates[6].getMonth() + 1;
  const year = weekDates[0].getFullYear();
  const monthLabel = startMonth === endMonth
    ? `${year}년 ${startMonth}월`
    : `${year}년 ${startMonth}월 ~ ${endMonth}월`;

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onPrevWeek}
          className="w-8 h-8 flex items-center justify-center text-maul rounded-full hover:bg-maul/10 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-bold text-ink">{monthLabel}</span>
        <button
          onClick={onNextWeek}
          className="w-8 h-8 flex items-center justify-center text-maul rounded-full hover:bg-maul/10 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
      <div className="flex justify-between">
        {weekDates.map((d, i) => {
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, selected);
          const hasDot = events.some(e => sameDay(new Date(e.event_date + "T00:00:00"), d));
          return (
            <button key={i} onClick={() => onSelect(d)} className="flex flex-col items-center w-10">
              <span className="text-xs text-sub mb-1">{KO_DAYS[d.getDay()]}</span>
              <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                isSelected ? "bg-maul text-white font-bold" : isToday ? "bg-maul/30 text-ink" : "text-ink"
              }`}>
                {d.getDate()}
              </span>
              {hasDot && <span className="w-1 h-1 rounded-full bg-maul mt-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const isAdmin = currentUser?.userType === "관리자";
  const [tab, setTab] = useState("schedule");
  const [weekBase, setWeekBase] = useState(new Date());
  const [weekSelected, setWeekSelected] = useState(new Date());
  const [crawling, setCrawling] = useState(false);

  function prevWeek() {
    setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  }
  function nextWeek() {
    setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  }
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [externalNotices, setExternalNotices] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    logEvent("tab_view", { tab_name: "admin" });
    api.get("/admin-events").then(r => setEvents(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get("/admin/notices").then(r => setNotices(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get("/admin/external-notices?page=1&limit=30").then(r => setExternalNotices(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get("/admin/meetings").then(r => setMeetings(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleCrawl() {
    setCrawling(true);
    try {
      const res = await api.post("/admin/trigger-crawl");
      showToast(`✓ ${res.data.count}건 공지 수집 완료`);
      const r = await api.get("/admin/external-notices?page=1&limit=30");
      setExternalNotices(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      showToast("크롤링 실패: " + (e.response?.data?.detail || e.message));
    } finally {
      setCrawling(false);
    }
  }

  const dayEvents = events.filter(e => sameDay(new Date(e.event_date + "T00:00:00"), weekSelected));

  return (
    <div className="min-h-screen">
      {toast && <Toast msg={toast} />}

      <div className="sticky top-0 z-10 bg-white">
        <header className="px-5 pt-14 pb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">행정</h1>
        </header>

        <div className="px-4 pb-3">
          <div className="bg-gray-100 rounded-2xl flex overflow-hidden">
            {[
              { key: "schedule", label: "일정" },
              { key: "notice", label: "공지" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-3 text-sm font-medium transition-colors rounded-2xl ${
                  tab === t.key ? "bg-maul text-white font-bold shadow-sm" : "text-sub"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "schedule" && (
          <WeekDateBar selected={weekSelected} onSelect={setWeekSelected} events={events} weekBase={weekBase} onPrevWeek={prevWeek} onNextWeek={nextWeek} />
        )}
      </div>

      {/* 일정 탭 */}
      {tab === "schedule" && (
        <div className="px-4 space-y-2 fade-in pt-2 pb-20">
          <p className="text-xs text-sub font-medium">
            {weekSelected.getMonth() + 1}월 {weekSelected.getDate()}일 ({KO_DAYS[weekSelected.getDay()]})
            {sameDay(weekSelected, new Date()) ? " · 오늘" : ""}
          </p>
          {dayEvents.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-sub text-sm shadow-sm">
              이 날은 등록된 일정이 없어요
            </div>
          ) : (
            dayEvents.map(ev => (
              <div
                key={ev.id}
                className="w-full text-left bg-white rounded-2xl shadow-sm p-4"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {ev.department && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${HOST_COLOR[ev.department] ?? "bg-gray-100 text-gray-700"}`}>
                      {ev.department}
                    </span>
                  )}
                  <span className="text-xs text-sub ml-auto">{ev.event_time}</span>
                </div>
                <p className="text-sm font-bold text-ink">{ev.title}</p>
                {ev.place && <p className="text-xs text-sub mt-1">장소: {ev.place}</p>}
                {ev.attendees != null && <p className="text-xs text-sub">참석: {ev.attendees}명</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* 공지 탭 */}
      {tab === "notice" && (
        <div className="px-4 space-y-3 fade-in pt-2">
          {externalNotices.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-sub text-sm shadow-sm">
              등록된 공지사항이 없어요
            </div>
          ) : (
            externalNotices.map(n => (
              <button
                key={n.id}
                onClick={() => n.source_url && window.open(n.source_url, "_blank", "noopener,noreferrer")}
                className="w-full text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-sm font-bold text-ink leading-snug mb-2">{n.title}</p>
                <div className="flex items-center justify-between text-xs text-sub">
                  <span>{n.published_at ? new Date(n.published_at.endsWith("Z") ? n.published_at : n.published_at + "Z").toLocaleDateString("ko-KR") : "-"}</span>
                  <span className="flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> {n.view_count}회</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* 더 보고싶다면 — 공지 탭 하단 */}
      {tab === "notice" && (
        <div className="px-4 pt-3 pb-6">
          <a
            href="https://www.oc.go.kr/www/selectBbsNttList.do?bbsNo=36&key=232&"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-maul rounded-2xl px-4 py-3 shadow-lg"
          >
            <span className="text-sm font-bold text-ink">청산면 공지사항 바로가기</span>
            <span className="text-xs text-white">옥천군 홈페이지 →</span>
          </a>
        </div>
      )}

      <div className="h-8" />

      {/* 회의록 바로가기 — 하단 고정 */}
      {tab === "schedule" && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-4 pb-3 z-40">
          <a
            href="https://www.oc.go.kr/www/selectBbsNttList.do?bbsNo=379&key=4664"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-maul rounded-2xl px-4 py-3 shadow-lg"
          >
            <span className="text-sm font-bold text-ink">청산면 주민자치회 회의록 바로가기</span>
            <span className="text-xs text-white">옥천군 홈페이지 →</span>
          </a>
        </div>
      )}
    </div>
  );
}
