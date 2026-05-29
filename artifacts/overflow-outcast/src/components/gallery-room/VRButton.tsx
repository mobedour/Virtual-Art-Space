import { useEffect, useState } from "react";
import { createXRStore } from "@react-three/xr";

// Global XR store — created once, reused for session lifecycle.
//
// We explicitly turn OFF every scene-understanding / AR feature. By default
// @pmndrs/xr requests anchors, hand-tracking, layers, mesh-detection,
// plane-detection, hit-test and dom-overlay as *optional* features. On the
// Meta Quest browser, requesting mesh/plane detection (passthrough scene
// features) makes the headset demand passthrough/space-setup permission and
// throws an error before the gallery can start. This is a pure seated/standing
// VR experience — none of those features are used — so disabling them removes
// the prompt and lets the session start cleanly.
export const xrStore = createXRStore({
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
}

export function VRButton({ isPresenting, onEnter, onExit, className = "" }: VRButtonProps) {
  const { supported, checking } = useVRSupport();

  if (checking || !supported) return null;

  return (
    <button
      onClick={isPresenting ? onExit : onEnter}
      className={`flex items-center gap-2 px-4 py-2 rounded-sm border text-sm font-sans transition-all ${
        isPresenting
          ? "border-amber-500 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
          : "border-white/30 bg-black/50 text-white/70 hover:text-white hover:bg-white/10 backdrop-blur-md"
      } ${className}`}
    >
      {isPresenting ? "Exit VR" : "Enter VR"}
    </button>
  );
}
