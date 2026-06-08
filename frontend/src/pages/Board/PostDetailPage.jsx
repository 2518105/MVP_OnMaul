import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { logEvent } from "../../api/client";
import { getUser } from "../../api/auth";
import LoginPromptSheet from "../../components/LoginPromptSheet";
import {
  isPostSaved, savePost, unsavePost,
  addLikedPost, removeLikedPost,
  addMyComment,
} from "../../utils/activity";

const CATEGORIES = ["동네 정보", "구인·구직", "나눔·거래", "질문"];

function Toast({ msg }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
      {msg}
    </div>
  );
}

function ActionSheet({ onEdit, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-4 pb-24 max-w-[390px] mx-auto w-full">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <button
          onClick={onEdit}
          className="w-full py-3.5 text-sm text-ink text-left border-b border-gray-100"
        >
          수정하기
        </button>
        <button
          onClick={onDelete}
          className="w-full py-3.5 text-sm text-red-500 text-left"
        >
          삭제하기
        </button>
      </div>
    </div>
  );
}

function PostEditSheet({ post, onClose, onSave }) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [category, setCategory] = useState(post.category);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!title.trim() || !content.trim()) { setError("제목과 본문을 입력해주세요"); return; }
    setSaving(true);
    setError("");
    try {
      const { data } = await api.patch(`/posts/${post.id}`, { title: title.trim(), content: content.trim(), category });
      onSave(data);
    } catch {
      setError("저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-6 pb-24 max-w-[390px] mx-auto w-full max-h-[85vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-base font-bold text-ink mb-4">게시글 수정</h2>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                category === c ? "bg-maul border-maul text-ink font-bold" : "border-gray-300 text-sub bg-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <input
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-maul mb-3"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={50}
          placeholder="제목"
        />
        <textarea
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-maul resize-none"
          rows={7}
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={2000}
          placeholder="본문"
        />

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 py-3 bg-maul text-ink text-sm font-bold rounded-xl disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

function DeleteConfirmSheet({ onClose, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-6 pb-24 max-w-[390px] mx-auto w-full">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <p className="text-base font-bold text-ink text-center">게시글을 삭제할까요?</p>
        <p className="text-xs text-sub text-center mt-1 mb-6">삭제된 게시글은 복구할 수 없어요</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-sub font-medium">취소</button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-3 bg-red-500 rounded-xl text-sm text-white font-bold disabled:opacity-50"
          >
            {deleting ? "삭제 중…" : "삭제"}
          </button>
        </div>
      </div>
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
  const [saved, setSaved] = useState(() => isPostSaved(Number(id)));
  const [toast, setToast] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then(r => {
        setApiPost(r.data);
        setLikeCount(r.data.like_count ?? 0);
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

  function postSnapshot() {
    if (!apiPost) return null;
    return {
      id: Number(id),
      title: apiPost.title,
      category: apiPost.category,
      like_count: likeCount,
      comment_count: comments.length,
      author_nickname: apiPost.author_nickname,
    };
  }

  async function handleLike() {
    if (!user) { setShowLoginPrompt(true); return; }
    const nowLiked = liked;
    try { await api.post(`/posts/${id}/like`); } catch {}
    setLiked(!nowLiked);
    setLikeCount(v => nowLiked ? v - 1 : v + 1);
    const snap = postSnapshot();
    if (snap) {
      if (!nowLiked) addLikedPost(snap);
      else removeLikedPost(snap.id);
    }
  }

  function handleSave() {
    if (!user) { setShowLoginPrompt(true); return; }
    const snap = postSnapshot();
    if (!snap) return;
    if (saved) {
      unsavePost(snap.id);
      setSaved(false);
      showToast("저장 취소됐어요");
    } else {
      savePost(snap);
      setSaved(true);
      showToast("저장됐어요");
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
      setComments(prev => [...prev, { id: Date.now(), author: user?.nickname ?? "나", type: "손님", text: comment }]);
    }
    if (apiPost) addMyComment({ postId: Number(id), postTitle: apiPost.title, content: comment.trim() });
    setComment("");
    setSubmitting(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/posts/${id}`);
      navigate(-1);
    } catch {
      showToast("삭제에 실패했어요");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function handleEditSave(updatedPost) {
    setApiPost(prev => ({ ...prev, ...updatedPost }));
    setShowEditSheet(false);
    showToast("수정됐어요");
  }

  if (!apiPost) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-sub text-sm">게시글을 불러오는 중...</p>
    </div>
  );

  const isMine = apiPost.is_mine === true;

  return (
    <div className="min-h-screen bg-white">
      {toast && <Toast msg={toast} />}

      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 pt-14 pb-3 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
          <span className="text-xs bg-white border border-gray-200 text-sub px-2.5 py-1 rounded-full">
            {apiPost.category}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} aria-label={saved ? "저장 취소" : "저장"} className="p-1">
            <svg width="22" height="22" viewBox="0 0 24 24"
              fill={saved ? "#639d6b" : "none"}
              stroke={saved ? "#639d6b" : "#9ca3af"}
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          {isMine && (
            <div className="flex items-center gap-3">
              <button onClick={() => setShowEditSheet(true)} className="text-xs text-maul font-medium">수정하기</button>
              <button onClick={() => setShowDeleteConfirm(true)} className="text-xs text-red-400 font-medium">삭제하기</button>
            </div>
          )}
        </div>
      </header>

      <div className="px-5 pb-32">
        {/* 작성자 */}
        <div className="flex items-center gap-3 mb-4 fade-in">
          <div className="w-10 h-10 rounded-full bg-maul flex items-center justify-center text-lg font-bold">
            {apiPost.author_nickname[0]}
          </div>
          <div>
            <span className="text-sm font-bold text-ink">{apiPost.author_nickname}</span>
            <p className="text-xs text-sub">{apiPost.author_type}</p>
          </div>
        </div>

        {/* 제목 + 본문 */}
        <h1 className="text-lg font-bold text-ink mb-3 fade-in-1">{apiPost.title}</h1>
        {apiPost.image_url && (
          <img src={apiPost.image_url} alt="" className="w-full rounded-2xl mb-3 fade-in-1" />
        )}
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mb-4 fade-in-2">
          {apiPost.content}
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
            onClick={() => showToast("공유 기능은 준비 중이에요")}
            className="flex items-center gap-1.5 text-sm text-sub ml-auto"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span>공유</span>
          </button>
        </div>

        {/* 댓글 */}
        <div className="space-y-3 fade-in-4">
          {comments.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs font-bold text-sub">
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

      {showEditSheet && apiPost && (
        <PostEditSheet
          post={{ id: Number(id), title: apiPost.title, content: apiPost.content, category: apiPost.category }}
          onClose={() => setShowEditSheet(false)}
          onSave={handleEditSave}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmSheet
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      {/* 댓글 입력 */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
        <input
          className="input flex-1 text-sm"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="댓글을 입력하세요…"
          onKeyDown={e => e.key === "Enter" && handleComment(e)}
        />
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
