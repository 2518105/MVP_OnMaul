import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { getUser } from "../../api/auth";
import LoginPromptSheet from "../../components/LoginPromptSheet";

function timeAgo(dateStr) {
  const utc = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
  const diff = Date.now() - new Date(utc);
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function FreeBoardPage({ search = "" }) {
  const navigate = useNavigate();
  const user = getUser();
  const [posts, setPosts] = useState([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    api.get("/free-board")
      .then(r => setPosts(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPosts([]));
  }, []);

  const filtered = posts.filter(p =>
    !search.trim() || p.title.includes(search.trim())
  );

  return (
    <div className="min-h-screen">
      <div className="bg-white rounded-2xl mx-4 mt-3 shadow-sm overflow-hidden fade-in">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-sub text-sm">첫 글을 작성해보세요</p>
        ) : (
          filtered.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/free-board/${p.id}`)}
              className="w-full text-left px-5 py-4 border-b border-gray-100 hover:bg-white/50 transition-colors"
            >
              <p className="text-sm font-semibold text-ink mb-1 leading-snug">{p.title}</p>
              <div className="flex items-center gap-2 text-xs text-sub">
                <span>{p.author_nickname}</span>
                <span>·</span>
                <span>{timeAgo(p.created_at)}</span>
              </div>
            </button>
          ))
        )}
      </div>

      <button
        onClick={() => user ? navigate("/free-board/write") : setShowLoginPrompt(true)}
        className="fixed bottom-36 right-4 w-14 h-14 bg-maul rounded-full shadow-lg flex items-center justify-center hover:bg-maul-dark transition-colors z-20"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      {showLoginPrompt && <LoginPromptSheet onClose={() => setShowLoginPrompt(false)} />}
    </div>
  );
}
