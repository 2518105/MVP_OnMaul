import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { logEvent } from "../../api/client";

/* ─── 더미 데이터 ─── */
const TODAY = new Date(2026, 4, 8);

const SOURCE_STYLE = {
  자치회:   { bg: "bg-[#FFE8E8]", badge: "bg-[#FFE8E8] text-[#C0392B]" },
  면사무소: { bg: "bg-[#FFFAE8]", badge: "bg-maul text-[#7A6A00]" },
  이장:     { bg: "bg-[#E8F4E8]", badge: "bg-[#E8F4E8] text-[#2E7D32]" },
};

const DUMMY_NOTICES = [
  { id: 1, source: "자치회",   daysAgo: "어제",    title: "5월 마을회의 안건 안내", type: "notice" },
  { id: 2, source: "면사무소", daysAgo: "2일 전",  title: "농약 안전교육 신청",     type: "notice" },
  { id: 4, source: "면사무소", daysAgo: "10일 전", title: "대청호 모기 방역 일정",  type: "notice" },
  { id: 3, source: "이장",     daysAgo: "5일 전",  title: "4월 마을 운영비 정산",   type: "minutes" },
];

const DUMMY_SCHEDULE = [
  { id: 1, date: new Date(2026, 4, 8), time: "19:00", title: "마을회의", place: "마을회관", host: "자치회", agendas: 5 },
  { id: 2, date: new Date(2026, 4, 8), time: "14:00", title: "농약 안전교육", place: "면사무소 대회의실", host: "면사무소" },
  { id: 3, date: new Date(2026, 4, 9), time: "14:00", title: "농약 안전교육", place: "면사무소 대회의실", host: "면사무소" },
  { id: 4, date: new Date(2026, 4, 10), time: "09:00", title: "분리수거 합동의 날", place: "마을 곳곳", host: "자치회" },
  { id: 5, date: new Date(2026, 4, 12), time: "10:00", title: "마을 가로등 정비 회의", place: "마을회관", host: "이장" },
];

const HOST_COLOR = {
  자치회: "bg-[#FFE8E8] text-[#C0392B]",
  면사무소: "bg-[#F5C842] text-[#7A6A00]",
  이장: "bg-[#E8F4E8] text-[#2E7D32]",
};

/* ─── 주간 날짜 바 ─── */
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

function hasEvent(date) {
  return DUMMY_SCHEDULE.some(e => sameDay(e.date, date));
}

/* ─── 월 달력 ─── */
function MonthCalendar({ selectedDate, onSelect }) {
  const year = TODAY.getFullYear();
  const month = TODAY.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay }, () => null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  return (
    <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden fade-in">
      <div className="grid grid-cols-7 text-center text-xs text-sub py-2 border-b border-gray-100">
        {KO_DAYS.map(d => <span key={d} className="py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const date = new Date(year, month, day);
          const isToday = sameDay(date, TODAY);
          const isSelected = selectedDate && sameDay(date, selectedDate);
          const hasDot = hasEvent(date);
          return (
            <button
              key={i}
              onClick={() => onSelect(date)}
              className="flex flex-col items-center py-2 relative"
            >
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  isSelected ? "bg-maul text-ink font-bold" :
                  isToday ? "bg-maul/30 text-ink font-bold" :
                  "text-ink"
                }`}
              >
                {day}
              </span>
              {hasDot && (
                <span className="w-1 h-1 rounded-full bg-maul mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 일정 카드 ─── */
function ScheduleCard({ ev, onClick }) {
  const colorClass = HOST_COLOR[ev.host] || "bg-gray-100 text-gray-700";
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colorClass}`}>
          {ev.host}
        </span>
        <span className="text-xs text-sub ml-auto">{ev.time}</span>
      </div>
      <p className="text-sm font-bold text-ink">{ev.title}</p>
      <p className="text-xs text-sub mt-1">📍 {ev.place}{ev.agendas ? ` · 안건 ${ev.agendas}건` : ""}</p>
    </button>
  );
}

/* ─── 공지/회의록 목록 ─── */
function NoticeList({ type, onClickItem }) {
  const items = DUMMY_NOTICES.filter(n => n.type === type);
  return (
    <div className="px-4 space-y-3 fade-in pt-2">
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-sub text-sm shadow-sm">
          등록된 항목이 없어요
        </div>
      ) : (
        items.map(n => {
          const style = SOURCE_STYLE[n.source] ?? { bg: "bg-white", badge: "bg-gray-100 text-gray-700" };
          return (
            <button
              key={n.id}
              onClick={() => onClickItem(n)}
              className={`w-full text-left rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow ${style.bg}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${style.badge}`}>
                  {n.source}
                </span>
                <span className="text-xs text-sub ml-auto">{n.daysAgo}</span>
              </div>
              <p className="text-sm font-bold text-ink leading-snug">{n.title}</p>
            </button>
          );
        })
      )}
    </div>
  );
}

/* ─── Toast ─── */
function Toast({ msg }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
      {msg}
    </div>
  );
}

