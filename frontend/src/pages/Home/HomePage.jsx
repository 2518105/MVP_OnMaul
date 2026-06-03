import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { getUser } from "../../api/auth";
import { getTodayQuestion } from "../../constants/questions";
import LoginPromptSheet from "../../components/LoginPromptSheet";

export default function HomePage() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const [todayQuestion] = useState(() => getTodayQuestion());
  const [apiQuestionId, setApiQuestionId] = useState(null);
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [recentAnswers, setRecentAnswers] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [popularPosts, setPopularPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const textareaRef = useRef(null);

  useEffect(() => {
    api.get("/hanmadi/today")
      .then(r => {
        if (r.data.answers?.length > 0) setRecentAnswers(r.data.answers);
        setApiQuestionId(r.data.question_id);
      })
      .catch(() => {});

    api.get("/admin/calendar")
      .then(r => {
        const now = new Date();
        const upcoming = (Array.isArray(r.data) ? r.data : [])
          .filter(e => new Date(e.event_date) >= now)
          .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
          .slice(0, 3);
        setUpcomingEvents(upcoming);
      })
      .catch(() => {});

    Promise.all([
      api.get("/posts", { params: { limit: 3 } }).catch(() => ({ data: [] })),
      api.get("/posts", { params: { limit: 3, sort: "popular" } }).catch(() => ({ data: [] })),
    ]).then(([recentRes, popularRes]) => {
      setRecentPosts(Array.isArray(recentRes.data) ? recentRes.data.slice(0, 3) : []);
      setPopularPosts(Array.isArray(popularRes.data) ? popularRes.data.slice(0, 3) : []);
    }).finally(() => setLoadingPosts(false));
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleSubmit(e) {
    e.stopPropagation();
    const user = getUser();
    if (!user) { setShowLoginSheet(true); return; }
    if (!answerText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("question_id", apiQuestionId ?? todayQuestion.index);
      fd.append("content", answerText.trim());
      const r = await api.post("/hanmadi/answers", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setRecentAnswers(prev => [r.data, ...prev].slice(0, 3));
      setAnswerText("");
      showToast("답변이 등록됐어요 🌿");
    } catch {
      showToast("등록에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {showLoginSheet && <LoginPromptSheet onClose={() => setShowLoginSheet(false)} />}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
          {toast}
        </div>
      )}

      {/* 초록 헤더 */}
      <div className="bg-maul px-5 pt-14 pb-10 fade-in">
        <p className="text-white/75 text-sm">안녕하세요,</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">
          {currentUser?.nickname ?? "이웃"} 님 🌿
        </h1>
        <p className="text-white/65 text-xs mt-1">
          청산면 {currentUser?.userType ?? "주민"}
        </p>
      </div>

      {/* 카드 섹션 — 헤더에 -mt-5로 겹쳐 올라옴 */}
      <div className="px-4 -mt-5 flex flex-col gap-3">

        {/* 오늘의 한마디 배너 */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden fade-in-1">
          <div className="bg-maul px-4 py-2.5 flex items-center justify-between">
            <span className="text-white text-xs font-semibold tracking-wide">오늘의 한마디</span>
            <button
              onClick={() => navigate("/hanmadi")}
              className="text-white/80 text-xs underline underline-offset-2"
            >
              전체 보기
            </button>
          </div>
          <div className="p-4">
            <p className="text-base font-bold text-ink leading-snug mb-3">
              {todayQuestion.text}
            </p>

            <div className="border border-gray-200 rounded-xl px-3 py-2.5 mb-3 bg-gray-50 focus-within:border-maul focus-within:bg-white transition-colors">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent resize-none text-sm text-ink placeholder-sub/60 outline-none leading-relaxed"
                rows={answerText ? 3 : 1}
                maxLength={200}
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                placeholder="답변을 남겨주세요…"
                onClick={e => e.stopPropagation()}
              />
              {answerText.trim() && (
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-sub">{answerText.length} / 200</span>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-maul text-white text-xs font-bold px-3 py-1 rounded-full disabled:opacity-50 transition-opacity"
                  >
                    {submitting ? "등록 중…" : "등록"}
                  </button>
                </div>
              )}
            </div>

            {recentAnswers.length > 0 ? (
              <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-2.5">
                {recentAnswers.slice(0, 2).map(a => (
                  <div key={a.id} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-maul flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
                      {a.author_nickname?.[0] ?? "?"}
                    </div>
                    <p className="text-xs text-sub truncate flex-1">
                      {a.content || "📷 사진을 올렸어요"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-sub/60 border-t border-gray-100 pt-2.5">
                첫 번째 답변을 남겨보세요
              </p>
            )}
          </div>
        </div>

        {/* 최근 게시글 */}
        <div className="widget-card fade-in-2" onClick={() => navigate("/board")}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-ink">최근 게시글</span>
            <span className="text-xs text-maul font-medium">전체 보기 →</span>
          </div>
          {loadingPosts ? (
            <p className="text-xs text-sub/60">불러오는 중…</p>
          ) : recentPosts.length === 0 ? (
            <p className="text-xs text-sub/60">아직 게시글이 없어요</p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-50">
              {recentPosts.map(p => (
                <li key={p.id} className="flex items-center justify-between text-sm py-2 first:pt-0 last:pb-0">
                  <span className="text-ink truncate flex-1">{p.title}</span>
                  <span className="text-sub ml-2 text-xs whitespace-nowrap">💬 {p.comment_count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 인기 게시글 */}
        {!loadingPosts && popularPosts.length > 0 && (
          <div className="widget-card fade-in-3" onClick={() => navigate("/board")}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-ink">인기 게시글</span>
              <span className="text-[10px] bg-cream text-maul-dark px-2 py-0.5 rounded-full font-semibold">HOT</span>
            </div>
            <ul className="flex flex-col divide-y divide-gray-50">
              {popularPosts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2 text-sm py-2 first:pt-0 last:pb-0">
                  <span className="text-maul font-bold text-xs w-4 text-center shrink-0">{i + 1}</span>
                  <span className="text-ink truncate flex-1">{p.title}</span>
                  <span className="text-sub text-xs whitespace-nowrap">💬 {p.comment_count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 다가오는 일정 */}
        <div className="widget-card fade-in-4" onClick={() => navigate("/admin")}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-ink">다가오는 일정</span>
            <span className="text-xs text-maul font-medium">전체 보기 →</span>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-sub/60">등록된 일정이 없어요</p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-50">
              {upcomingEvents.map(e => (
                <li key={e.id} className="flex items-center gap-2 text-sm py-2 first:pt-0 last:pb-0">
                  <span className="bg-cream text-maul-dark text-xs font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap">
                    {new Date(e.event_date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                  </span>
                  <span className="truncate text-ink">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
