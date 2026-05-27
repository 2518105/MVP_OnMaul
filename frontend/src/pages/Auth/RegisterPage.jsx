import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { register } from "../../api/auth";

const USER_TYPES = [
  { value: "이주민", label: "이주민", desc: "귀농·귀촌·생활 이주" },
  { value: "주민", label: "기존 주민", desc: "청산면 토박이 주민" },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "";
  const [form, setForm] = useState({ username: "", nickname: "", password: "", userType: "이주민" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.username, form.nickname, form.password, form.userType);
      navigate(next || "/board");
    } catch (err) {
      setError(err.response?.data?.detail || "회원가입 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-white">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-blue-600">온마을</h1>
        <p className="text-gray-500 text-sm mt-1">반갑습니다! 청산면 이웃이 되어주세요</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">나는 어떤 주민인가요?</label>
          <div className="grid grid-cols-2 gap-2">
            {USER_TYPES.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm(f => ({ ...f, userType: value }))}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  form.userType === value
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="font-medium text-sm">{label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">아이디</label>
          <input
            className="input"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            placeholder="영문·숫자 조합"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">닉네임</label>
          <input
            className="input"
            value={form.nickname}
            onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
            placeholder="마을에서 불릴 이름"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">비밀번호</label>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="6자 이상"
            minLength={6}
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "가입 중..." : "가입하기"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6">
        이미 계정이 있으신가요?{" "}
        <Link to="/login" className="text-blue-600 font-medium">로그인</Link>
      </p>
    </div>
  );
}
