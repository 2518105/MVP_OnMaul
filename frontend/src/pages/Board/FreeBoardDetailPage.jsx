import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/client";
import { getUser } from "../../api/auth";

function timeAgo(dateStr) {
  const utc = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
  const diff = Date.now() - new Date(utc);
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function FreeBoardDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    api.get(`/free-board/${id}`)
      .then(r => setPost(r.data))
      .catch(() => navigate("/board"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    try {
      await api.delete(`/free-board/${id}`);
      navigate("/board?tab=free");
    } catch {
      alert("삭제에 실패했습니다.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sub text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="min-h-screen bg-white">
      <header className="px-5 pt-14 pb-4 flex items-center gap-3 sticky top-0 bg-white z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
        <h1 className="text-base font-bold text-ink flex-1 truncate">{post.title}</h1>
        {post.is_mine && (
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/free-board/${id}/edit`)}
              className="text-xs text-maul font-medium"
            >
              수정
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-red-400 font-medium"
            >
              삭제
            </button>
          </div>
        )}
      </header>

      <div className="px-5 pt-4">
        <div className="flex items-center gap-2 mb-4 text-xs text-sub">
          <span className="font-medium text-ink">{post.author_nickname}</span>
          <span>·</span>
          <span>{timeAgo(post.created_at)}</span>
          {post.updated_at !== post.created_at && <span className="text-gray-300">(수정됨)</span>}
        </div>
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 mx-6 w-full max-w-sm shadow-xl">
            <p className="text-sm text-ink font-semibold mb-1">게시글을 삭제할까요?</p>
            <p className="text-xs text-sub mb-5">삭제한 글은 복구할 수 없어요.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-sub"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-400 text-white text-sm font-bold"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
