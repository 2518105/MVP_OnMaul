import { useState } from "react";

export default function AnswerCard({ answer, onLike, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(answer.content || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isMine = answer.is_mine === true;
  const canEdit = isMine && !!answer.content && !!onEdit;
  const canDelete = isMine && !!onDelete;

  function timeAgo(dateStr) {
    const utc = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
    const diff = Date.now() - new Date(utc);
    const m = Math.floor(diff / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  }

  function handleSave() {
    if (!editText.trim()) return;
    onEdit(answer.id, editText.trim());
    setEditing(false);
  }

  function handleCancelEdit() {
    setEditing(false);
    setEditText(answer.content || "");
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-maul flex items-center justify-center text-sm font-bold text-ink flex-shrink-0">
          {answer.author_nickname[0]}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-ink">{answer.author_nickname}</span>
          <span className="text-xs text-sub ml-1.5">{answer.author_type}</span>
        </div>
        <span className="text-xs text-sub">{timeAgo(answer.created_at)}</span>
        {canEdit && !editing && !confirmDelete && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-sub underline underline-offset-2 ml-1"
          >
            수정
          </button>
        )}
        {canDelete && !editing && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-red-400 underline underline-offset-2 ml-1"
          >
            삭제
          </button>
        )}
      </div>

      {/* 삭제 확인 */}
      {confirmDelete && (
        <div className="flex items-center gap-3 mb-2 pl-10">
          <span className="text-xs text-ink">정말 삭제할까요?</span>
          <button
            onClick={() => { onDelete(answer.id); setConfirmDelete(false); }}
            className="text-xs text-red-500 font-bold"
          >
            삭제
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs text-sub"
          >
            취소
          </button>
        </div>
      )}

      {/* 본문 또는 편집 모드 */}
      {editing ? (
        <div className="pl-10 mb-3">
          <textarea
            className="w-full text-sm text-ink border border-gray-200 rounded-xl p-2.5 outline-none resize-none focus:border-maul"
            rows={3}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            maxLength={200}
            autoFocus
          />
          <div className="flex gap-3 mt-1.5">
            <button
              onClick={handleSave}
              className="text-xs text-maul font-bold"
            >
              저장
            </button>
            <button
              onClick={handleCancelEdit}
              className="text-xs text-sub"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        answer.content && (
          <p className="text-sm text-ink leading-relaxed mb-3 pl-10">{answer.content}</p>
        )
      )}

      {answer.media_url && (
        <img
          src={answer.media_url}
          alt=""
          className="w-full h-44 object-cover rounded-xl mb-3"
        />
      )}

      <div className="flex items-center gap-4 text-xs text-sub pl-10">
        <button
          onClick={onLike}
          className={`flex items-center gap-1 transition-colors ${
            answer.is_liked ? "text-red-500 font-semibold" : "hover:text-ink"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={answer.is_liked ? "#EF4444" : "none"} stroke={answer.is_liked ? "#EF4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span>{answer.like_count}</span>
        </button>
        <span className="flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>{answer.comment_count}</span>
        </span>
      </div>
    </div>
  );
}
