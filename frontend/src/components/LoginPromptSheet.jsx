import { useNavigate, useLocation } from "react-router-dom";

export default function LoginPromptSheet({ onClose }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white rounded-t-3xl px-6 pt-5 pb-10 z-50 shadow-2xl slide-up">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <p className="text-lg font-bold text-ink mb-1">이웃과 소통해보세요</p>
        <p className="text-sm text-sub mb-6">카카오로 간편하게 가입하고 마을 이야기에 참여해보세요.</p>
        <button
          onClick={() => navigate(`/login?next=${encodeURIComponent(pathname)}`)}
          className="btn-maul mb-3"
        >
          카카오로 회원가입
        </button>
        <button onClick={onClose} className="w-full text-center text-sm text-sub py-2">
          취소
        </button>
      </div>
    </>
  );
}
