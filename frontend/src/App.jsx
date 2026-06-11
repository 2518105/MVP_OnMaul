import { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, Outlet } from "react-router-dom";
import BoardPage from "./pages/Board/BoardPage";
import PostDetailPage from "./pages/Board/PostDetailPage";
import PostCreatePage from "./pages/Board/PostCreatePage";
import BusPage from "./pages/Bus/BusPage";
import BusDetailPage from "./pages/Bus/BusDetailPage";
import AdminPage from "./pages/Admin/AdminPage";
import AdminDetailPage from "./pages/Admin/AdminDetailPage";
import LoginPage from "./pages/Auth/LoginPage";
import KakaoCallback from "./pages/Auth/KakaoCallback";
import SplashScreen from "./components/SplashScreen";
import OnboardingScreen from "./pages/Onboarding/OnboardingScreen";
import HomePage from "./pages/Home/HomePage";
import HanMadiPage from "./pages/Board/HanMadiPage";
import HanMadiListPage from "./pages/Board/HanMadiListPage";
import MyPage from "./pages/MyPage/MyPage";
import MyActivityPage from "./pages/MyPage/MyActivityPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import ExternalNoticesPage from "./pages/Board/ExternalNoticesPage";

const FontSizeCtx = createContext({ large: false, toggle: () => {} });

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function HomeIcon({ active }) {
  const c = active ? "#4a7e52" : "#a0b8a4";
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z"/>
      <path d="M9 21V13h6v8"/>
    </svg>
  );
}

function BoardIcon({ active }) {
  const c = active ? "#4a7e52" : "#a0b8a4";
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2"/>
      <line x1="8" y1="8" x2="16" y2="8"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
      <line x1="8" y1="16" x2="13" y2="16"/>
    </svg>
  );
}

function CalendarIcon({ active }) {
  const c = active ? "#4a7e52" : "#a0b8a4";
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
    </svg>
  );
}

function BusIcon({ active }) {
  const c = active ? "#4a7e52" : "#a0b8a4";
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="14" rx="2.5"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
      <line x1="12" y1="4" x2="12" y2="10"/>
      <path d="M6 18v2M18 18v2"/>
      <circle cx="6" cy="18" r="1.5"/>
      <circle cx="18" cy="18" r="1.5"/>
    </svg>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/home",  label: "홈",      Icon: HomeIcon },
    { to: "/board", label: "게시판",   Icon: BoardIcon },
    { to: "/admin", label: "행정소식", Icon: CalendarIcon },
    { to: "/bus",   label: "버스",    Icon: BusIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-200 flex z-50">
      {tabs.map(({ to, label, Icon }) => {
        const active = pathname === to || (to !== "/home" && pathname.startsWith(to));
        return (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-opacity"
          >
            <Icon active={active} />
            <span className="text-[10px] font-medium" style={{ color: active ? "#4a7e52" : "#639d6b" }}>
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function FontSizeButton() {
  const { large, toggle } = useContext(FontSizeCtx);
  return (
    <button
      onClick={toggle}
      className={`fixed bottom-20 right-4 z-50 w-11 h-11 rounded-full shadow-md flex items-center justify-center transition-colors ${
        large ? "bg-maul-dark text-white" : "bg-white text-ink border border-gray-200"
      }`}
      aria-label="글자 크기 조절"
    >
      <span className="font-bold text-sm leading-none">
        {large ? "가−" : "가+"}
      </span>
    </button>
  );
}


function AppLayout() {
  return (
    <div className="pb-16 min-h-screen">
      <ScrollToTop />
      <FontSizeButton />
      <Outlet />
      <BottomNav />
    </div>
  );
}

function InitialRedirect() {
  const token = localStorage.getItem("token");
  const onboardingDone = localStorage.getItem("onboarding_completed") === "true";
  if (token && !onboardingDone) return <Navigate to="/onboarding" replace />;
  return <Navigate to="/home" replace />;
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [large, setLarge] = useState(() => localStorage.getItem("largeText") === "1");

  useEffect(() => {
    const root = document.getElementById("root");
    if (large) root.classList.add("large-text");
    else root.classList.remove("large-text");
    localStorage.setItem("largeText", large ? "1" : "0");
  }, [large]);

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return (
    <FontSizeCtx.Provider value={{ large, toggle: () => setLarge(v => !v) }}>
      <BrowserRouter>
        <Routes>
          {/* 바텀 네비 없는 페이지 */}
          <Route path="/" element={<InitialRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />

          {/* 바텀 네비 항상 표시 */}
          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/board/new" element={<PostCreatePage />} />
            <Route path="/board/:id" element={<PostDetailPage />} />
            <Route path="/hanmadi" element={<HanMadiPage />} />
            <Route path="/hanmadi/list" element={<HanMadiListPage />} />
            <Route path="/bus" element={<BusPage />} />
            <Route path="/bus/:routeId" element={<BusDetailPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/detail/:id" element={<AdminDetailPage />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/mypage/activity" element={<MyActivityPage />} />
            <Route path="/board/external-notices" element={<ExternalNoticesPage />} />
            <Route path="/external-notices" element={<ExternalNoticesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FontSizeCtx.Provider>
  );
}
