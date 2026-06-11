import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";

// 각 메달 외곽선 클립 형태 정의
const CLIP_STYLE = {
  "탐구왕":      { borderRadius: "18%", overflow: "hidden" },
  "이야기보따리": { clipPath: "polygon(25% 3%, 75% 3%, 99% 50%, 75% 97%, 25% 97%, 1% 50%)" },
  "순간포착장인": { clipPath: "polygon(5% 0%, 95% 0%, 100% 8%, 100% 68%, 75% 87%, 50% 100%, 25% 87%, 0% 68%, 0% 8%)" },
  "박사":        { clipPath: "ellipse(47% 33% at 50% 50%)" },
  "사랑꾼":      { clipPath: "polygon(50% 1%, 99% 26%, 99% 74%, 50% 99%, 1% 74%, 1% 26%)" },
  "말벗":        { clipPath: "url(#clip-quatrefoil)" },
  "나눔꾼":      { clipPath: "polygon(1% 1%, 99% 1%, 99% 65%, 50% 99%, 1% 65%)" },
};

// 사엽형(말벗) clipPath 정의 — SVG objectBoundingBox(0~1) 좌표계 사용
function ClipDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
      <defs>
        <clipPath id="clip-quatrefoil" clipPathUnits="objectBoundingBox">
          <path d="M0.5,0.10 C0.60,0 0.78,0 0.88,0.12 C1,0.22 1,0.40 0.88,0.50 C1,0.60 1,0.78 0.88,0.88 C0.78,1 0.60,1 0.50,0.90 C0.40,1 0.22,1 0.12,0.88 C0,0.78 0,0.60 0.12,0.50 C0,0.40 0,0.22 0.12,0.12 C0.22,0 0.40,0 0.50,0.10 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

const SPRITE_POS = {
  "탐구왕":      { x: 0,   y: 0   },
  "이야기보따리": { x: 50,  y: 0   },
  "순간포착장인": { x: 100, y: 0   },
  "박사":        { x: 0,   y: 50  },
  "사랑꾼":      { x: 50,  y: 50  },
  "말벗":        { x: 100, y: 50  },
  "나눔꾼":      { x: 0,   y: 100 },
  "MVP":         { x: 100, y: 100 },
};

const LEVEL_STYLE = {
  bronze: { label: "브론즈", bg: "#f5e6d3", color: "#a0522d" },
  silver: { label: "실버",   bg: "#e8e8f0", color: "#607080" },
  gold:   { label: "골드",   bg: "#fff3cd", color: "#b8860b" },
};

const MEDAL_DESC = {
  "탐구왕":      "게시판에서 '질문' 카테고리 글을 작성하면 획득해요.",
  "이야기보따리": "한마디 코너에 답변을 작성하면 획득해요.",
  "순간포착장인": "사진이 포함된 게시글을 작성하면 획득해요.",
  "박사":        "게시판에서 '동네 정보' 카테고리 글을 작성하면 획득해요.",
  "사랑꾼":      "앱을 방문한 날 수만큼 쌓여요. 매일 접속해 보세요!",
  "말벗":        "게시글에 댓글을 작성하면 획득해요.",
  "나눔꾼":      "게시판에서 '나눔·거래' 카테고리 글을 작성하면 획득해요.",
};

