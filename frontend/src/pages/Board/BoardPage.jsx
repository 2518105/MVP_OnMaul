import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { logEvent } from "../../api/client";
import { getUser } from "../../api/auth";
import LoginPromptSheet from "../../components/LoginPromptSheet";

const CATEGORIES = [
  { value: "", label: "전체" },
  { value: "농사·약", label: "농사·약" },
  { value: "동네정보", label: "동네정보" },
  { value: "한마디", label: "한마디" },
  { value: "나눔/거래", label: "나눔/거래" },
  { value: "이장인증", label: "이장인증" },
];

const DUMMY_POSTS = [
  { id: 1, category: "농사·약", time: "1시간 전", title: "오늘 농약 사러 갈 곳 추천?", comments: 12, likes: 10, badge: "이장인증" },
  { id: 2, category: "동네정보", time: "3시간 전", title: "면사무소 주차장 주차 가능?", comments: 4, likes: 2, badge: null },
  { id: 3, category: "잃어버림", time: "어제", title: "강아지 봤어요 (목동마을)", comments: 9, likes: 7, badge: null },
  { id: 4, category: "한마디", time: "어제", title: "나물 무침 레시피 공유 🥬", comments: 21, likes: 19, badge: null },
];

function FeedItem({ post }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/board/${post.id}`)}
      className="w-full text-left px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-white/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-sub">{post.category}</span>
        {post.badge && (
          <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-medium">
            {post.badge}
          </span>
        )}
        <span className="text-xs text-sub ml-auto">{post.time}</span>
      </div>
      <p className="text-sm font-semibold text-ink mb-2 leading-snug">{post.title}</p>
      <div className="flex items-center gap-3 text-xs text-sub">
        <span>💬 {post.comments}</span>
        <span>♡ {post.likes}</span>
      </div>
    </button>
  );
}

function ApiFeedItem({ post }) {
  const navigate = useNavigate();
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "방금 전";
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  };
  return (
    <button
      onClick={() => navigate(`/board/${post.id}`)}
      className="w-full text-left px-5 py-4 border-b border-gray-100 hover:bg-white/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-sub">{post.category}</span>
        <span className="text-xs text-sub ml-auto">{timeAgo(post.created_at)}</span>
      </div>
      <p className="text-sm font-semibold text-ink mb-2 leading-snug">{post.title}</p>
      <div className="flex items-center gap-3 text-xs text-sub">
        <span>💬 {post.comment_count ?? 0}</span>
        <span>♡ {post.like_count ?? 0}</span>
      </div>
    </button>
  );
}

export default function BoardPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [category, setCategory] = useState("");
  const [apiPosts, setApiPosts] = useState([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    logEvent("tab_view", { tab_name: "board" });
    api.get("/posts", { params: category ? { category } : {} })
      .then(r => setApiPosts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setApiPosts([]));
  }, [category]);

  const filteredDummy = DUMMY_POSTS.filter(p => {
    if (category && p.category !== category) return false;
    if (search.trim()) return p.title.includes(search.trim()) || p.category.includes(search.trim());
    return true;
  });

  const allPosts = [...filteredDummy];

  return (
    <div className="min-h-screen">
      {/* 헤더 + 카테고리 sticky */}
      <div className="sticky top-0 z-10 bg-white">
        <header className="px-5 pt-14 pb-3">
          <h1 className="text-xl font-bold text-ink mb-3">게시판</h1>
          <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
            <span className="text-sub mr-2 text-sm">🔍</span>
            <input
              ref={searchRef}
              className="flex-1 text-sm text-ink bg-transparent outline-none placeholder-sub"
              placeholder="제목, 카테고리로 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-sub text-xs ml-1">✕</button>
            )}
          </div>
        </header>

        {/* 카테고리 칩 */}
        <div className="px-4 pb-3 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                  category === c.value
                    ? "bg-maul border-maul text-ink font-bold"
                    : "border-gray-300 text-sub bg-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 피드 */}
      <div className="bg-white rounded-2xl mx-4 mt-3 shadow-sm overflow-hidden fade-in">
        {allPosts.length === 0 ? (
          <p className="text-center py-10 text-sub text-sm">이 카테고리의 첫 글을 작성해보세요</p>
        ) : (
          allPosts.map(p => <FeedItem key={p.id} post={p} />)
        )}
        {(Array.isArray(apiPosts) ? apiPosts : []).map(p => <ApiFeedItem key={`api-${p.id}`} post={p} />)}
      </div>

      {/* 플로팅 버튼 */}
      <button
        onClick={() => user ? navigate("/board/new") : setShowLoginPrompt(true)}
        className="fixed bottom-36 right-4 w-14 h-14 bg-maul rounded-full shadow-lg text-2xl flex items-center justify-center hover:bg-maul-dark transition-colors z-20"
      >
        ✏️
      </button>

      {showLoginPrompt && <LoginPromptSheet onClose={() => setShowLoginPrompt(false)} />}
    </div>
  );
}