/* ─── 주간 날짜 바 (sticky용, 분리) ─── */
function WeekDateBar({ selected, onSelect }) {
  const weekDates = getWeekDates(TODAY);
  return (
    <div className="overflow-x-auto px-4 pb-3">
      <div className="flex gap-2 w-max">
        {weekDates.map((d, i) => {
          const isToday = sameDay(d, TODAY);
          const isSelected = sameDay(d, selected);
          const hasDot = hasEvent(d);
          return (
            <button
              key={i}
              onClick={() => onSelect(d)}
              className="flex flex-col items-center w-10"
            >
              <span className="text-xs text-sub mb-1">{KO_DAYS[d.getDay()]}</span>
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isSelected ? "bg-maul text-ink font-bold" :
                  isToday ? "bg-maul/30 text-ink" :
                  "text-ink"
                }`}
              >
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

/* ─── 주간 어젠다 뷰 ─── */
function WeekView({ selected, onEventClick }) {
  const daySchedules = (date) =>
    DUMMY_SCHEDULE.filter(e => sameDay(e.date, date));

  return (
    <div className="px-4 space-y-2 fade-in">
      <p className="text-xs text-sub font-medium">
        {selected.getMonth() + 1}월 {selected.getDate()}일 ({KO_DAYS[selected.getDay()]})
        {sameDay(selected, TODAY) ? " · 오늘" : ""}
      </p>
      {daySchedules(selected).length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center text-sub text-sm shadow-sm">
          이 날은 등록된 일정이 없어요
        </div>
      ) : (
        daySchedules(selected).map(ev => (
          <ScheduleCard key={ev.id} ev={ev} onClick={() => onEventClick(ev)} />
        ))
      )}
    </div>
  );
}

/* ─── 메인 컴포넌트 ─── */
export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("schedule");
  const [calView, setCalView] = useState("week");
  const [selectedDate, setSelectedDate] = useState(null);
  const [weekSelected, setWeekSelected] = useState(TODAY);
  const [toast, setToast] = useState("");

  useEffect(() => {
    logEvent("tab_view", { tab_name: "admin" });
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function handleTabChange(t) {
    setTab(t);
  }

  function handleEventClick(ev) {
    navigate(`/admin/detail/${ev.id}`);
  }

  const monthSelected = selectedDate
    ? (Array.isArray(DUMMY_SCHEDULE) ? DUMMY_SCHEDULE : []).filter(e => sameDay(e.date, selectedDate))
    : [];

  return (
    <div className="min-h-screen">
      {toast && <Toast msg={toast} />}

      {/* 헤더 + 탭 + 달력 sticky */}
      <div className="sticky top-0 z-10 bg-white">
        <header className="px-5 pt-14 pb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">행정</h1>
          <button onClick={() => showToast("다국어 지원 준비 중입니다")} className="text-xl">
            🌐
          </button>
        </header>

        {/* 상단 탭 */}
        <div className="px-4 pb-3">
          <div className="bg-gray-100 rounded-2xl flex overflow-hidden">
            {[
              { key: "schedule", label: "📅 일정" },
              { key: "notice",   label: "📢 공지" },
              { key: "minutes",  label: "📋 회의록" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`flex-1 py-3 text-sm font-medium transition-colors rounded-2xl ${
                  tab === t.key
                    ? "bg-white text-ink font-bold shadow-sm"
                    : "text-sub"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 달력 — 일정 탭 + 주간 뷰일 때만 */}
        {tab === "schedule" && calView === "week" && (
          <WeekDateBar selected={weekSelected} onSelect={setWeekSelected} />
        )}

        {/* 뷰 전환 토글 — 일정 탭만 */}
        {tab === "schedule" && (
          <div className="flex items-center justify-end px-5 pb-2">
            <button
              onClick={() => setCalView(v => v === "week" ? "month" : "week")}
              className="text-xs text-sub underline underline-offset-2"
            >
              {calView === "week" ? "월별로 보기 ›" : "주간으로 보기 ›"}
            </button>
          </div>
        )}
      </div>

      {/* 일정 탭 컨텐츠 */}
      {tab === "schedule" && (
        calView === "week" ? (
          <WeekView selected={weekSelected} onEventClick={handleEventClick} />
        ) : (
          <>
            <MonthCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />
            {selectedDate && (
              <div className="px-4 mt-4 space-y-2 fade-in">
                <p className="text-xs text-sub font-medium px-1">
                  {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 일정
                </p>
                {monthSelected.length === 0 ? (
                  <div className="bg-white rounded-2xl p-5 text-center text-sub text-sm shadow-sm">
                    이 날은 등록된 일정이 없어요
                  </div>
                ) : (
                  monthSelected.map(ev => (
                    <ScheduleCard key={ev.id} ev={ev} onClick={() => handleEventClick(ev)} />
                  ))
                )}
              </div>
            )}
          </>
        )
      )}

      {/* 공지 탭 컨텐츠 */}
      {tab === "notice" && (
        <NoticeList type="notice" onClickItem={ev => navigate(`/admin/detail/${ev.id}`)} />
      )}

      {/* 회의록 탭 컨텐츠 */}
      {tab === "minutes" && (
        <NoticeList type="minutes" onClickItem={ev => navigate(`/admin/detail/${ev.id}`)} />
      )}

      <div className="h-8" />
    </div>
  );
}
