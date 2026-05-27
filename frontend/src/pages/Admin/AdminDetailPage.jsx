import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const DUMMY_DETAILS = {
  1: {
    title: "5월 마을회의 안건 안내",
    source: "자치회",
    date: "2026.05.07",
    attachmentCount: 1,
    isNew: true,
    date2: "5/8 19:00",
    place: "마을회관",
    host: "자치회",
    note: "의결사항이 있는 회의입니다. 가능한 참석 부탁드립니다.",
    agendas: [
      "마을 가로등 정비",
      "분리수거 합동의 날",
      "6월 정기 예산 심의",
    ],
    attachment: "5월 안건 자료.hwp",
    attachmentSize: "1.2MB",
    likes: 6,
    attendees: 12,
  },
  2: {
    title: "농약 안전교육 신청",
    source: "면사무소",
    date: "2026.05.06",
    attachmentCount: 0,
    isNew: true,
    date2: "5/9 14:00",
    place: "면사무소 대회의실",
    host: "면사무소",
    note: "농약 안전 사용법 및 보관 방법을 안내드립니다.",
    agendas: ["농약 안전 사용법", "보관 방법 안내", "질의응답"],
    attachment: null,
    likes: 3,
    attendees: 8,
  },
  3: {
    title: "4월 마을 운영비 정산",
    source: "이장",
    date: "2026.05.03",
    attachmentCount: 0,
    isNew: false,
    date2: "4/30",
    place: "마을회관",
    host: "이장",
    note: "4월 마을 운영비 정산 결과를 안내드립니다.",
    agendas: ["수입: 회비 수령 320,000원", "지출: 마을 청소 용품 85,000원", "잔액: 235,000원"],
    attachment: null,
    likes: 2,
    attendees: 5,
  },
  4: {
    title: "대청호 모기 방역 일정",
    source: "면사무소",
    date: "2026.04.28",
    attachmentCount: 1,
    isNew: false,
    date2: "5/5",
    place: "청산면 일원",
    host: "면사무소",
    note: "모기 방역 차량이 운행될 예정입니다. 창문을 닫아주세요.",
    agendas: ["5/5(화) 19:00 청산리 일원", "5/6(수) 19:00 궁촌리 일원"],
    attachment: "방역일정.pdf",
    attachmentSize: "0.4MB",
    likes: 4,
    attendees: 0,
  },
};

const SOURCE_STYLE = {
  자치회:   "bg-[#FFE8E8] text-[#C0392B]",
  면사무소: "bg-[#F5C842] text-[#7A6A00]",
  이장:     "bg-[#E8F4E8] text-[#2E7D32]",
};

function Toast({ msg }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
      {msg}
    </div>
  );
}

export default function AdminDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [toast, setToast] = useState("");

  const detail = DUMMY_DETAILS[id] ?? DUMMY_DETAILS[1];

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  return (
    <div className="min-h-screen bg-cream">
      {toast && <Toast msg={toast} />}

      {/* 헤더 */}
      <header className="px-5 pt-14 pb-3 flex items-center justify-between sticky top-0 bg-cream z-10">
        <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast("공유 기능은 준비 중입니다")}
            className="text-sm text-sub"
          >
            ↗ 공유
          </button>
          <button className="text-sub text-lg">···</button>
        </div>
      </header>

      <div className="px-5 pb-32">
        {/* 메타 정보 pill 3개 */}
        <div className="flex flex-wrap gap-2 mb-4 fade-in">
          <span className="text-xs bg-white border border-gray-200 text-sub px-3 py-1.5 rounded-full">
            📅 {detail.date2}
          </span>
          <span className="text-xs bg-white border border-gray-200 text-sub px-3 py-1.5 rounded-full">
            📍 {detail.place}
          </span>
          <span className="text-xs bg-white border border-gray-200 text-sub px-3 py-1.5 rounded-full">
            👥 {detail.host}
          </span>
        </div>

        {/* NEW 뱃지 */}
        {detail.isNew && (
          <span className="text-xs bg-orange-500 text-white px-2.5 py-1 rounded-full font-bold mb-3 inline-block fade-in">
            NEW
          </span>
        )}

        {/* 제목 */}
        <h1 className="text-xl font-bold text-ink mb-2 fade-in-1">{detail.title}</h1>

        {/* 출처 + 날짜 */}
        <div className="flex items-center gap-2 mb-4 fade-in-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${SOURCE_STYLE[detail.source] ?? "bg-gray-100 text-gray-700"}`}>
            {detail.source}
          </span>
          <span className="text-xs text-sub">· {detail.date} · 첨부 {detail.attachmentCount}</span>
        </div>

        {/* 참고 박스 */}
        <div className="bg-gray-50 rounded-2xl p-4 mb-4 fade-in-2">
          <p className="text-sm text-ink leading-relaxed">{detail.note}</p>
        </div>

        {/* 주요 안건 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 fade-in-2">
          <p className="text-sm font-bold text-ink mb-3">주요 안건</p>
          <ol className="space-y-2">
            {detail.agendas.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <span className="text-maul-dark font-bold shrink-0">{i + 1}.</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 첨부파일 */}
        {detail.attachment && (
          <button
            onClick={() => showToast("파일 다운로드는 준비 중입니다")}
            className="w-full text-left bg-white rounded-2xl p-4 shadow-sm mb-4 border-2 border-dashed border-gray-200 fade-in-3 hover:bg-cream transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📎</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">{detail.attachment}</p>
                <p className="text-xs text-sub mt-0.5">{detail.attachmentSize} · 누르면 열기 ↓</p>
              </div>
            </div>
          </button>
        )}

        {/* 반응 바 */}
        <div className="flex items-center gap-5 py-3 border-t border-b border-gray-100 mb-6 fade-in-3">
          <button
            onClick={() => setLiked(v => !v)}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-red-500 font-semibold" : "text-sub"}`}
          >
            <span>{liked ? "♥" : "♡"}</span>
            <span>공감 {detail.likes + (liked ? 1 : 0)}</span>
          </button>
          {detail.attendees > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-sub">
              <span>👥</span>
              <span>참석 {detail.attendees}명</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 text-sm text-sub ml-auto">
            <span>📎</span>
            <span>{detail.attachmentCount}</span>
          </span>
        </div>
      </div>

      {/* 하단 버튼 (fixed) */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-4 flex gap-3 pb-3 bg-cream pt-2">
        <button
          onClick={() => showToast("공유 기능은 준비 중입니다")}
          className="btn-outline py-3 flex-1"
        >
          ↗ 공유
        </button>
        <button
          onClick={() => showToast("일정에 추가됐어요 📅")}
          className="btn-maul flex-1 py-3"
        >
          📅 캘린더에 추가
        </button>
      </div>
    </div>
  );
}
