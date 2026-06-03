import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { logout, getUser } from "../../api/auth";

export default function MyPage() {
  const navigate = useNavigate();
  const localUser = getUser();
  const [profile, setProfile] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [myAnswers, setMyAnswers] = useState([]);
  const [tab, setTab] = useState("posts");
  const [editNickname, setEditNickname] = useState(false);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localUser) {
      navigate("/login");
      return;
    }
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [profileRes, postsRes, answersRes] = await Promise.all([
        api.get("/users/me"),
        api.get("/users/me/posts"),
        api.get("/users/me/answers"),
      ]);
      setProfile(profileRes.data);
      setNickname(profileRes.data.nickname);
      setMyPosts(postsRes.data);
      setMyAnswers(answersRes.data);
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleNicknameSave() {
    try {
      const { data } = await api.patch("/users/me/nickname", { nickname });
      setProfile(data);
      setNickname(data.nickname);
      const user = getUser();
      localStorage.setItem("user", JSON.stringify({ ...user, nickname: data.nickname }));
      setEditNickname(false);
    } catch (err) {
      alert(err.response?.data?.detail || "닉네임 변경 실패");
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sub text-sm">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[390px] mx-auto px-4 pt-6 pb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">마이페이지</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 border border-red-200 rounded-lg px-3 py-1.5"
        >
          로그아웃
        </button>
      </div>

      {/* 프로필 */}
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-maul-light flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#639d6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div className="flex-1">
            {editNickname ? (
              <div className="flex gap-2">
                <input
                  className="input flex-1 py-1 text-sm"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  autoFocus
                />
                <button onClick={handleNicknameSave} className="btn-maul text-sm px-3 py-1">저장</button>
                <button onClick={() => { setEditNickname(false); setNickname(profile.nickname); }} className="text-sub text-sm px-2">취소</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink">{profile?.nickname}</span>
                <button onClick={() => setEditNickname(true)} className="text-xs text-sub underline">수정</button>
              </div>
            )}
            <span className="text-xs text-sub mt-0.5 block">{profile?.user_type}</span>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-100 mb-4">
        {[["posts", `게시글 ${myPosts.length}`], ["answers", `한마디 ${myAnswers.length}`]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 pb-2.5 text-sm font-medium transition-colors ${
              tab === key ? "text-maul-dark border-b-2 border-maul-dark" : "text-sub"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 게시글 목록 */}
      {tab === "posts" && (
        <div className="space-y-2">
          {myPosts.length === 0 ? (
            <p className="text-center text-sub text-sm py-8">아직 쓴 글이 없어요</p>
          ) : (
            myPosts.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/board/${p.id}`)}
                className="bg-white rounded-xl p-3.5 border border-gray-100 cursor-pointer hover:border-maul-light"
              >
                <p className="text-xs text-maul-dark font-medium mb-1">{p.category}</p>
                <p className="text-sm text-ink font-medium line-clamp-2">{p.title}</p>
                <div className="flex gap-3 mt-1.5 text-xs text-sub">
                  <span>좋아요 {p.like_count}</span>
                  <span>댓글 {p.comment_count}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 한마디 답변 목록 */}
      {tab === "answers" && (
        <div className="space-y-2">
          {myAnswers.length === 0 ? (
            <p className="text-center text-sub text-sm py-8">아직 남긴 한마디가 없어요</p>
          ) : (
            myAnswers.map(a => (
              <div key={a.id} className="bg-white rounded-xl p-3.5 border border-gray-100">
                {a.media_url && (
                  <img src={a.media_url} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
                )}
                {a.content && <p className="text-sm text-ink">{a.content}</p>}
                <div className="flex justify-between mt-1.5 text-xs text-sub">
                  <span>좋아요 {a.like_count}</span>
                  <span>{new Date(a.created_at).toLocaleDateString("ko-KR")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
