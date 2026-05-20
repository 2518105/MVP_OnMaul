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
import RegisterPage from "./pages/Auth/RegisterPage";
import SplashScreen from "./pages/Splash/SplashScreen";
import OnboardingScreen from "./pages/Onboarding/OnboardingScreen";
import HomePage from "./pages/Home/HomePage";
import HanMadiPage from "./pages/Board/HanMadiPage";
import HanMadiListPage from "./pages/Board/HanMadiListPage";

const FontSizeCtx = createContext({ large: false, toggle: () => {} });

function BottomNav() {
  const { pathname } = useLocation();
  const { large, toggle } = useContext(FontSizeCtx);
  const tabs = [
    { to: "/home",  icon: "⌂",  label: "홈" },
    { to: "/board", icon: "☷",  label: "게시판" },
    { to: "/bus",   icon: "◷",  label: "버스" },
    { to: "/admin", icon: "▤",  label: "행정" },
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
      <button
        onClick={toggle}
        className={`flex flex-col items-center justify-center py-2.5 px-3 text-xs border-l border-gray-100 transition-colors min-w-[52px] ${
          large ? "text-maul-dark font-bold" : "text-sub"
        }`}
      >
        <span className="font-bold leading-none" style={{ fontSize: large ? "1.1rem" : "1rem" }}>
          {large ? "가−" : "가+"}
        </span>
        <span className="mt-0.5">글자</span>
      </button>
    </nav>
  );
}

function AppLayout() {
  return (
    <div className="pb-16 min-h-screen bg-cream">
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
          </Route>
        </Routes>
      </BrowserRouter>
    </FontSizeCtx.Provider>
  );
}
