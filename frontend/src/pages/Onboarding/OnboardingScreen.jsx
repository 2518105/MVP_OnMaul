import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { checkNickname, completeOnboarding } from "../../api/auth";

const RESIDENT_TYPES = [
  { value: "손님", label: "손님", desc: "아직 청산면에 안 사는 사람" },
  { value: "주민", label: "주민", desc: "청산면에 사는 사람" },
];

export default function OnboardingScreen() {
  const navigate = useNavigate();

  const [nickname, setNickname] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState(null); // null | "checking" | "available" | "taken" | "short"
  const [residentType, setResidentType] = useState("");
  const [villageName, setVillageName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckNickname() {
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      setNicknameStatus("short");
      return;
    }
    setNicknameStatus("checking");
    try {
      const result = await checkNickname(trimmed);
      setNicknameStatus(result.available ? "available" : "taken");
    } catch {
      setNicknameStatus(null);
      setError("닉네임 확인 중 오류가 발생했습니다");
    }
  }

  async function handleSubmit() {
    setError("");
    if (!nickname.trim() || nicknameStatus !== "available") {
      setError("닉네임 중복 확인을 완료해주세요");
      return;
    }
    if (!residentType) {
      setError("주민 유형을 선택해주세요");
      return;
    }
    if (!villageName.trim()) {
      setError("마을 이름을 입력해주세요");
      return;
    }
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        nickname: nickname.trim(),
        residentType,
        villageName: villageName.trim(),
      });
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "저장 중 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 pt-14 pb-10">
      {/* 헤더 */}
      <div className="mb-8 fade-in">
        <h2 className="text-2xl font-bold text-ink">온마을에 오신 것을<br />환영합니다</h2>
        <p className="text-sm text-sub mt-2">마을에서 사용할 정보를 알려주세요</p>
      </div>

      <div className="flex flex-col gap-7 flex-1">
        {/* 닉네임 */}
        <div className="fade-in-1">
          <label className="block text-sm font-semibold text-ink mb-2">
            닉네임 <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink placeholder:text-sub outline-none focus:border-maul-dark transition-colors"
              placeholder="2~10자로 입력해주세요"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setNicknameStatus(null);
              }}
              maxLength={10}
            />
            <button
              onClick={handleCheckNickname}
              disabled={nicknameStatus === "checking"}
              className="shrink-0 rounded-xl bg-maul px-4 py-3 text-sm font-semibold text-ink disabled:opacity-60"
            >
              {nicknameStatus === "checking" ? "확인 중" : "중복확인"}
            </button>
          </div>
          {nicknameStatus === "available" && (
            <p className="text-xs text-green-600 mt-1.5 font-medium">사용 가능한 닉네임입니다</p>
          )}
          {nicknameStatus === "taken" && (
            <p className="text-xs text-red-500 mt-1.5">이미 사용 중인 닉네임입니다</p>
          )}
          {nicknameStatus === "short" && (
            <p className="text-xs text-red-500 mt-1.5">닉네임은 2자 이상 입력해주세요</p>
          )}
        </div>

        {/* 주민 유형 */}
        <div className="fade-in-2">
          <label className="block text-sm font-semibold text-ink mb-2">
            주민 유형 <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-3">
            {RESIDENT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setResidentType(type.value)}
                className={`flex-1 rounded-2xl p-4 text-left border-2 transition-colors ${
                  residentType === type.value
                    ? "border-maul-dark bg-maul"
                    : "border-gray-200 bg-white"
                }`}
              >
                <p className="text-sm font-bold text-ink">{type.label}</p>
                <p className="text-xs text-sub mt-0.5 leading-relaxed">{type.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 마을 이름 */}
        <div className="fade-in-3">
          <label className="block text-sm font-semibold text-ink mb-2">
            마을 이름 <span className="text-red-400">*</span>
          </label>
          <input
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-ink placeholder:text-sub outline-none focus:border-maul-dark transition-colors"
            placeholder="예: 청산리, 합금리, 서정리..."
            value={villageName}
            onChange={(e) => setVillageName(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center mt-4">{error}</p>
      )}

      <div className="mt-6 fade-in-4">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-maul disabled:opacity-50"
        >
          {isSubmitting ? "저장 중..." : "온마을 시작하기"}
        </button>
      </div>
    </div>
  );
}
