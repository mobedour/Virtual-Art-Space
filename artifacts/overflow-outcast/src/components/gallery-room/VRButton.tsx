import { useEffect, useState } from "react";
import { createXRStore } from "@react-three/xr";

// Global XR store — created once, reused for session lifecycle.
//
// We disable ALL optional scene-understanding / AR features AND controller
// model fetching. By default @pmndrs/xr requests anchors, hand-tracking,
// layers, mesh/plane detection, hit-test and dom-overlay as optional features
// and also loads controller glTF models from the CDN. On Quest the passthrough
// features cause a permission error; the CDN model load adds several seconds to
// VR entry. Since we draw our own ray-line, we don't need rendered controller
// models at all.
export const xrStore = createXRStore({
  controller: { model: false },
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
