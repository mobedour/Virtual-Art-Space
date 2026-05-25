import { useEffect, useRef } from "react";

export type JoystickState = { dx: number; dy: number };

interface VirtualJoystickProps {
  stateRef: React.RefObject<JoystickState>;
}

const BASE_RADIUS = 52;
const KNOB_RADIUS = 22;

export function VirtualJoystick({ stateRef }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const baseCenter = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;

    function getBaseCenter() {
      const rect = base!.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (touchIdRef.current !== null) return;
      const t = e.changedTouches[0];
      touchIdRef.current = t.identifier;
      baseCenter.current = getBaseCenter();
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (touchIdRef.current === null || !knob) return;
      let touch: Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch) return;

      const rawX = touch.clientX - baseCenter.current.x;
      const rawY = touch.clientY - baseCenter.current.y;
      const dist = Math.sqrt(rawX * rawX + rawY * rawY);
      const clamp = Math.min(dist, BASE_RADIUS - KNOB_RADIUS);
      const scale = dist > 0 ? clamp / dist : 0;
      const cx = rawX * scale;
      const cy = rawY * scale;

      knob.style.transform = `translate(${cx}px, ${cy}px)`;

      const norm = BASE_RADIUS - KNOB_RADIUS;
      stateRef.current!.dx = cx / norm;
      stateRef.current!.dy = cy / norm;
    }

    function onTouchEnd(e: TouchEvent) {
      e.preventDefault();
      e.stopPropagation();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          touchIdRef.current = null;
          if (knob) knob.style.transform = "translate(0px, 0px)";
          stateRef.current!.dx = 0;
          stateRef.current!.dy = 0;
          break;
        }
      }
    }

    base.addEventListener("touchstart", onTouchStart, { passive: false });
    base.addEventListener("touchmove", onTouchMove, { passive: false });
    base.addEventListener("touchend", onTouchEnd, { passive: false });
    base.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      base.removeEventListener("touchstart", onTouchStart);
      base.removeEventListener("touchmove", onTouchMove);
      base.removeEventListener("touchend", onTouchEnd);
      base.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [stateRef]);

  return (
    <div
      ref={baseRef}
      className="select-none touch-none"
      style={{
        width: BASE_RADIUS * 2,
        height: BASE_RADIUS * 2,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.35)",
        border: "1.5px solid rgba(200,164,90,0.35)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        ref={knobRef}
        style={{
          width: KNOB_RADIUS * 2,
          height: KNOB_RADIUS * 2,
          borderRadius: "50%",
          background: "rgba(200,164,90,0.55)",
          border: "1.5px solid rgba(200,164,90,0.8)",
          transition: "transform 0.05s",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
