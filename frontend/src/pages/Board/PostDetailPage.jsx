import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { logEvent } from "../../api/client";
import { getUser } from "../../api/auth";
import LoginPromptSheet from "../../components/LoginPromptSheet";

const DUMMY_POST = {
  id: 1,
  category: "농사·약",
  author: "이장 김씨",
  authorBadge: "인증",
  authorType: "주민",
  time: "1시간 전",
  title: "이번 주말 농약 공동구매 합니다",
  content: "이번 주 토요일 오전 10시에 청산주차장에서 농약 공동구매를 진행합니다.\n필요하신 분들은 댓글 남겨주시거나 이장님께 직접 연락주세요.\n\n• 제초제 (리터당 3,200원)\n• 살충제 (봉지당 2,500원)\n\n최소 10명 이상 모이면 진행됩니다.",
  hasImage: true,
  hasVoice: true,
  likes: 8,
  isLiked: false,
  comments: [
    { id: 1, author: "단풍나무", type: "이주민", text: "저도 참여하고 싶어요!" },
    { id: 2, author: "동이댁", type: "주민", text: "몇 시에 모이나요?" },
  ],
};

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
  const [likeCount, setLikeCount] = useState(8);
  const [comments, setComments] = useState(DUMMY_POST.comments);
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

  const post = apiPost ? {
    ...DUMMY_POST,
    category: apiPost.category,
    author: apiPost.author_nickname,
    title: apiPost.title,
    content: apiPost.content,
    hasImage: !!apiPost.image_url,
  } : DUMMY_POST;

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
              {post.authorBadge && (
                <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                  {post.authorBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-sub">{post.authorType} · {post.time}</p>
          </div>
        </div>

        {/* 제목 + 본문 */}
        <h1 className="text-lg font-bold text-ink mb-3 fade-in-1">{post.title}</h1>

        {post.hasImage && (
          <div className="w-full h-44 bg-gray-200 rounded-2xl mb-3 flex items-center justify-center text-gray-400 text-sm fade-in-1">
            📷 사진 1/2
          </div>
        )}

        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mb-4 fade-in-2">
          {post.content}
        </p>

        {post.hasVoice && (
          <div className="bg-white rounded-2xl p-4 flex items-center gap-3 mb-4 shadow-sm fade-in-2">
            <button
              onClick={() => showToast("음성 재생 기능은 준비 중입니다")}
              className="w-10 h-10 bg-maul rounded-full flex items-center justify-center text-lg"
            >
              ▶
            </button>
            <div>
              <p className="text-xs text-sub">음성 메시지</p>
              <p className="text-sm font-medium text-ink">음성 0:42</p>
            </div>
            <div className="flex-1 h-1 bg-gray-200 rounded-full ml-2">
              <div className="h-1 bg-maul rounded-full w-1/3" />
            </div>
          </div>
        )}

        {/* 반응 바 */}
        <div className="flex items-center gap-5 py-3 border-t border-b border-gray-100 mb-4 fade-in-3">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-red-500 font-semibold" : "text-sub"}`}
          >
            <span>{liked ? "♥" : "♡"}</span>
            <span>{likeCount}</span>
          </button>
          <span className="flex items-center gap-1.5 text-sm text-sub">
            <span>💬</span>
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
          className="text-xl"
        >
          🎤
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
