import { useEffect, useState } from "react";
import { createXRStore } from "@react-three/xr";

// Global XR store — created once, reused for session lifecycle.
//
// We disable ALL optional scene-understanding / AR features (on Quest the
// passthrough / space-setup features otherwise throw a permission error before
// the session starts).
//
// We KEEP the default controller — its model AND its built-in ray pointer.
// @react-three/xr v6 ships a complete pointer-events system: the controller's
// ray pointer fires standard R3F onClick / onPointerOver events on any mesh,
// with the ray correctly originating from the user's hand. We rely on that for
// all VR interaction instead of a hand-rolled raycaster, so the pointer never
// comes from "the middle of the screen". Only the teleport pointer is disabled,
// because locomotion is handled by our own snap-turn / teleport system.
export const xrStore = createXRStore({
  controller: { teleportPointer: false },
  hand: false,
  handTracking: false,
  anchors: false,
  layers: false,
  meshDetection: false,
  planeDetection: false,
  depthSensing: false,
  hitTest: false,
  domOverlay: false,
});

export function useVRSupport(): { supported: boolean; checking: boolean } {
  const [supported, setSupported] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!navigator.xr) { setChecking(false); return; }
    navigator.xr
      .isSessionSupported("immersive-vr")
      .then((ok) => setSupported(ok))
      .catch(() => setSupported(false))
      .finally(() => setChecking(false));
  }, []);

  return { supported, checking };
}

interface VRButtonProps {
  isPresenting: boolean;
  onEnter: () => void;
  onExit: () => void;
  className?: string;
  size?: "sm" | "md";
}

export function VRButton({ isPresenting, onEnter, onExit, className = "", size = "md" }: VRButtonProps) {
  const { supported, checking } = useVRSupport();

  if (checking || !supported) return null;

  const sizeClass = size === "sm"
    ? "px-3 py-1.5 text-xs gap-1.5"
    : "px-4 py-2 text-sm gap-2";

  return (
    <button
      onClick={isPresenting ? onExit : onEnter}
      className={`flex items-center rounded-sm border font-sans transition-all ${sizeClass} ${
        isPresenting
          ? "border-amber-500 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
          : "border-amber-500/60 bg-black/60 text-amber-300 hover:bg-amber-500/15 hover:border-amber-400 backdrop-blur-md"
      } ${className}`}
    >
      <span>{isPresenting ? "⬚" : "◈"}</span>
      <span>{isPresenting ? "Exit VR" : "Enter VR"}</span>
    </button>
  );
}
