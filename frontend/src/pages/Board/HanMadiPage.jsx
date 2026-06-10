import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { getUser } from "../../api/auth";
import { getTodayQuestion } from "../../constants/questions";
import AnswerCard from "../../components/AnswerCard";
import LoginPromptSheet from "../../components/LoginPromptSheet";



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
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [likingIds, setLikingIds] = useState(new Set());
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const q = getTodayQuestion();
    api.get("/hanmadi/today")
      .then(r => {
        setQuestion({ question_id: r.data.question_id, text: r.data.question_text, type: r.data.answer_type });
        const apiAnswers = r.data.answers || [];
        setAnswers(apiAnswers);
      })
      .catch(() => {
        setQuestion({ question_id: q.index, text: q.text, type: q.type });
        setAnswers([]);
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

  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isListening]);

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast("이 브라우저는 음성 인식을 지원하지 않아요"); return; }
    const recognition = new SR();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) setText(prev => prev + final);
      setInterimText(interim);
    };
    recognition.onerror = (e) => {
      if (e.error === "not-allowed") showToast("마이크 권한이 필요해요");
      else if (e.error === "network") showToast("네트워크 연결을 확인해주세요");
      // no-speech, aborted 등은 조용히 종료
    };
    recognition.onend = () => { setIsListening(false); setInterimText(""); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setRecordingTime(0);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  }

  const hasContent = text.trim() || mediaFile;
  const canSubmit = !submitting && (!user || hasContent);

  async function handleSubmit() {
    if (!user) { setShowLoginPrompt(true); return; }
    if (!hasContent) { showToast("내용을 입력해주세요"); return; }
    if (submitting) return;
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
      showToast("답변이 등록됐어요.");
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setShowLoginPrompt(true);
      } else {
        showToast("등록에 실패했어요. 다시 시도해주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(answerId) {
    if (!user) { setShowLoginPrompt(true); return; }
    if (likingIds.has(answerId)) return;
    setLikingIds(prev => new Set(prev).add(answerId));
    try {
      const r = await api.post(`/hanmadi/answers/${answerId}/like`);
      setAnswers(prev =>
        prev.map(a => a.id === answerId
          ? { ...a, is_liked: r.data.liked, like_count: r.data.like_count }
          : a
        )
      );
    } catch {} finally {
      setLikingIds(prev => { const s = new Set(prev); s.delete(answerId); return s; });
    }
  }

  async function handleEdit(answerId, newContent) {
    try {
      const r = await api.patch(`/hanmadi/answers/${answerId}`, { content: newContent });
      setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, content: r.data.content } : a));
      showToast("수정됐어요");
    } catch {
      showToast("수정에 실패했어요");
    }
  }

  async function handleDelete(answerId) {
    try {
      await api.delete(`/hanmadi/answers/${answerId}`);
      setAnswers(prev => prev.filter(a => a.id !== answerId));
      showToast("삭제됐어요");
    } catch {
      showToast("삭제에 실패했어요");
    }
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-[#f1f1f1] flex items-center justify-center">
        <p className="text-sub text-sm">불러오는 중…</p>
      </div>
    );
  }

  const showText = true;
  const showMedia = true;

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      {toast && <Toast msg={toast} />}
      {showLoginPrompt && <LoginPromptSheet onClose={() => setShowLoginPrompt(false)} />}

      {/* 헤더 — 뒤로가기만 */}
      <header className="flex items-center px-5 pt-14 pb-3 bg-[#f1f1f1] sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
      </header>

      <div className="px-5 pb-8">
        {/* 오늘의 질문 */}
        <div className="mb-5 fade-in">
          <p className="text-xs text-sub mb-2">{formatDate(new Date())} · 오늘의 질문</p>
          <h1 className="text-2xl font-bold leading-snug" style={{ color: "#629c6b", whiteSpace: "pre-line" }}>
            {question.text}
          </h1>
        </div>

        {/* 입력 박스 */}
        <div className="bg-maul rounded-2xl p-4 shadow-sm mb-3 fade-in-1 focus-within:ring-2 focus-within:ring-blue-400">
          {showText && (
            <textarea
              className="w-full bg-transparent resize-none text-sm text-white placeholder-white/50 outline-none leading-relaxed"
              rows={4}
              maxLength={200}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="오늘의 답변을 남겨주세요…"
            />
          )}

          {/* 미디어 프리뷰 */}
          {mediaPreview && (
            <div className="relative w-full h-48 rounded-xl overflow-hidden mt-2">
              <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
              <button
                onClick={removeMedia}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          )}

          {/* 음성 인식 중 상태 */}
          {isListening && (
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0" />
              <span className="text-xs text-white font-medium flex-1">
                {String(Math.floor(recordingTime / 60)).padStart(2, "0")}:{String(recordingTime % 60).padStart(2, "0")} 인식 중…
              </span>
              {interimText && <span className="text-xs text-white/60 italic truncate">{interimText}</span>}
              <button
                onClick={stopListening}
                className="text-xs font-bold text-white border border-white/60 px-3 py-1 rounded-full flex-shrink-0"
              >
                중지
              </button>
            </div>
          )}

          {/* 박스 하단 바: 글자수 카운터(좌) + 아이콘(우) */}
          <div className="flex items-center justify-between mt-3">
            {showText
              ? <span className="text-xs text-white/60">{text.length} / 200</span>
              : <span />
            }
            <div className="flex items-center gap-3">
              {showText && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`transition-colors ${isListening ? "text-red-300" : "text-white/80 hover:text-white"}`}
                  aria-label="음성 입력"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
              )}
              {!mediaPreview && (
                <label className="text-white/80 hover:text-white transition-colors cursor-pointer" aria-label="사진/영상 올리기">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <input type="file" accept="image/*,video/*" capture="environment" onChange={handleMedia} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* 등록 버튼 — outline, 우측 정렬 */}
        <div className="flex justify-end mb-6">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="border border-maul text-maul bg-white text-sm font-bold px-5 py-1.5 rounded-full disabled:opacity-40 transition-opacity"
          >
            {submitting ? "등록 중…" : "등록"}
          </button>
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
            <p className="text-center py-8 text-sub text-sm">첫 번째 답변을 남겨보세요 </p>
          ) : (
            <div className="flex flex-col gap-3">
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
    </div>
  );
}
