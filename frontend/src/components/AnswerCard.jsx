export default function AnswerCard({ answer, onLike }) {
  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr);
    const m = Math.floor(diff / 60000);
    if (m < 1) return "방금";
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-maul flex items-center justify-center text-sm font-bold text-ink flex-shrink-0">
          {answer.author_nickname[0]}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-ink">{answer.author_nickname}</span>
          <span className="text-xs text-sub ml-1.5">{answer.author_type}</span>
        </div>
        <span className="text-xs text-sub">{timeAgo(answer.created_at)}</span>
      </div>

      {answer.content && (
        <p className="text-sm text-ink leading-relaxed mb-3 pl-10">{answer.content}</p>
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
          <span>{answer.is_liked ? "♥" : "♡"}</span>
          <span>{answer.like_count}</span>
        </button>
        <span className="flex items-center gap-1">
          <span>💬</span>
          <span>{answer.comment_count}</span>
        </span>
      </div>
    </div>
  );
}
