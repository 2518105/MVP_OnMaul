import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { getUser } from "../../api/auth";
import { getTodayQuestion } from "../../constants/questions";
import AnswerCard from "../../components/AnswerCard";
import LoginPromptSheet from "../../components/LoginPromptSheet";

const DUMMY_ANSWERS = [
  {
    id: 1,
    author_nickname: "이장 김씨",
    author_type: "주민",
    question_index: 0,
    content: "오늘 아침엔 안개가 잔뜩 꼈는데 점심엔 해가 쨍쨍하더라고요. 청산면 날씨는 하루에도 몇 번씩 바뀌어요 😄",
    media_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    like_count: 8,
    comment_count: 3,
    is_liked: false,
  },
  {
    id: 2,
    author_nickname: "단풍나무",
    author_type: "이주민",
    content: "맑고 시원해요! 밭에 나가기 딱 좋은 날씨네요 🌿",
    media_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    like_count: 4,
    comment_count: 1,
    is_liked: false,
  },
  {
    id: 3,
    author_nickname: "동이댁",
    author_type: "주민",
    content: "아침저녁으로 쌀쌀하니까 감기 조심하세요~",
    media_url: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    like_count: 12,
    comment_count: 5,
    is_liked: true,
  },
];

function Toast({ msg }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
      {msg}
    </div>
  );
}

function formatDate(d) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function HanMadiPage() {
  const navigate = useNavigate();
  const user = getUser();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const q = getTodayQuestion();
    api.get("/hanmadi/today")
      .then(r => {
        setQuestion({ question_id: r.data.question_id, text: r.data.question_text, type: r.data.answer_type });
        const apiAnswers = r.data.answers || [];
        setAnswers(apiAnswers.length > 0 ? apiAnswers : DUMMY_ANSWERS);
      })
      .catch(() => {
        setQuestion({ question_id: q.index, text: q.text, type: q.type });
        setAnswers(DUMMY_ANSWERS);
      });
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function handleMedia(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMediaFile(f);
    setMediaPreview(URL.createObjectURL(f));
  }

  function removeMedia() {
    setMediaFile(null);
    setMediaPreview(null);
  }

  const canSubmit = !submitting && (
    (question?.type !== "media" && text.trim()) ||
    (question?.type !== "text" && mediaFile)
  );

  async function handleSubmit() {
    if (!user) { setShowLoginPrompt(true); return; }
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("question_id", question.question_id);
      if (text.trim()) fd.append("content", text);
      if (mediaFile) fd.append("media", mediaFile);
      const r = await api.post("/hanmadi/answers", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAnswers(prev => [r.data, ...prev].slice(0, 3));
      setText("");
      setMediaFile(null);
      setMediaPreview(null);
      showToast("답변이 등록됐어요 🌿");
    } catch {
      showToast("등록에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

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

  if (!question) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sub text-sm">불러오는 중…</p>
      </div>
    );
  }

  const showText = question.type === "text" || question.type === "both";
  const showMedia = question.type === "media" || question.type === "both";

  return (
    <div className="min-h-screen bg-cream">
      {toast && <Toast msg={toast} />}
      {showLoginPrompt && <LoginPromptSheet onClose={() => setShowLoginPrompt(false)} />}

      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 pt-14 pb-3 bg-cream sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-maul text-ink text-sm font-bold px-4 py-1.5 rounded-full disabled:opacity-40 transition-opacity"
        >
          {submitting ? "등록 중…" : "등록"}
        </button>
      </header>

      <div className="px-5 pb-8">
        {/* 오늘의 질문 */}
        <div className="mb-5 fade-in">
          <p className="text-xs text-sub mb-2">{formatDate(new Date())} · 오늘의 질문</p>
          <h1 className="text-2xl font-bold text-ink leading-snug">{question.text}</h1>
        </div>

        {/* 입력 영역 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 fade-in-1">
          {showText && (
            <>
              <textarea
                className="w-full bg-transparent resize-none text-sm text-ink placeholder-sub/50 outline-none leading-relaxed"
                rows={4}
                maxLength={200}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="오늘의 답변을 남겨주세요…"
              />
              <div className="flex justify-end">
                <span className="text-xs text-sub">{text.length} / 200</span>
              </div>
            </>
          )}

          {showText && showMedia && <div className="border-t border-gray-100 my-3" />}

          {showMedia && (
            mediaPreview ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden">
                <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 cursor-pointer py-1 text-sub hover:text-ink transition-colors">
                <span className="text-2xl">📷</span>
                <div>
                  <p className="text-sm font-medium">사진 / 영상 올리기</p>
                  <p className="text-xs text-sub/70">탭해서 파일 선택</p>
                </div>
                <input type="file" accept="image/*,video/*" onChange={handleMedia} className="hidden" />
              </label>
            )
          )}
        </div>

        {/* 최근 답변 */}
        <div className="fade-in-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-ink">이웃들의 답변</h2>
            <button
              onClick={() => navigate(`/hanmadi/list?q=${question.question_id}`)}
              className="text-xs text-sub underline underline-offset-2"
            >
              더보기
            </button>
          </div>

          {answers.length === 0 ? (
            <p className="text-center py-8 text-sub text-sm">첫 번째 답변을 남겨보세요 🌿</p>
          ) : (
            <div className="flex flex-col gap-3">
              {answers.map(a => (
                <AnswerCard key={a.id} answer={a} onLike={() => handleLike(a.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
