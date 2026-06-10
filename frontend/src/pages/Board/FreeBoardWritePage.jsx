import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";

export default function FreeBoardWritePage({ isEdit = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && id) {
      api.get(`/free-board/${id}`)
        .then(r => {
          setTitle(r.data.title);
          setContent(r.data.content);
        })
        .catch(() => navigate("/board?tab=free"));
    }
  }, [isEdit, id]);

  async function handleSubmit() {
    const t = title.trim();
    const c = content.trim();
    if (!t) { setError("제목을 입력해주세요"); return; }
    if (!c) { setError("내용을 입력해주세요"); return; }

    setSubmitting(true);
    setError("");
    try {
      if (isEdit) {
        await api.put(`/free-board/${id}`, { title: t, content: c });
        navigate(`/free-board/${id}`);
      } else {
        const { data } = await api.post("/free-board", { title: t, content: c });
        navigate(`/free-board/${data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-5 pt-14 pb-4 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
        <h1 className="text-base font-bold text-ink">{isEdit ? "글 수정" : "글 작성"}</h1>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="text-sm font-bold text-maul disabled:opacity-40"
        >
          {submitting ? "저장 중…" : "등록"}
        </button>
      </header>

      <div className="flex-1 px-5 pt-4 flex flex-col gap-4">
        <input
          className="w-full text-base font-semibold text-ink border-b border-gray-200 pb-3 outline-none placeholder-gray-300"
          placeholder="제목을 입력하세요"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={100}
        />
        <textarea
          className="flex-1 w-full text-sm text-ink outline-none resize-none placeholder-gray-300 min-h-[50vh]"
          placeholder="내용을 입력하세요"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
