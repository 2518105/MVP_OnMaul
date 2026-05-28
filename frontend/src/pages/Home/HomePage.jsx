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
  const [popularPosts, setPopularPosts] = useState([]);
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
          .slice(0, 2);
        setUpcomingEvents(upcoming);
      })
      .catch(() => {});
    api.get("/posts", { params: { limit: 2 } })
      .then(r => setPopularPosts(Array.isArray(r.data) ? r.data.slice(0, 2) : []))
      .catch(() => {});
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
      setRecentAnswers(prev => [r.data, ...prev].slice(0, 2));
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
      {showLoginSheet && (
        <LoginPromptSheet onClose={() => setShowLoginSheet(false)} />
      )}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
          {toast}
        </div>
      )}
      {/* 인삿말 헤더 */}
      <div className="px-5 pt-14 pb-4 fade-in">
        <p className="text-base text-sub">안녕하세요,</p>
        <h1 className="text-2xl font-bold text-ink mt-0.5">
          {currentUser?.nickname ?? "이웃"} 님 🌿
        </h1>
        <p className="text-xs text-sub mt-1">
          청산면 {currentUser?.userType ?? "주민"}
        </p>
      </div>

      {/* 위젯 카드 */}
      <div className="px-4 flex flex-col gap-3">
        {/* 오늘의 질문 */}
        <div className="widget-card fade-in-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-sub">오늘의 질문</p>
            <button
              onClick={() => navigate("/hanmadi")}
              className="text-xs text-sub underline underline-offset-2"
            >
              전체 보기
            </button>
          </div>
          <p className="text-base font-bold text-ink leading-snug mb-3">
            {todayQuestion.text}
          </p>

          {/* 답변 입력창 */}
          <div className="border border-gray-200 rounded-xl px-3 py-2.5 mb-3 bg-gray-50 focus-within:border-maul-dark focus-within:bg-white transition-colors">
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
                  className="bg-maul text-ink text-xs font-bold px-3 py-1 rounded-full disabled:opacity-50 transition-opacity"
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
                  <div className="w-5 h-5 rounded-full bg-maul flex items-center justify-center text-xs font-bold text-ink flex-shrink-0 mt-0.5">
                    {a.author_nickname[0]}
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

        {/* 이번 주 일정 */}
        <div className="widget-card fade-in-3" onClick={() => navigate("/admin")}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-ink">다가오는 일정</span>
            <span>📅</span>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-sub/60">등록된 일정이 없어요</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {upcomingEvents.map(e => (
                <li key={e.id} className="flex items-center gap-2 text-sm text-ink">
                  <span className="bg-cream text-sub text-xs font-semibold px-2 py-0.5 rounded-lg whitespace-nowrap">
                    {new Date(e.event_date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                  </span>
                  <span className="truncate">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 최근 게시글 */}
        <div className="widget-card fade-in-4" onClick={() => navigate("/board")}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-ink">최근 게시글</span>
            <span>📝</span>
          </div>
          {popularPosts.length === 0 ? (
            <p className="text-xs text-sub/60">아직 게시글이 없어요</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {popularPosts.map(p => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink truncate flex-1">{p.title}</span>
                  <span className="text-sub ml-2 text-xs whitespace-nowrap">💬 {p.comment_count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
