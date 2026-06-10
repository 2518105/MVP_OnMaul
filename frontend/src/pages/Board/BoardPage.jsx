import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { logEvent } from "../../api/client";
import { getUser, getAuthorPhoto } from "../../api/auth";
import LoginPromptSheet from "../../components/LoginPromptSheet";
import { formatTimeAgo } from "../../utils/time";
import UserAvatar from "../../components/UserAvatar";

const CATEGORIES = [
  { value: "", label: "전체" },
  { value: "자유게시판", label: "자유게시판" },
  { value: "동네 정보", label: "동네 정보" },
  { value: "질문", label: "질문" },
  { value: "구인·구직", label: "구인·구직" },
  { value: "나눔·거래", label: "나눔·거래" }
];


function ApiFeedItem({ post }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/board/${post.id}`)}
      className="w-full text-left px-5 py-4 border-b border-gray-100 hover:bg-white/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-sub">{post.category}</span>
        <span className="text-xs text-sub ml-auto">{formatTimeAgo(post.created_at)}</span>
      </div>
      <p className="text-sm font-semibold text-ink mb-2 leading-snug">{post.title}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <UserAvatar nickname={post.author_nickname} photoUrl={getAuthorPhoto(post.author_nickname)} size={32} />
          <span className="text-xs text-sub">{post.author_nickname}</span>
          {post.author_type && (
            <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">{post.author_type}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-sub">
          <span className="flex items-center gap-1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>{post.comment_count ?? 0}</span>
          <span className="flex items-center gap-1"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>{post.like_count ?? 0}</span>
        </div>
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

  const filteredPosts = (Array.isArray(apiPosts) ? apiPosts : []).filter(p =>
    !search.trim() || p.title.includes(search.trim()) || p.category.includes(search.trim())
  );

  return (
    <div className="min-h-screen">
      {/* 헤더 + 카테고리 sticky */}
      <div className="sticky top-0 z-10 bg-white">
        <header className="px-5 pt-14 pb-3">
          <h1 className="text-xl font-bold text-ink mb-3">게시판</h1>
          <div className="flex items-center bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sub mr-2 flex-shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
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
        {filteredPosts.length === 0 ? (
          <p className="text-center py-10 text-sub text-sm">이 카테고리의 첫 글을 작성해보세요</p>
        ) : (
          filteredPosts.map(p => <ApiFeedItem key={p.id} post={p} />)
        )}
      </div>

      {/* 플로팅 버튼 */}
      <button
        onClick={() => user ? navigate("/board/new") : setShowLoginPrompt(true)}
        className="fixed bottom-36 right-4 w-14 h-14 bg-maul rounded-full shadow-lg flex items-center justify-center hover:bg-maul-dark transition-colors z-20"
      ><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>

      {showLoginPrompt && <LoginPromptSheet onClose={() => setShowLoginPrompt(false)} />}
    </div>
  );
}
