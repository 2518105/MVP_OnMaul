import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import BoardPage from "./pages/Board/BoardPage";
import PostDetailPage from "./pages/Board/PostDetailPage";
import PostCreatePage from "./pages/Board/PostCreatePage";
import BusPage from "./pages/Bus/BusPage";
import BusStopPage from "./pages/Bus/BusStopPage";
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
import BusRoutePage from "./pages/Bus/BusRoutePage";
import BusAlarmPage from "./pages/Bus/BusAlarmPage";

function BottomNav() {
  const { pathname } = useLocation();
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
    </nav>
  );
}

function Layout({ children }) {
  return (
    <div className="pb-16 min-h-screen bg-cream">
      {children}
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/bus/onboarding" element={<BusOnboarding />} />
        <Route path="/bus/route" element={<Layout><BusRoutePage /></Layout>} />
        <Route path="/bus/alarm/:stopId" element={<Layout><BusAlarmPage /></Layout>} />
        <Route path="/hanmadi" element={<HanMadiPage />} />
        <Route
          path="/home"
          element={<Layout><HomePage /></Layout>}
        />
        <Route
          path="/board"
          element={<Layout><BoardPage /></Layout>}
        />
        <Route
          path="/board/:id"
          element={<Layout><PostDetailPage /></Layout>}
        />
        <Route
          path="/board/new"
          element={<Layout><PostCreatePage /></Layout>}
        />
        <Route
          path="/bus"
          element={<Layout><BusPage /></Layout>}
        />
        <Route
          path="/bus/:stopId"
          element={<Layout><BusStopPage /></Layout>}
        />
        <Route
          path="/admin"
          element={<Layout><AdminPage /></Layout>}
        />
        <Route
          path="/admin/notices"
          element={<Layout><NoticePage /></Layout>}
        />
        <Route
          path="/admin/detail/:id"
          element={<Layout><AdminDetailPage /></Layout>}
        />
      </Routes>
    </BrowserRouter>
  );
}
