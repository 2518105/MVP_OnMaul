import { useState } from "react";
import { useNavigate } from "react-router-dom";

const VILLAGES = [
  { label: "청산", x: 160, y: 120 },
  { label: "궁촌", x: 80,  y: 80  },
  { label: "양저", x: 240, y: 80  },
  { label: "목동", x: 60,  y: 160 },
  { label: "고당", x: 280, y: 160 },
  { label: "만월", x: 80,  y: 220 },
  { label: "법화", x: 240, y: 220 },
  { label: "효림", x: 160, y: 260 },
];

function DiagramView() {
  const cx = 160, cy = 150;
  const lines = [
    { x1: cx, y1: cy, x2: 30,  y2: 60,  color: "#639d6b", label: "동이(503)",  pos: { x: 10, y: 55 } },
    { x1: cx, y1: cy, x2: 290, y2: 60,  color: "#EF4444", label: "옥천(541)",  pos: { x: 255, y: 55 } },
    { x1: cx, y1: cy, x2: 30,  y2: 240, color: "#F97316", label: "순환(612~)", pos: { x: 0,  y: 255 } },
    { x1: cx, y1: cy, x2: 290, y2: 240, color: "#22C55E", label: "보은(610)",  pos: { x: 256, y: 255 } },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 320 310" className="w-full max-w-xs">
        {lines.map((l, i) => (
          <g key={i}>
            <line
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={l.color} strokeWidth="3" strokeLinecap="round"
              strokeDasharray="6 3"
            />
            <text x={l.pos.x} y={l.pos.y} fontSize="10" fill={l.color} fontWeight="600">
              {l.label}
            </text>
          </g>
        ))}
        {/* 중앙 강조 원 */}
        <circle cx={cx} cy={cy} r="28" fill="#639d6b" />
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff">청산</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff">주차장</text>
      </svg>

      {/* 범례 */}
      <div className="flex flex-wrap justify-center gap-3 mt-2 px-4">
        {[
          { color: "#EF4444", label: "541 급행" },
          { color: "#639d6b", label: "503 동이" },
          { color: "#22C55E", label: "610 보은" },
          { color: "#F97316", label: "612~ 순환" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-sub">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function MapView({ navigate }) {
  return (
    <div className="flex flex-col">
      <svg viewBox="0 0 320 290" className="w-full max-w-xs mx-auto">
        {/* 청산면 외곽 (간략 다각형) */}
        <polygon
          points="60,40 260,40 290,150 240,260 80,260 30,150"
          fill="#E8F5E9" stroke="#A5D6A7" strokeWidth="1.5"
        />
        {/* 마을 핀 */}
        {VILLAGES.map(v => (
          <g key={v.label}>
            <circle
              cx={v.x} cy={v.y} r={v.label === "청산" ? 10 : 6}
              fill={v.label === "청산" ? "#639d6b" : "#FFFFFF"}
              stroke={v.label === "청산" ? "#4a7e52" : "#6B6B6B"}
              strokeWidth="1.5"
            />
            <text
              x={v.x} y={v.y + (v.label === "청산" ? 20 : 18)}
              textAnchor="middle" fontSize="9"
              fill="#3c3c3c" fontWeight={v.label === "청산" ? "700" : "400"}
            >
              {v.label}
            </text>
          </g>
        ))}
      </svg>

      {/* 하단 시트 */}
      <div className="bg-white rounded-2xl mx-4 mt-3 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-bold text-ink">청산주차장</p>
            <p className="text-xs text-sub">4개 노선</p>
          </div>
          <div className="text-right">
            <span className="bg-maul text-ink text-xs font-bold px-2 py-0.5 rounded-full">7분 후</span>
            <p className="text-xs text-sub mt-0.5">541번 옥천행</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/bus/1")}
          className="btn-maul py-2.5"
        >
          시간표 보기
        </button>
      </div>
    </div>
  );
}

export default function BusRoutePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("diagram");

  return (
    <div className="min-h-screen bg-cream">
      {/* 헤더 */}
      <header className="px-5 pt-14 pb-3 flex items-center gap-3 sticky top-0 bg-cream z-10">
        <button onClick={() => navigate(-1)} className="text-ink text-xl font-light">←</button>
        <h1 className="text-base font-bold text-ink">노선도 / 지도</h1>
      </header>

      {/* 탭 전환 */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl flex overflow-hidden shadow-sm">
          {[
            { value: "diagram", label: "다이어그램" },
            { value: "map",     label: "지도" },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === t.value
                  ? "border-maul text-ink font-bold"
                  : "border-transparent text-sub"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fade-in">
        {tab === "diagram" ? <DiagramView /> : <MapView navigate={navigate} />}
      </div>
    </div>
  );
}
