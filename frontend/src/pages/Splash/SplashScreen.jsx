import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/home"), 1800);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-4 fade-in">
        <div className="w-24 h-24 rounded-full bg-maul flex items-center justify-center text-5xl shadow-lg">
          🏘
        </div>
        <div className="text-center">
          <h1 className="text-5xl font-bold text-ink tracking-tight">온마을</h1>
          <p className="text-lg text-sub italic mt-1">ON-Maul</p>
          <p className="text-sm text-sub mt-2">청산면의 모든 이야기</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <span className="w-2.5 h-2.5 rounded-full bg-maul dot-bounce" />
        <span className="w-2.5 h-2.5 rounded-full bg-maul dot-bounce" />
        <span className="w-2.5 h-2.5 rounded-full bg-maul dot-bounce" />
      </div>
    </div>
  );
}
