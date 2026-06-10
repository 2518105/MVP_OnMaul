import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { getUser, getAuthorPhoto } from "../../api/auth";
import LoginPromptSheet from "../../components/LoginPromptSheet";
import UserAvatar from "../../components/UserAvatar";

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="#639d6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="#639d6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const currentUser = getUser();
  const onboardingDone = localStorage.getItem("onboarding_completed") === "true";
  const displayName = onboardingDone ? (currentUser?.nickname ?? "이웃") : "이웃";

  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [bellToast, setBellToast] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionId, setQuestionId] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [popularPosts, setPopularPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    api.get("/hanmadi/today")
      .then(r => {
        setQuestionText(r.data.question_text ?? "");
        setQuestionId(r.data.question_id);
        setAnswers(Array.isArray(r.data.answers) ? r.data.answers : []);
      })
      .catch(() => {});

    api.get("/admin/calendar")
      .then(r => {
        const now = new Date();
        const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcoming = (Array.isArray(r.data) ? r.data : [])
          .filter(e => { const d = new Date(e.event_date); return d >= now && d <= in7days; })
          .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
          .slice(0, 3);
        setEvents(upcoming);
      })
      .catch(() => {});

    Promise.all([
      api.get("/posts", { params: { limit: 2 } }).catch(() => ({ data: [] })),
      api.get("/posts", { params: { limit: 2, sort: "popular" } }).catch(() => ({ data: [] })),
    ]).then(([recentRes, popularRes]) => {
      setRecentPosts(Array.isArray(recentRes.data) ? recentRes.data.slice(0, 2) : []);
      setPopularPosts(Array.isArray(popularRes.data) ? popularRes.data.slice(0, 2) : []);
    }).finally(() => setLoadingPosts(false));
  }, []);

  function handleBannerTap() {
    if (!getUser()) { setShowLoginSheet(true); return; }
    navigate("/hanmadi");
  }

  function fmtDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  return (
    <div className="min-h-screen bg-[#f1f1f1] pb-24">
      {showLoginSheet && <LoginPromptSheet onClose={() => setShowLoginSheet(false)} />}
      {bellToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-ink text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap">
          알림 기능은 곧 추가될 예정이에요 😊
        </div>
      )}

      {/* (1) 상단 바 */}
      <div className="flex items-center justify-end px-5 pt-12 pb-2 gap-4">
        <button
          aria-label="알림"
          className="flex flex-col items-center gap-0.5"
          onClick={() => { setBellToast(true); setTimeout(() => setBellToast(false), 2000); }}
        >
          <BellIcon />
          <span className="text-[10px] font-bold" style={{ color: "#639d6b" }}>알림</span>
        </button>
        <button aria-label="내 정보" onClick={() => navigate("/mypage")} className="flex flex-col items-center gap-0.5">
          <ProfileIcon />
          <span className="text-[10px] font-bold" style={{ color: "#639d6b" }}>마이페이지</span>
        </button>
      </div>

      {/* (2) 헤더 — 닉네임 초록, 질문 굵게 (최대 3줄) */}
      <div className="px-5 pt-1 pb-5 fade-in">
        <p
          className="font-bold text-ink leading-snug"
          style={{
            fontSize: "28px",
            whiteSpace: "pre-line",
            overflow: "hidden",
            maxHeight: "calc(28px * 1.375 * 2)",
          }}
        >
          <span style={{ color: "#629c6b" }}>{displayName} 님, </span>
          {questionText || <span className="text-ink/30">오늘의 질문을 생각하고 있어요!</span>}
        </p>
      </div>

      {/* (3) 초록 CTA 배너 */}
      <div className="px-5 pb-4 fade-in-1">
        <button
          onClick={handleBannerTap}
          className="w-full rounded-2xl px-5 py-4 text-left transition-opacity active:opacity-80"
          style={{ backgroundColor: "#639d6b" }}
        >
          <span className="text-white/70 text-xs inline-block">한 마디 남기기 →</span>
        </button>
      </div>

      {/* (4) 이웃 답변 카드 */}
      <div className="px-5 pb-4 fade-in-2">
        <div className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer" onClick={() => navigate(`/hanmadi/list${questionId ? `?q=${questionId}` : ""}`)}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-ink">이웃은 이렇게 생각해요</span>
            <button onClick={() => navigate(`/hanmadi/list${questionId ? `?q=${questionId}` : ""}`)} className="text-xs text-maul">
              답변 모음 →
            </button>
          </div>
          {answers.length === 0 ? (
            <p className="text-xs text-sub/60 text-center py-2">첫 번째 답변을 남겨보세요</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {answers.slice(0, 3).map(a => (
                <li key={a.id} className="flex items-center gap-3">
                  <UserAvatar nickname={a.author_nickname ?? "?"} photoUrl={a.author_photo ?? null} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-ink">{a.author_nickname}</span>
                      {a.author_type && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{a.author_type}</span>
                      )}
                    </div>
                    <p className="text-xs text-ink/80 truncate">
                      {a.content || "사진을 올렸어요"}
                    </p>
                  </div>
                  {a.like_count > 0 && (
                    <span className="bg-maul text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                      {a.like_count}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 구분선 */}
      <div className="mx-5 border-t-2 border-gray-200 mb-4" />

      {/* (5) 정보 카드 3개 */}
      <div className="px-5 flex flex-col gap-4 fade-in-3">

        {/* 최근 게시글 */}
        <div className="bg-[#f8f8f8] rounded-2xl shadow-sm p-4">
          <p className="text-base font-bold text-ink mb-3">최근 게시글</p>
          {loadingPosts ? (
            <p className="text-xs text-sub/60">불러오는 중…</p>
          ) : recentPosts.length === 0 ? (
            <p className="text-xs text-sub/60">아직 게시글이 없어요</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {recentPosts.map(p => (
                <li
                  key={p.id}
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => navigate(`/board/${p.id}`)}
                >
                  <span className="text-sm text-ink truncate flex-1">{p.title}</span>
                  <span className="ml-2 bg-maul text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    <svg style={{display:"inline",verticalAlign:"middle",marginRight:"2px"}} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>{p.comment_count ?? 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 인기 게시글 */}
        <div className="bg-[#f8f8f8] rounded-2xl shadow-sm p-4">
          <p className="text-base font-bold text-ink mb-3">인기 게시글</p>
          {loadingPosts ? (
            <p className="text-xs text-sub/60">불러오는 중…</p>
          ) : popularPosts.length === 0 ? (
            <p className="text-xs text-sub/60">아직 게시글이 없어요</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {popularPosts.map(p => (
                <li
                  key={p.id}
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => navigate(`/board/${p.id}`)}
                >
                  <span className="text-sm text-ink truncate flex-1">{p.title}</span>
                  <span className="ml-2 bg-maul text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                    <><svg style={{display:"inline",verticalAlign:"middle",marginRight:"2px"}} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>{p.like_count ?? 0}</>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 이번 주 일정 */}
        <div className="bg-[#f8f8f8] rounded-2xl shadow-sm p-4">
          <p className="text-base font-bold text-ink mb-3">이번 주 일정</p>
          {events.length === 0 ? (
            <p className="text-xs text-sub/60">이번 주 등록된 일정이 없어요</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {events.map(e => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="bg-maul text-white text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                    {fmtDate(e.event_date)}
                  </span>
                  <span className="text-sm text-ink truncate">{e.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
