import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/client";
import { getUser } from "../../api/auth";
import { getSavedPosts, getMyComments } from "../../utils/activity";

const TYPE_LABELS = {
  hanmadi: "내가 쓴 한마디",
  posts: "내가 쓴 글",
  saves: "저장한 글",
  likes: "좋아요 한 글",
  comments: "내 댓글",
};

export default function MyActivityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "posts";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getUser()) { navigate("/login"); return; }
    loadData();
  }, [type]);

  async function loadData() {
    setLoading(true);
    try {
      if (type === "hanmadi") {
        const { data } = await api.get("/hanmadi/my-answers");
        setItems(Array.isArray(data) ? data : []);
      } else if (type === "posts") {
        const { data } = await api.get("/users/me/posts");
        setItems(Array.isArray(data) ? data : []);
      } else if (type === "saves") {
        setItems(getSavedPosts());
      } else if (type === "likes") {
        const { data } = await api.get("/users/me/liked-posts");
        setItems(Array.isArray(data) ? data : []);
      } else if (type === "comments") {
        setItems(getMyComments());
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const title = TYPE_LABELS[type] || "활동";
  const isEmpty = !loading && items.length === 0;

  const emptyMsg = {
    hanmadi: "아직 남긴 한마디가 없어요",
    posts: "아직 쓴 글이 없어요",
    saves: "저장한 글이 없어요",
    likes: "좋아요 한 글이 없어요",
    comments: "아직 댓글을 남기지 않았어요",
  }[type];

  return (
    <div className="min-h-screen bg-[#f1f1f1] pb-24">
      <header className="flex items-center gap-3 px-5 pt-12 pb-3 sticky top-0 bg-[#f1f1f1] z-10">
        <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
        <h1 className="text-base font-bold text-ink">{title}</h1>
      </header>

      <div className="px-4">
        {loading ? (
          <p className="text-center py-12 text-sub text-sm">불러오는 중...</p>
        ) : isEmpty ? (
          <p className="text-center py-12 text-sub text-sm">{emptyMsg}</p>
        ) : type === "hanmadi" ? (
          <div className="flex flex-col gap-3">
            {items.map(group => (
              <div key={group.question_id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-maul px-4 py-3">
                  <p className="text-sm font-bold text-ink">{group.question_text}</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {group.answers.map(a => (
                    <div key={a.id} className="px-4 py-3">
                      {a.media_url && (
                        <img src={a.media_url} alt="" className="w-full max-h-40 object-cover rounded-xl mb-2" />
                      )}
                      {a.content && <p className="text-sm text-ink">{a.content}</p>}
                      <div className="flex gap-3 mt-1.5 text-xs text-sub">
                        <span>❤️ {a.like_count}</span>
                        <span>{new Date(a.created_at).toLocaleDateString("ko-KR")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : type === "comments" ? (
          <div className="flex flex-col gap-2">
            {items.map((c, i) => (
              <div
                key={i}
                onClick={() => navigate(`/board/${c.postId}`)}
                className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:opacity-80"
              >
                <p className="text-xs text-sub truncate mb-1">{c.postTitle}</p>
                <p className="text-sm text-ink">{c.content}</p>
                <p className="text-xs text-sub/60 mt-1.5">
                  {new Date(c.date).toLocaleDateString("ko-KR")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/board/${p.id}`)}
                className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:opacity-80"
              >
                <p className="text-xs text-maul font-medium mb-1">{p.category}</p>
                <p className="text-sm text-ink font-medium line-clamp-2">{p.title}</p>
                <div className="flex gap-3 mt-1.5 text-xs text-sub">
                  <span>좋아요 {p.like_count ?? 0}</span>
                  <span>댓글 {p.comment_count ?? 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
