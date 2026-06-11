import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client";
import { getUser } from "../../api/auth";
import AnswerCard from "../../components/AnswerCard";
import LoginPromptSheet from "../../components/LoginPromptSheet";

export default function HanMadiListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQId = parseInt(searchParams.get("q") ?? "0", 10);
  const user = getUser();

  const [weeklyQuestions, setWeeklyQuestions] = useState([]);
  const [selectedQId, setSelectedQId] = useState(initialQId);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    api.get("/hanmadi/weekly")
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        setWeeklyQuestions(list);
        // URL에 q 파라미터가 없으면 오늘 질문으로 기본 설정
        if (!initialQId) {
          const today = list.find(q => q.is_today);
          if (today) setSelectedQId(today.question_id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedQId) return;
    setLoading(true);
    api.get(`/hanmadi/answers?question_id=${selectedQId}`)
      .then(r => setAnswers(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAnswers([]))
      .finally(() => setLoading(false));
  }, [selectedQId]);

  async function handleLike(answerId) {
    if (!user) { setShowLoginPrompt(true); return; }
    try {
      const r = await api.post(`/hanmadi/answers/${answerId}/like`);
      setAnswers(prev =>
        prev.map(a => a.id === answerId
          ? { ...a, is_liked: r.data.liked, like_count: r.data.like_count }
          : a
        )
      );
    } catch {}
  }

  async function handleEdit(answerId, newContent) {
    try {
      const r = await api.patch(`/hanmadi/answers/${answerId}`, { content: newContent });
      setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, content: r.data.content } : a));
    } catch {}
  }

  async function handleDelete(answerId) {
    try {
      await api.delete(`/hanmadi/answers/${answerId}`);
      setAnswers(prev => prev.filter(a => a.id !== answerId));
    } catch {}
  }

  const selectedQuestion = weeklyQuestions.find(q => q.question_id === selectedQId);

  return (
    <div className="min-h-screen bg-white">
      {showLoginPrompt && <LoginPromptSheet onClose={() => setShowLoginPrompt(false)} />}

      <header className="px-4 pt-14 pb-2 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
          <h1 className="text-base font-bold text-ink">이웃 답변 모음</h1>
        </div>
        {weeklyQuestions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
            {weeklyQuestions.map(q => {
              const isSelected = q.question_id === selectedQId;
              return (
                <button
                  key={q.date}
                  onClick={() => setSelectedQId(q.question_id)}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-colors min-w-[44px] ${
                    isSelected ? "bg-maul text-ink" : "bg-gray-100 text-sub"
                  } ${q.is_today ? "ring-2 ring-green-400" : ""}`}
                >
                  <span className="font-bold leading-4">{q.weekday}</span>
                  <span className="opacity-70 leading-4">{q.date.slice(5).replace("-", "/")}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <div className="px-4 pb-8 pt-3">

        {/* 질문 배너 */}
        <div className="bg-maul rounded-2xl p-4 mb-5 fade-in">
          <p className="text-xs text-ink/60 mb-1">이 질문의 답변 모음</p>
          <p className="text-base font-bold text-ink">
            {selectedQuestion?.question_text ?? "불러오는 중…"}
          </p>
        </div>

        {loading ? (
          <p className="text-center py-10 text-sub text-sm">불러오는 중…</p>
        ) : answers.length === 0 ? (
          <p className="text-center py-10 text-sub text-sm">아직 답변이 없어요</p>
        ) : (
          <div className="flex flex-col gap-3 fade-in-1">
            {answers.map(a => (
              <AnswerCard
                key={a.id}
                answer={a}
                onLike={() => handleLike(a.id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
