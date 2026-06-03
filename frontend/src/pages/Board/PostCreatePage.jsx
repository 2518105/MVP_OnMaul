import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { logEvent } from "../../api/client";
import { getUser } from "../../api/auth";
import LoginPromptSheet from "../../components/LoginPromptSheet";

const CATEGORIES = [
  { value: "구인 공고", label: "구인 공고" },
  { value: "질문", label: "질문" },
  { value: "면 정보", label: "면 정보" },
];

function Toast({ msg }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
      {msg}
    </div>
  );
}

export default function PostCreatePage() {
  const navigate = useNavigate();
  const user = getUser();
  const [form, setForm] = useState({ title: "", content: "", category: "농사·약" });
  const [previews, setPreviews] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(!user);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files).slice(0, 5 - images.length);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setImages(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...newPreviews]);
  }

  function removeImage(i) {
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.content.trim()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("content", form.content);
      fd.append("category", form.category);
      if (images[0]) fd.append("image", images[0]);
      const r = await api.post("/posts", fd, { headers: { "Content-Type": "multipart/form-data" } });
      logEvent("post_created", { category: form.category, has_photo: images.length > 0 });
      navigate(`/board/${r.data.id}`);
    } catch {
      showToast("등록에 실패했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {showLoginPrompt && <LoginPromptSheet onClose={() => navigate(-1)} />}
      {toast && <Toast msg={toast} />}

      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 pt-14 pb-3 bg-cream sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
          <h1 className="text-base font-bold text-ink">새 글 쓰기</h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading || !form.title.trim() || !form.content.trim()}
          className="bg-maul text-ink text-sm font-bold px-4 py-1.5 rounded-full disabled:opacity-40"
        >
          {loading ? "등록 중" : "등록"}
        </button>
      </header>

      <div className="px-4 space-y-4">
        {/* 카테고리 칩 */}
        <div>
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-2 w-max">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setForm(f => ({ ...f, category: c.value }))}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                    form.category === c.value
                      ? "bg-maul border-maul text-ink font-bold"
                      : "border-gray-300 text-sub bg-white"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-sub mt-1.5">본문 입력 시 자동 추천 → 변경 가능</p>
        </div>

        {/* 제목 */}
        <input
          className="input text-sm font-medium"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="제목 (최대 50자)"
          maxLength={50}
        />

        {/* 본문 */}
        <textarea
          className="input resize-none text-sm leading-relaxed"
          rows={8}
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          placeholder="본문을 입력하세요… (최대 2,000자)"
          maxLength={2000}
        />

        {/* 이미지 미리보기 */}
        {previews.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {previews.map((src, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={src} alt="" className="w-20 h-20 object-cover rounded-xl" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 bg-ink text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 툴바 */}
        <div className="flex items-center gap-4 py-3 border-t border-gray-100">
          <label className="flex items-center gap-1.5 text-sub text-sm cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <span>{images.length}/5</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
              disabled={images.length >= 5}
            />
          </label>

          {/* 빈 썸네일 슬롯 */}
          {[0, 1].map(i => (
            <div key={i} className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300 text-xl">
              +
            </div>
          ))}

          <button
            onClick={() => showToast("음성 녹음 기능은 준비 중입니다")}
            className="ml-auto flex items-center gap-1.5 text-sub text-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            <span>음성 추가</span>
          </button>
        </div>

        {/* 하단 CTA */}
        <button
          onClick={handleSubmit}
          disabled={loading || !form.title.trim() || !form.content.trim()}
          className="btn-maul mb-8"
        >
          {loading ? "등록 중..." : "등록하기"}
        </button>
      </div>
    </div>
  );
}
