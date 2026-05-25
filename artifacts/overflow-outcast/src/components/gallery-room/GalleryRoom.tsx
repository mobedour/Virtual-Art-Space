import { Component, useCallback, useRef, useState, type ReactNode } from "react";
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
}

// Detect WebGL support once at module load (client-only, no SSR)
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// Catches any remaining R3F / Three.js runtime errors
class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

function WebGLUnsupportedFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0b09]">
      <div className="max-w-md text-center px-8 py-10 border border-white/10 bg-black/60">
        <div className="font-mono text-[10px] tracking-widest text-[#c8a45a] mb-4">
          [SYSTEM_MESSAGE]
        </div>
        <h2 className="font-display text-xl font-bold text-white mb-3">
          3D Viewer Unavailable
        </h2>
        <p className="font-mono text-xs text-white/40 leading-relaxed">
          Your browser or device does not support WebGL, which is required for
          the immersive gallery experience. Try opening this page in a modern
          desktop browser like Chrome or Firefox with hardware acceleration
          enabled.
        </p>
      </div>
    </div>
  );
}

export function GalleryRoom({ gallery }: GalleryRoomProps) {
  const isMobile = useIsMobile();

  // On mobile, controls are always "active" — no pointer lock required
  const [isLocked, setIsLocked] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkData | null>(
    null
  );

  // Shared joystick state: read by TouchControls inside Canvas
  const joystickRef = useRef<JoystickState>({ dx: 0, dy: 0 });

  const handleLock = useCallback(() => setIsLocked(true), []);
  const handleUnlock = useCallback(() => setIsLocked(false), []);
  const handleArtworkSelect = useCallback((artwork: ArtworkData) => {
    setSelectedArtwork(artwork);
    setIsLocked(false);
  }, []);
  const handleModalClose = useCallback(() => {
    setSelectedArtwork(null);
    // On mobile, re-activate controls immediately after closing modal
  }, []);

  // On mobile, controls activate on first interaction (canvas touch)
  const handleMobileActivate = useCallback(() => {
    if (isMobile && !isLocked && !selectedArtwork) {
      setIsLocked(true);
    }
  }, [isMobile, isLocked, selectedArtwork]);

  const webglSupported = checkWebGLSupport();

  // Mobile: controls are active as soon as no modal is open
  const mobileActive = isMobile && !selectedArtwork;

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
            />
          </Canvas>
        </CanvasErrorBoundary>
      ) : (
        <WebGLUnsupportedFallback />
      )}

      {/* ── DESKTOP: Click-to-enter overlay (shown when not locked and no modal) ── */}
      {webglSupported && !isMobile && !isLocked && !selectedArtwork && (
        <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-12">
          <div className="pointer-events-auto text-center px-8 py-5 bg-black/60 backdrop-blur-sm border border-white/15">
            <p className="font-mono text-xs tracking-[0.25em] text-white/50 mb-1">
              VIRTUAL ART SPACE
            </p>
            <p className="font-mono text-[11px] tracking-widest text-[#c8a45a]">
              CLICK ANYWHERE TO ENTER · WASD TO MOVE · DRAG TO LOOK
            </p>
            <p className="font-mono text-[10px] tracking-widest text-white/25 mt-1">
              CLICK AN ARTWORK TO INSPECT · ESC TO EXIT
            </p>
          </div>
        </div>
      )}

      {/* ── DESKTOP: HUD crosshair + hint (shown while pointer is locked) ── */}
      {webglSupported && !isMobile && isLocked && (
        <>
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60 ring-1 ring-black/40" />
          </div>
          <div className="absolute bottom-6 left-6 pointer-events-none">
            <p className="font-mono text-[10px] tracking-widest text-white/25">
              WASD · LOOK AROUND · CLICK TO INSPECT · ESC TO EXIT
            </p>
          </div>
        </>
      )}

      {/* ── MOBILE: hint shown before first touch ── */}
      {webglSupported && isMobile && !mobileActive && !selectedArtwork && (
        <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-12">
          <div className="text-center px-8 py-5 bg-black/60 backdrop-blur-sm border border-white/15">
            <p className="font-mono text-xs tracking-[0.25em] text-white/50 mb-1">
              VIRTUAL ART SPACE
            </p>
            <p className="font-mono text-[11px] tracking-widest text-[#c8a45a]">
              TAP TO START · DRAG TO LOOK
            </p>
            <p className="font-mono text-[10px] tracking-widest text-white/25 mt-1">
              USE JOYSTICK TO MOVE · TAP CENTRE TO INSPECT
            </p>
          </div>
        </div>
      )}

      {/* ── MOBILE: crosshair + joystick (shown when active) ── */}
      {webglSupported && isMobile && mobileActive && (
        <>
          {/* Crosshair */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60 ring-1 ring-black/40" />
          </div>

          {/* Virtual joystick — bottom left */}
          <div
            className="absolute bottom-8 left-8"
            data-joystick
            style={{ zIndex: 10 }}
          >
            <VirtualJoystick stateRef={joystickRef} />
          </div>

          {/* Hint — bottom right */}
          <div className="absolute bottom-9 right-6 pointer-events-none">
            <p className="font-mono text-[10px] tracking-widest text-white/25">
              TAP CENTRE TO INSPECT
            </p>
          </div>
        </>
      )}

      {/* Empty gallery notice */}
      {webglSupported &&
        !(isMobile ? mobileActive : isLocked) &&
        !selectedArtwork &&
        gallery.artworks.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <p className="font-mono text-xs tracking-widest text-white/20">
              NO ARTWORKS IN THIS GALLERY YET
            </p>
          </div>
        )}

      {/* Artwork detail modal */}
      {selectedArtwork && (
        <ArtworkDetailModal
          artwork={selectedArtwork}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
