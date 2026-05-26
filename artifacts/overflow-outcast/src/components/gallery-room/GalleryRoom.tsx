import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { GalleryScene } from "./GalleryScene";
import { ArtworkDetailModal } from "./ArtworkDetailModal";
import { VirtualJoystick, type JoystickState } from "./VirtualJoystick";
import type { ArtworkData } from "./ArtworkFrame";
import { useIsMobile } from "../../hooks/use-mobile";

type GalleryRoomData = {
  artworks: ArtworkData[];
  roomTheme: string;
};

interface GalleryRoomProps {
  gallery: GalleryRoomData;
  onExit?: () => void;
}

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? this.props.fallback : this.props.children; }
}

function WebGLUnsupportedFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0b09]">
      <div className="max-w-md text-center px-8 py-10 border border-white/10 bg-black/60">
        <h2 className="font-display text-xl font-bold text-white mb-3">
          3D Viewer Unavailable
        </h2>
        <p className="font-sans text-sm text-white/40 leading-relaxed">
          Your browser or device does not support WebGL, which is required for
          the immersive gallery experience. Try opening this page in a modern
          desktop browser like Chrome or Firefox with hardware acceleration
          enabled.
        </p>
      </div>
    </div>
  );
}

// ── Controller face-button ─────────────────────────────────────────────────────
function ControlBtn({
  symbol,
  label,
  accent,
  size = "md",
  onClick,
  disabled = false,
}: {
  symbol: string;
  label: string;
  accent: string;
  size?: "sm" | "md" | "lg";
  onClick: () => void;
  disabled?: boolean;
}) {
  const dim =
    size === "lg" ? "w-14 h-14 text-xl"
    : size === "sm" ? "w-9 h-9 text-sm"
    : "w-11 h-11 text-base";
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{ borderColor: accent, color: accent }}
      className={`${dim} rounded-full border-2 bg-black/60 backdrop-blur-md flex items-center justify-center font-bold transition-all duration-150 active:scale-90 active:bg-white/10 select-none touch-manipulation ${
        disabled ? "opacity-30" : "opacity-80 hover:opacity-100"
      }`}
    >
      {symbol}
    </button>
  );
}

