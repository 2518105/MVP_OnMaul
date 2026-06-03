import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { logEvent } from "../../api/client";
import { getUser } from "../../api/auth";
import LoginPromptSheet from "../../components/LoginPromptSheet";


function Toast({ msg }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
      {msg}
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const [apiPost, setApiPost] = useState(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [toast, setToast] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then(r => {
        setApiPost(r.data);
        setLikeCount(r.data.like_count ?? 8);
        setLiked(r.data.is_liked ?? false);
        const rawComments = r.data.comments;
        if (Array.isArray(rawComments) && rawComments.length) {
          setComments(rawComments.map(c => ({
            id: c.id, author: c.author_nickname, type: c.author_type, text: c.content
          })));
        }
        logEvent("post_viewed", { post_id: Number(id), category: r.data.category });
      })
      .catch(() => {});
  }, [id]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleLike() {
    if (!user) { setShowLoginPrompt(true); return; }
    try {
      await api.post(`/posts/${id}/like`);
      setLiked(v => !v);
      setLikeCount(v => liked ? v - 1 : v + 1);
    } catch {
      setLiked(v => !v);
      setLikeCount(v => liked ? v - 1 : v + 1);
    }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!user) { setShowLoginPrompt(true); return; }
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const r = await api.post(`/posts/${id}/comments`, { content: comment });
      setComments(prev => [...prev, { id: r.data.id, author: user.nickname, type: user.user_type, text: comment }]);
      logEvent("comment_created", { post_id: Number(id) });
    } catch {
      setComments(prev => [...prev, { id: Date.now(), author: user?.nickname ?? "나", type: "이주민", text: comment }]);
    } finally {
      setComment("");
      setSubmitting(false);
    }
  }

  if (!apiPost) return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <p className="text-sub text-sm">게시글을 불러오는 중...</p>
    </div>
  );

  const post = {
    category: apiPost.category,
    author: apiPost.author_nickname,
    authorType: apiPost.author_type,
    title: apiPost.title,
    content: apiPost.content,
    imageUrl: apiPost.image_url,
  };

  return (
    <div className="min-h-screen bg-cream">
      {toast && <Toast msg={toast} />}

      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 pt-14 pb-3 bg-cream sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
          <span className="text-xs bg-white border border-gray-200 text-sub px-2.5 py-1 rounded-full">
            {post.category}
          </span>
        </div>
        <button className="text-sub text-lg">···</button>
      </header>

      <div className="px-5 pb-32">
        {/* 작성자 */}
        <div className="flex items-center gap-3 mb-4 fade-in">
          <div className="w-10 h-10 rounded-full bg-maul flex items-center justify-center text-lg font-bold">
            {post.author[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink">{post.author}</span>
            </div>
            <p className="text-xs text-sub">{post.authorType}</p>
          </div>
        </div>

        {/* 제목 + 본문 */}
        <h1 className="text-lg font-bold text-ink mb-3 fade-in-1">{post.title}</h1>

        {post.imageUrl && (
          <img src={post.imageUrl} alt="" className="w-full rounded-2xl mb-3 fade-in-1" />
        )}

        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mb-4 fade-in-2">
          {post.content}
        </p>

        {/* 반응 바 */}
        <div className="flex items-center gap-5 py-3 border-t border-b border-gray-100 mb-4 fade-in-3">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-red-500 font-semibold" : "text-sub"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "#EF4444" : "none"} stroke={liked ? "#EF4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span>{likeCount}</span>
          </button>
          <span className="flex items-center gap-1.5 text-sm text-sub">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span>{comments.length}</span>
          </span>
          <button
            onClick={() => showToast("공유 기능은 준비 중입니다")}
            className="flex items-center gap-1.5 text-sm text-sub ml-auto"
          >
            <span>↗ 공유</span>
          </button>
        </div>

        {/* 댓글 */}
        <div className="space-y-3 fade-in-4">
          {comments.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-cream flex items-center justify-center text-xs font-bold text-sub">
                  {c.author[0]}
                </div>
                <span className="text-sm font-semibold text-ink">{c.author}</span>
                <span className="text-xs text-sub">{c.type}</span>
              </div>
              <p className="text-sm text-ink pl-9">{c.text}</p>
            </div>
          ))}
        </div>
      </div>

      {showLoginPrompt && <LoginPromptSheet onClose={() => setShowLoginPrompt(false)} />}

      {/* 댓글 입력 (fixed 하단) */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
        <input
          className="input flex-1 text-sm"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="댓글 또는 음성 댓글…"
          onKeyDown={e => e.key === "Enter" && handleComment(e)}
        />
        <button
          onClick={() => showToast("음성 녹음 기능은 준비 중입니다")}
          className="text-sub"
        ><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </button>
        <button
          onClick={handleComment}
          disabled={submitting || !comment.trim()}
          className="bg-maul text-ink text-sm font-bold px-3 py-2 rounded-xl disabled:opacity-40"
        >
          등록
        </button>
      </div>
    </div>
  );
}
