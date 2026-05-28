import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client";

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
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") ?? "notice";
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const endpoint =
      type === "event" ? `/admin/calendar` :
      type === "meeting" ? `/admin/meetings/${id}` :
      `/admin/notices/${id}`;

    if (type === "event") {
      api.get(endpoint)
        .then(r => {
          const found = (Array.isArray(r.data) ? r.data : []).find(e => String(e.id) === String(id));
          setDetail(found ?? null);
        })
        .catch(() => setDetail(null))
        .finally(() => setLoading(false));
    } else {
      api.get(endpoint)
        .then(r => setDetail(r.data))
        .catch(() => setDetail(null))
        .finally(() => setLoading(false));
    }
  }, [id, type]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-sub text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-4">
        <p className="text-sub text-sm">내용을 찾을 수 없어요</p>
        <button onClick={() => navigate(-1)} className="btn-maul w-auto px-8">돌아가기</button>
      </div>
    );
  }

  const title = detail.title;
  const content = detail.content ?? detail.description ?? "";
  const dateStr = detail.created_at
    ? new Date(detail.created_at).toLocaleDateString("ko-KR")
    : detail.event_date
    ? new Date(detail.event_date).toLocaleDateString("ko-KR")
    : detail.meeting_date
    ? new Date(detail.meeting_date).toLocaleDateString("ko-KR")
    : "";
  const source = detail.category ?? detail.event_type ?? detail.author_nickname ?? "";

  return (
    <div className="min-h-screen bg-cream">
      {toast && <Toast msg={toast} />}

      <header className="px-5 pt-14 pb-3 flex items-center justify-between sticky top-0 bg-cream z-10">
        <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
        <button onClick={() => showToast("공유 기능은 준비 중입니다")} className="text-sm text-sub">
          ↗ 공유
        </button>
      </header>

      <div className="px-5 pb-32">
        <h1 className="text-xl font-bold text-ink mb-3 fade-in">{title}</h1>

        <div className="flex items-center gap-2 mb-5 fade-in">
          {source && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${SOURCE_STYLE[source] ?? "bg-gray-100 text-gray-700"}`}>
              {source}
            </span>
          )}
          <span className="text-xs text-sub">{dateStr}</span>
        </div>

        {content ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 fade-in-1">
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-6 text-center text-sub text-sm fade-in-1">
            내용이 없어요
          </div>
        )}
      </div>
    </div>
  );
}
