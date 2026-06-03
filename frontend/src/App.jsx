import { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation, Outlet } from "react-router-dom";
import BoardPage from "./pages/Board/BoardPage";
import PostDetailPage from "./pages/Board/PostDetailPage";
import PostCreatePage from "./pages/Board/PostCreatePage";
import BusPage from "./pages/Bus/BusPage";
import BusDetailPage from "./pages/Bus/BusDetailPage";
import BusOnboarding from "./pages/Bus/BusOnboarding";
import AdminPage from "./pages/Admin/AdminPage";
import NoticePage from "./pages/Admin/NoticePage";
import AdminDetailPage from "./pages/Admin/AdminDetailPage";
import LoginPage from "./pages/Auth/LoginPage";
import KakaoCallback from "./pages/Auth/KakaoCallback";
import SplashScreen from "./pages/Splash/SplashScreen";
import OnboardingScreen from "./pages/Onboarding/OnboardingScreen";
import HomePage from "./pages/Home/HomePage";
import HanMadiPage from "./pages/Board/HanMadiPage";
import HanMadiListPage from "./pages/Board/HanMadiListPage";
import MyPage from "./pages/MyPage/MyPage";
import RegisterPage from "./pages/Auth/RegisterPage";
import ExternalNoticesPage from "./pages/Board/ExternalNoticesPage";

const FontSizeCtx = createContext({ large: false, toggle: () => {} });

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function BottomNav() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/home",   icon: "⌂", label: "홈" },
    { to: "/board",  icon: "☷", label: "게시판" },
    { to: "/bus",    icon: "◷", label: "버스" },
    { to: "/admin",  icon: "▤", label: "행정" },
    { to: "/mypage", icon: "👤", label: "내정보" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-100 flex z-50 shadow-lg">
      {tabs.map(({ to, icon, label }) => {
        const active = pathname === to || (to !== "/home" && pathname.startsWith(to));
        return (
          <NavLink
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center py-2.5 text-xs transition-colors ${
              active ? "text-ink font-bold" : "text-sub"
            }`}
          >
            <span className={`text-xl leading-none ${active ? "text-maul-dark" : ""}`}>
              {icon}
            </span>
            <span className="mt-0.5">{label}</span>
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

export default function App() {
  const [large, setLarge] = useState(() => localStorage.getItem("largeText") === "1");

  useEffect(() => {
    const root = document.getElementById("root");
    if (large) root.classList.add("large-text");
    else root.classList.remove("large-text");
    localStorage.setItem("largeText", large ? "1" : "0");
  }, [large]);

  return (
    <FontSizeCtx.Provider value={{ large, toggle: () => setLarge(v => !v) }}>
      <BrowserRouter>
        <Routes>
          {/* 바텀 네비 없는 페이지 */}
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/bus/onboarding" element={<BusOnboarding />} />

          {/* 바텀 네비 항상 표시 */}
          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/board" element={<BoardPage />} />
            <Route path="/board/:id" element={<PostDetailPage />} />
            <Route path="/board/new" element={<PostCreatePage />} />
            <Route path="/hanmadi" element={<HanMadiPage />} />
            <Route path="/hanmadi/list" element={<HanMadiListPage />} />
            <Route path="/bus" element={<BusPage />} />
            <Route path="/bus/:routeId" element={<BusDetailPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/notices" element={<NoticePage />} />
            <Route path="/admin/detail/:id" element={<AdminDetailPage />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/board/external-notices" element={<ExternalNoticesPage />} />
            <Route path="/external-notices" element={<ExternalNoticesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FontSizeCtx.Provider>
  );
}
