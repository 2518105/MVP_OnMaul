import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { logEvent } from "../../api/client";

const SOURCE_STYLE = {
  자치회:   { bg: "bg-[#FFE8E8]", badge: "bg-[#FFE8E8] text-[#C0392B]" },
  면사무소: { bg: "bg-cream", badge: "bg-maul text-white" },
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

function WeekDateBar({ selected, onSelect, events }) {
  const weekDates = getWeekDates(new Date());
  const today = new Date();
  return (
    <div className="overflow-x-auto px-4 pb-3">
      <div className="flex gap-2 w-max">
        {weekDates.map((d, i) => {
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, selected);
          const hasDot = events.some(e => sameDay(new Date(e.event_date), d));
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
  const [tab, setTab] = useState("schedule");
  const [weekSelected, setWeekSelected] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [externalNotices, setExternalNotices] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    logEvent("tab_view", { tab_name: "admin" });
    api.get("/admin/calendar").then(r => setEvents(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get("/admin/notices").then(r => setNotices(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get("/admin/external-notices?page=1&limit=30").then(r => setExternalNotices(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get("/admin/meetings").then(r => setMeetings(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  const dayEvents = events.filter(e => sameDay(new Date(e.event_date), weekSelected));

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
              { key: "minutes", label: "회의록" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-3 text-sm font-medium transition-colors rounded-2xl ${
                  tab === t.key ? "bg-white text-ink font-bold shadow-sm" : "text-sub"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "schedule" && (
          <WeekDateBar selected={weekSelected} onSelect={setWeekSelected} events={events} />
        )}
      </div>

      {/* 일정 탭 */}
      {tab === "schedule" && (
        <div className="px-4 space-y-2 fade-in pt-2">
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
              <button
                key={ev.id}
                onClick={() => navigate(`/admin/detail/${ev.id}?type=event`)}
                className="w-full text-left bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${HOST_COLOR[ev.event_type] ?? "bg-gray-100 text-gray-700"}`}>
                    {ev.event_type}
                  </span>
                  <span className="text-xs text-sub ml-auto">
                    {new Date(ev.event_date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm font-bold text-ink">{ev.title}</p>
                {ev.description && <p className="text-xs text-sub mt-1">{ev.description}</p>}
              </button>
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

      {/* 회의록 탭 */}
      {tab === "minutes" && (
        <div className="px-4 space-y-3 fade-in pt-2">
          <a
            href="https://www.oc.go.kr/www/selectBbsNttList.do?bbsNo=379&key=4664"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-maul rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <span className="text-sm font-bold text-ink">청산면 회의록 바로가기</span>
            <span className="text-xs text-sub">옥천군 홈페이지 →</span>
          </a>
          {meetings.map(m => (
            <button
              key={m.id}
              onClick={() => navigate(`/admin/detail/${m.id}?type=meeting`)}
              className="w-full text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-sub">{new Date(m.meeting_date).toLocaleDateString("ko-KR")}</span>
              </div>
              <p className="text-sm font-bold text-ink leading-snug">{m.title}</p>
            </button>
          ))}
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}