export function GalleryRoom({ gallery, onExit }: GalleryRoomProps) {
  const isMobile = useIsMobile();
  const [showHints, setShowHints] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkData | null>(null);
  const joystickRef = useRef<JoystickState>({ dx: 0, dy: 0 });

  // GalleryScene populates this ref with its fireCenterRaycast so the × button can call it
  const inspectRef = useRef<(() => void) | null>(null);

  // Suppress pointer-lock errors (proxied iframe)
  useEffect(() => {
    const onErr = (e: ErrorEvent) => {
      if (e.message?.toLowerCase().includes("pointer lock")) {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    };
    const onRej = (e: PromiseRejectionEvent) => {
      if (String(e.reason?.message ?? e.reason ?? "").toLowerCase().includes("pointer lock"))
        e.preventDefault();
    };
    window.addEventListener("error", onErr, true);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr, true);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  const handleLock        = useCallback(() => setIsLocked(true), []);
  const handleUnlock      = useCallback(() => setIsLocked(false), []);
  const handleArtworkSelect = useCallback((artwork: ArtworkData) => {
    setSelectedArtwork(artwork);
    setIsLocked(false);
  }, []);
  const handleModalClose  = useCallback(() => setSelectedArtwork(null), []);
  const handleMobileActivate = useCallback(() => {
    if (isMobile && !isLocked && !selectedArtwork) setIsLocked(true);
  }, [isMobile, isLocked, selectedArtwork]);

  const webglSupported = checkWebGLSupport();
  const mobileActive   = isMobile && !selectedArtwork;

  return (
    <div className="absolute inset-0 bg-[#0d0b09]">
      {webglSupported ? (
        <CanvasErrorBoundary fallback={<WebGLUnsupportedFallback />}>
          <Canvas
            shadows
            camera={{ position: [0, 0, 7.5], fov: 75, near: 0.1, far: 100 }}
            style={{ display: "block", width: "100%", height: "100%" }}
            onTouchStart={handleMobileActivate}
            gl={{
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.0,
              outputColorSpace: THREE.SRGBColorSpace,
              antialias: true,
            }}
          >
            <GalleryScene
              artworks={gallery.artworks}
              roomTheme={gallery.roomTheme}
              isLocked={isMobile ? mobileActive : isLocked}
              isMobile={isMobile}
              joystickRef={joystickRef}
              onLock={handleLock}
              onUnlock={handleUnlock}
              onArtworkSelect={handleArtworkSelect}
              inspectCallbackRef={inspectRef}
            />
          </Canvas>
        </CanvasErrorBoundary>
      ) : (
        <WebGLUnsupportedFallback />
      )}

      {/* DESKTOP — click-to-enter prompt */}
      {webglSupported && !isMobile && !isLocked && !selectedArtwork && (
        <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-12">
          <div className="pointer-events-auto text-center px-8 py-5 bg-black/60 backdrop-blur-sm border border-white/15">
            <p className="font-mono text-xs tracking-[0.25em] text-white/50 mb-1">VIRTUAL ART SPACE</p>
            <p className="font-mono text-[11px] tracking-widest text-[#c8a45a]">
              CLICK ANYWHERE TO ENTER · WASD TO MOVE · DRAG TO LOOK
            </p>
            <p className="font-mono text-[10px] tracking-widest text-white/25 mt-1">
              CLICK AN ARTWORK TO INSPECT · ESC TO EXIT
            </p>
          </div>
        </div>
      )}

      {/* DESKTOP — crosshair + hint while locked */}
      {webglSupported && !isMobile && isLocked && (
        <>
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60 ring-1 ring-black/40" />
          </div>
          {showHints && (
            <div className="absolute bottom-6 left-6 pointer-events-none">
              <p className="font-mono text-[10px] tracking-widest text-white/25">
                WASD · LOOK AROUND · CLICK TO INSPECT · ESC TO EXIT
              </p>
            </div>
          )}
        </>
      )}

      {/* MOBILE — tap-to-start prompt */}
      {webglSupported && isMobile && !mobileActive && !selectedArtwork && (
        <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-12">
          <div className="text-center px-8 py-5 bg-black/60 backdrop-blur-sm border border-white/15">
            <p className="font-mono text-xs tracking-[0.25em] text-white/50 mb-1">VIRTUAL ART SPACE</p>
            <p className="font-mono text-[11px] tracking-widest text-[#c8a45a]">
              TAP TO START · DRAG TO LOOK
            </p>
            <p className="font-mono text-[10px] tracking-widest text-white/25 mt-1">
              USE JOYSTICK TO MOVE · TAP CENTRE TO INSPECT
            </p>
          </div>
        </div>
      )}

      {/* MOBILE — active: crosshair + joystick + controller buttons */}
      {webglSupported && isMobile && mobileActive && (
        <>
          {/* Crosshair */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60 ring-1 ring-black/40" />
          </div>

          {/* Hint strip (below page header) */}
          {showHints && (
            <div className="absolute top-16 left-0 right-0 flex justify-center pointer-events-none">
              <p className="font-mono text-[9px] tracking-widest text-white/20">
                × INSPECT · △ EXIT · □ HINTS
              </p>
            </div>
          )}

          {/* Virtual joystick — bottom left */}
          <div className="absolute bottom-8 left-8 z-10" data-joystick>
            <VirtualJoystick stateRef={joystickRef} />
          </div>

          {/* Controller button cluster — bottom right (PlayStation diamond layout) */}
          <div
            className="absolute bottom-8 right-6 z-10 select-none"
            data-controls
            style={{ width: 100, height: 128 }}
          >
            {/* △  top-center — Exit gallery */}
            <div className="absolute" style={{ top: 0, left: "50%", transform: "translateX(-50%)" }}>
              <ControlBtn symbol="△" label="Exit gallery" accent="#ff6b6b" size="sm"
                onClick={() => onExit?.()} disabled={!onExit} />
            </div>

            {/* □  middle-left — Toggle hints */}
            <div className="absolute" style={{ top: 42, left: 0 }}>
              <ControlBtn symbol="□" label="Toggle hints" accent="#a78bfa" size="sm"
                onClick={() => setShowHints((h) => !h)} />
            </div>

            {/* ×  bottom-center — Inspect artwork (primary) */}
            <div className="absolute" style={{ bottom: 0, left: "50%", transform: "translateX(-50%)" }}>
              <ControlBtn symbol="×" label="Inspect artwork" accent="#f59e0b" size="lg"
                onClick={() => inspectRef.current?.()} />
            </div>
          </div>
        </>
      )}

      {/* Empty gallery notice */}
      {webglSupported && !(isMobile ? mobileActive : isLocked) && !selectedArtwork &&
        gallery.artworks.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <p className="font-mono text-xs tracking-widest text-white/20">
              NO ARTWORKS IN THIS GALLERY YET
            </p>
          </div>
        )}

      {/* Artwork detail modal */}
      {selectedArtwork && (
        <ArtworkDetailModal artwork={selectedArtwork} onClose={handleModalClose} />
      )}
    </div>
  );
}
