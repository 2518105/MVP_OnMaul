import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { getUser } from "../../api/auth";
import { getTodayQuestion } from "../../constants/questions";

const DUMMY = {
  nickname: "단풍나무",
  type: "새내기",
  date: "5월의 두 번째 화요일",
  stop: { name: "청산주차장", dist: "150m", next: "7분 후", line: "541번 옥천행" },
  schedule: [
    { date: "5/10", label: "마을회의" },
    { date: "5/12", label: "농약 안전교육" },
  ],
  posts: [
    { title: "청산면 귀농 1년차 후기 올려요", comments: 14 },
    { title: "주차장 버스 출발 시간 바뀌었나요?", comments: 8 },
  ],
};

export default function HomePage() {
  const navigate = useNavigate();
  const [todayQuestion] = useState(() => getTodayQuestion());
  const [recentAnswers, setRecentAnswers] = useState([
    { id: 1, author_nickname: "이장 김씨", content: "오늘 안개 끼더니 점심엔 쨍쨍하네요 😄" },
    { id: 2, author_nickname: "단풍나무", content: "밭에 나가기 딱 좋은 날씨예요 🌿" },
  ]);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    api.get("/hanmadi/today")
      .then(r => { if (r.data.answers?.length > 0) setRecentAnswers(r.data.answers); })
      .catch(() => {});
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleSubmit(e) {
    e.stopPropagation();
    const user = getUser();
    if (!user) { navigate("/login"); return; }
    if (!answerText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("question_index", todayQuestion.index);
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
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
          {toast}
        </div>
      )}
      {/* 인삿말 헤더 */}
      <div className="px-5 pt-14 pb-4 fade-in">
        <p className="text-base text-sub">안녕하세요,</p>
        <h1 className="text-2xl font-bold text-ink mt-0.5">
          {DUMMY.nickname} 님 🌿
        </h1>
        <p className="text-xs text-sub mt-1">
          청산면 {DUMMY.type}
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
        <div
          className="widget-card fade-in-3"
          onClick={() => navigate("/admin")}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-ink">이번 주 일정</span>
            <span>📅</span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {DUMMY.schedule.map(s => (
              <li key={s.date} className="flex items-center gap-2 text-sm text-ink">
                <span className="bg-cream text-sub text-xs font-semibold px-2 py-0.5 rounded-lg w-10 text-center">
                  {s.date}
                </span>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 인기 게시글 */}
        <div
          className="widget-card fade-in-4"
          onClick={() => navigate("/board")}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-ink">인기 게시글</span>
            <span>🔥</span>
          </div>
          <ul className="flex flex-col gap-2">
            {DUMMY.posts.map((p, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink truncate flex-1">{p.title}</span>
                <span className="text-sub ml-2 text-xs whitespace-nowrap">
                  💬 {p.comments}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
