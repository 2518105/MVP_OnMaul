import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import api from "../../api/client";
import { logout, getUser } from "../../api/auth";

const PHOTO_KEY = "profile_photo";
const USER_TYPES = [
  { value: "손님", label: "손님" },
  { value: "주민", label: "주민" },
];

function Toast({ msg }) {
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 fade-in">
      {msg}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#639d6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function DeleteAccountModal({ onConfirm, onCancel, loading }) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl px-7 py-6 mx-4 w-full max-w-xs flex flex-col items-center gap-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-base font-semibold text-ink text-center">정말 탈퇴하시겠습니까?</p>
        <p className="text-xs text-sub text-center -mt-2">탈퇴 시 모든 데이터가 삭제되며 복구할 수 없어요.</p>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-sub font-medium"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm text-white font-semibold disabled:opacity-50"
          >
            {loading ? "처리 중…" : "탈퇴"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

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
      <div className="relative bg-white rounded-t-3xl px-5 pt-6 pb-24 max-w-[390px] mx-auto w-full">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-base font-bold text-ink mb-6">프로필 수정</h2>

        <div className="flex flex-col items-center mb-6">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden bg-[#e8f5e9] flex items-center justify-center group"
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
          <button onClick={() => fileRef.current?.click()} className="mt-2 text-xs text-maul font-medium">
            사진 변경
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-sub block mb-1.5">닉네임</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-maul"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            maxLength={20}
            placeholder="닉네임 입력"
          />
        </div>

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
          className="w-full py-3 bg-maul text-white rounded-xl text-sm font-bold disabled:opacity-50"
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
  const [events, setEvents] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photo, setPhoto] = useState(localStorage.getItem(PHOTO_KEY) || null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  useEffect(() => {
    if (!localUser) { navigate("/login"); return; }
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const { data } = await api.get("/users/me");
      setProfile(data);

      api.get("/admin/calendar")
        .then(r => {
          const now = new Date();
          const upcoming = (Array.isArray(r.data) ? r.data : [])
            .filter(e => new Date(e.event_date) >= now)
            .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
            .slice(0, 5);
          setEvents(upcoming);
        })
        .catch(() => {});
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

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api.delete("/users/me");
      logout();
      navigate("/login");
    } catch {
      showToast("탈퇴 처리 중 오류가 발생했어요. 다시 시도해주세요.");
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  }

  function fmtDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f1f1]">
        <p className="text-sub text-sm">불러오는 중...</p>
      </div>
    );
  }

  const activities = [
    {
      label: "내가 쓴 글",
      action: () => navigate("/mypage/activity?type=posts"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
      ),
    },
    {
      label: "내 댓글",
      action: () => navigate("/mypage/activity?type=comments"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      label: "저장한 글",
      action: () => navigate("/mypage/activity?type=saves"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      label: "좋아요",
      action: () => navigate("/mypage/activity?type=likes"),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f1f1f1] pb-24">
      {toast && <Toast msg={toast} />}

      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 pt-12 pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
          <h1 className="text-xl font-bold text-ink">마이페이지</h1>
        </div>
        <div className="flex items-center gap-3">
          <button aria-label="알림" className="flex flex-col items-center gap-0.5">
            <BellIcon />
          </button>
        </div>
      </header>

      <div className="px-4 flex flex-col gap-4">
        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowEdit(true)}
              className="w-20 h-20 rounded-full overflow-hidden bg-[#e8f5e9] flex-shrink-0 flex items-center justify-center"
            >
              {photo ? (
                <img src={photo} alt="프로필" className="w-full h-full object-cover" />
              ) : (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#639d6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold text-maul leading-tight">{profile?.nickname}</p>
              <p className="text-sm text-sub mt-0.5">{profile?.user_type ?? "청산면 주민"}</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setShowEdit(true)}
                  className="text-xs text-sub underline underline-offset-2"
                >
                  회원 정보 수정
                </button>
                <span className="text-gray-300 text-xs">·</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-400 underline underline-offset-2"
                >
                  로그아웃
                </button>
                <span className="text-gray-300 text-xs">·</span>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="text-xs text-gray-400 underline underline-offset-2"
                >
                  탈퇴하기
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 나의 활동 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-ink mb-2">나의 활동</h2>
          <div className="flex flex-col">
            {activities.map(({ label, action, icon }) => (
              <button
                key={label}
                onClick={action}
                className="flex items-center gap-3 py-3 text-sm text-ink border-b border-gray-50 last:border-0 hover:text-maul transition-colors text-left"
              >
                <span className="text-sub w-5 flex justify-center flex-shrink-0">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 저장한 일정 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-ink mb-3">저장한 일정</h2>
          {events.length === 0 ? (
            <p className="text-xs text-sub/60 py-1">예정된 일정이 없어요</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {events.map(e => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="bg-maul text-white text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                    {fmtDate(e.event_date)}
                  </span>
                  <span className="text-sm text-ink">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 나의 마을 메달 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-ink mb-3">나의 마을 메달</h2>
          <div className="h-20 flex items-center justify-center">
            <p className="text-xs text-sub/50">활동하면 메달을 받을 수 있어요</p>
          </div>
        </div>
      </div>

      {showEdit && profile && (
        <ProfileEditSheet
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSave={handleSave}
        />
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}
