import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { logout, getUser } from "../../api/auth";

const PHOTO_KEY = "profile_photo";
const USER_TYPES = [
  { value: "이주민", label: "이주민" },
  { value: "주민", label: "청산면 주민" },
];

function ProfileEditSheet({ profile, onClose, onSave }) {
  const fileRef = useRef(null);
  const [nickname, setNickname] = useState(profile.nickname);
  const [userType, setUserType] = useState(profile.user_type);
  const [photo, setPhoto] = useState(localStorage.getItem(PHOTO_KEY) || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!nickname.trim() || nickname.trim().length < 2) {
      setError("닉네임은 2자 이상 입력해주세요");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await api.patch("/users/me/profile", {
        nickname: nickname.trim(),
        user_type: userType,
      });
      if (photo) localStorage.setItem(PHOTO_KEY, photo);
      else localStorage.removeItem(PHOTO_KEY);
      const user = getUser();
      localStorage.setItem("user", JSON.stringify({ ...user, nickname: data.nickname }));
      onSave(data, photo);
    } catch (err) {
      setError(err.response?.data?.detail || "저장 실패. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-6 pb-10 max-w-[390px] mx-auto w-full">
        {/* 핸들 */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-base font-bold text-ink mb-6">프로필 수정</h2>

        {/* 프로필 사진 */}
        <div className="flex flex-col items-center mb-6">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden bg-maul-light flex items-center justify-center group"
          >
            {photo ? (
              <img src={photo} alt="프로필" className="w-full h-full object-cover" />
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#639d6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-2 text-xs text-maul-dark font-medium"
          >
            사진 변경
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        </div>

        {/* 닉네임 */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-sub block mb-1.5">닉네임</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-maul-dark"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={20}
            placeholder="닉네임 입력"
          />
        </div>

        {/* 주민 유형 */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-sub block mb-1.5">주민 유형</label>
          <div className="flex gap-2">
            {USER_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setUserType(t.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  userType === t.value
                    ? "bg-maul border-maul text-ink font-bold"
                    : "border-gray-200 text-sub"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 mb-3 text-center">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-maul-dark text-white rounded-xl text-sm font-bold disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  );
}

export default function MyPage() {
  const navigate = useNavigate();
  const localUser = getUser();
  const [profile, setProfile] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [myAnswers, setMyAnswers] = useState([]);
  const [tab, setTab] = useState("posts");
  const [showEdit, setShowEdit] = useState(false);
  const [photo, setPhoto] = useState(localStorage.getItem(PHOTO_KEY) || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localUser) { navigate("/login"); return; }
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
      setMyPosts(postsRes.data);
      setMyAnswers(answersRes.data);
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }

  function handleSave(updatedProfile, newPhoto) {
    setProfile(updatedProfile);
    setPhoto(newPhoto);
    setShowEdit(false);
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

      {/* 프로필 카드 */}
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-maul-light flex items-center justify-center overflow-hidden flex-shrink-0">
            {photo ? (
              <img src={photo} alt="프로필" className="w-full h-full object-cover" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#639d6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink truncate">{profile?.nickname}</span>
              <button
                onClick={() => setShowEdit(true)}
                className="text-xs text-sub underline flex-shrink-0"
              >
                수정
              </button>
            </div>
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

      {/* 게시글 */}
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

      {/* 한마디 */}
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

      {showEdit && profile && (
        <ProfileEditSheet
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
