import { useEffect, useState } from "react";
import { createXRStore } from "@react-three/xr";

// Global XR store — created once, reused for session lifecycle
export const xrStore = createXRStore();

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