function MedalSprite({ spriteKey, size = 80, grayscale = false }) {
  const pos = SPRITE_POS[spriteKey];
  const clip = CLIP_STYLE[spriteKey] || {};
  if (!pos) return null;
  return (
    <div style={{ width: size, height: size, flexShrink: 0, ...clip }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundImage: "url('/assets/medals.png')",
          backgroundSize: "300% 300%",
          backgroundPosition: `${pos.x}% ${pos.y}%`,
          filter: grayscale ? "grayscale(1) opacity(0.35)" : "none",
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
}

function MedalDetailSheet({ medal, onClose }) {
  const levelStyle = medal.level ? LEVEL_STYLE[medal.level] : null;
  const tiers = [
    { label: "브론즈", threshold: medal.thresholds[0], level: "bronze" },
    { label: "실버",   threshold: medal.thresholds[1], level: "silver" },
    { label: "골드",   threshold: medal.thresholds[2], level: "gold" },
  ];
  const unit = medal.key === "사랑꾼" ? "일" : "개";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[390px] bg-white rounded-t-3xl px-6 pt-6 pb-12"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* 메달 이미지 + 이름 */}
        <div className="flex items-center gap-4 mb-5">
          <MedalSprite spriteKey={medal.sprite_key} size={72} grayscale={!medal.level} />
          <div>
            <p className="text-base font-bold text-ink">{medal.name}</p>
            {levelStyle ? (
              <span
                className="inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: levelStyle.bg, color: levelStyle.color }}
              >
                {levelStyle.label}
              </span>
            ) : (
              <span className="inline-block mt-1 text-[11px] text-sub/60 font-medium">미획득</span>
            )}
          </div>
        </div>

        {/* 획득 조건 설명 */}
        <div className="bg-[#f8f8f8] rounded-2xl px-4 py-3 mb-5">
          <p className="text-xs font-semibold text-sub mb-1">획득 조건</p>
          <p className="text-sm text-ink leading-relaxed">{MEDAL_DESC[medal.key]}</p>
        </div>

        {/* 단계별 기준 */}
        <p className="text-xs font-semibold text-sub mb-2">단계별 기준</p>
        <div className="flex flex-col gap-2">
          {tiers.map(tier => {
            const achieved = medal.level === tier.level ||
              (tier.level === "bronze" && ["silver", "gold"].includes(medal.level)) ||
              (tier.level === "silver" && medal.level === "gold");
            const style = LEVEL_STYLE[tier.level];
            return (
              <div
                key={tier.level}
                className="flex items-center justify-between rounded-xl px-4 py-2.5"
                style={{ backgroundColor: achieved ? style.bg : "#f3f4f6" }}
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: achieved ? style.color : "#9ca3af" }}
                >
                  {tier.label}
                </span>
                <span className="text-sm font-medium" style={{ color: achieved ? style.color : "#9ca3af" }}>
                  {tier.threshold}{unit} {achieved ? "✓" : ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* 현재 진행 */}
        <p className="text-xs text-sub text-center mt-4">
          현재 <span className="font-bold text-ink">{medal.count}{unit}</span> 달성
          {medal.level !== "gold" && (
            <> · 다음 단계까지 <span className="font-bold text-maul-dark">
              {medal.thresholds[medal.level === "silver" ? 2 : medal.level === "bronze" ? 1 : 0] - medal.count}{unit}
            </span> 남았어요</>
          )}
        </p>
      </div>
    </div>
  );
}

function MedalCard({ medal, onTap }) {
  const locked = !medal.level;
  const levelStyle = medal.level ? LEVEL_STYLE[medal.level] : null;
  const nextThreshold = medal.level === "gold"
    ? null
    : medal.thresholds[medal.level === "silver" ? 2 : medal.level === "bronze" ? 1 : 0];
  const unit = medal.key === "사랑꾼" ? "일" : "개";

  return (
    <button
      onClick={onTap}
      className={`bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 w-full active:scale-95 transition-transform ${locked ? "opacity-60" : ""}`}
    >
      <MedalSprite spriteKey={medal.sprite_key} size={72} grayscale={locked} />
      <p className="text-xs font-bold text-ink text-center leading-tight">{medal.name}</p>
      {levelStyle ? (
        <span
          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: levelStyle.bg, color: levelStyle.color }}
        >
          {levelStyle.label}
        </span>
      ) : (
        <span className="text-[11px] text-sub/60 font-medium">미획득</span>
      )}
      <p className="text-[11px] text-sub">
        {medal.level === "gold" ? "달성 완료!" : `${medal.count} / ${nextThreshold}${unit}`}
      </p>
    </button>
  );
}

export default function MedalPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get("/users/me/medals")
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f1f1f1] pb-24">
      <ClipDefs />
      <header className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
        <h1 className="text-xl font-bold text-ink">나의 마을 메달</h1>
      </header>

      {selected && (
        <MedalDetailSheet medal={selected} onClose={() => setSelected(null)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sub text-sm">불러오는 중...</p>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sub text-sm">데이터를 불러올 수 없어요</p>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-4">

          {/* MVP 배지 */}
          <div className={`bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4 ${!data.is_mvp ? "opacity-60" : ""}`}>
            <div
              className="flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{ width: 72, height: 72, backgroundColor: data.is_mvp ? "#fff3cd" : "#f3f4f6" }}
            >
              <span style={{ fontSize: 36 }}>{data.is_mvp ? "🏆" : "?"}</span>
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-ink">온마을 MVP</p>
              <p className="text-xs text-sub mt-0.5 leading-snug">
                {data.is_mvp
                  ? "모든 메달을 골드로 달성했어요!"
                  : "7개 메달을 모두 골드로 달성하면 획득해요"}
              </p>
              {data.is_mvp && (
                <span
                  className="inline-block mt-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "#fff3cd", color: "#b8860b" }}
                >
                  획득 완료 🏆
                </span>
              )}
            </div>
          </div>

          {/* 메달 그리드 */}
          <div className="grid grid-cols-2 gap-3">
            {data.medals.map(medal => (
              <MedalCard key={medal.key} medal={medal} onTap={() => setSelected(medal)} />
            ))}
          </div>

          <p className="text-center text-xs text-sub/60 pb-2">
            메달을 탭하면 상세 조건을 확인할 수 있어요
          </p>
        </div>
      )}
    </div>
  );
}
