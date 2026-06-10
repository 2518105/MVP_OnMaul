import { useEffect, useRef } from "react";

const P1 = 1100;
const P2 = 800;
const HOLD = 1400;
const TILT = 62;
const GAP_WIDE = 74;
const GAP_TIGHT = 44;
const LEAN = -8;
const SPREAD = 140;

function lerp(a, b, t) { return a + (b - a) * t; }
function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

export default function SplashScreen({ onFinish }) {
  const wrapperRef = useRef(null); // opacity 전용 — preserve3d 아님
  const stageRef  = useRef(null);  // preserve3d, opacity 항상 1
  const topRef    = useRef(null);
  const midRef    = useRef(null);
  const botRef    = useRef(null);
  const rafRef    = useRef(null);
  const startRef  = useRef(null);
  const doneRef   = useRef(false);

  useEffect(() => {
    function apply(t) {
      let e1, gap, lean;
      if (t < P1) {
        e1 = ease(t / P1); gap = GAP_WIDE; lean = 0;
      } else if (t < P1 + P2) {
        e1 = 1;
        const e2 = ease((t - P1) / P2);
        gap  = lerp(GAP_WIDE, GAP_TIGHT, e2);
        lean = lerp(0, LEAN, e2);
      } else {
        e1 = 1; gap = GAP_TIGHT; lean = LEAN;
      }

      const tilt  = lerp(0, TILT, e1).toFixed(1);
      const leanD = lean.toFixed(1);

      // opacity를 preserve3d 바깥 wrapper에 적용 → 3D z-sorting 내내 보장
      wrapperRef.current.style.opacity = Math.min((t / P1) * 4, 1).toFixed(2);

      // 원: z=-80px → 전체 표면이 확실히 시청자 반대쪽 (z_max = -80+54.8 = -25.2 < 0)
      topRef.current.style.transform =
        `translate3d(${lerp(-SPREAD,0,e1).toFixed(1)}px,${(-gap*e1).toFixed(1)}px,-80px) rotateZ(${leanD}deg) rotateX(${tilt}deg)`;
      botRef.current.style.transform =
        `translate3d(${lerp(SPREAD,0,e1).toFixed(1)}px,${(gap*e1).toFixed(1)}px,-80px) rotateZ(${leanD}deg) rotateX(${tilt}deg)`;
      // 다이아몬드: z=+60px → 전체 표면이 원보다 확실히 앞 (z_min = 60-47.2 = +12.8 > 0)
      midRef.current.style.transform =
        `translate3d(0,0,60px) rotateZ(${leanD}deg) rotateX(${tilt}deg) rotateZ(${lerp(0,45,e1).toFixed(1)}deg)`;
    }

    function frame(ts) {
      if (startRef.current === null) startRef.current = ts;
      const el = ts - startRef.current;
      if (el >= P1 + P2) {
        apply(P1 + P2);
        if (!doneRef.current) {
          doneRef.current = true;
          setTimeout(onFinish, HOLD);
        }
      } else {
        apply(el);
        rafRef.current = requestAnimationFrame(frame);
      }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [onFinish]);

  const layerBase = {
    position: "absolute", left: "50%", top: "50%",
    transformStyle: "preserve3d",
    willChange: "transform",
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "#5f9168",
      perspective: "800px",
    }}>
      {/* opacity wrapper — preserve3d 없음, 이 레이어에만 opacity 적용 */}
      <div ref={wrapperRef} style={{ opacity: 0 }}>
        {/* stage — preserve3d, opacity는 항상 1 유지 */}
        <div ref={stageRef} style={{
          position: "relative",
          width: 380, height: 300,
          transformStyle: "preserve3d",
        }}>
          <div ref={topRef} style={{
            ...layerBase,
            width: 124, height: 124, marginLeft: -62, marginTop: -62,
            borderRadius: "50%", background: "#e3e8e1",
          }} />
          <div ref={midRef} style={{
            ...layerBase,
            width: 108, height: 108, marginLeft: -54, marginTop: -54,
            borderRadius: 8, background: "#bcd99a",
          }} />
          <div ref={botRef} style={{
            ...layerBase,
            width: 124, height: 124, marginLeft: -62, marginTop: -62,
            borderRadius: "50%", background: "#e3e8e1",
          }} />
        </div>
      </div>
    </div>
  );
}
