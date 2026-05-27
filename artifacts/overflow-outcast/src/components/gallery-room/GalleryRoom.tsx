import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { XR, XROrigin } from "@react-three/xr";
import * as THREE from "three";
import { GalleryScene, type HoverState } from "./GalleryScene";
import { ArtworkDetailModal } from "./ArtworkDetailModal";
import { VirtualJoystick, type JoystickState } from "./VirtualJoystick";
import type { ArtworkData } from "./ArtworkFrame";
import { AmbientAudio } from "./AmbientAudio";
import { useIsMobile } from "../../hooks/use-mobile";
import {
  useEditState,
  EditToolbar,
  WallArrows,
  EditFloorGrid,
} from "./GalleryEditMode";
import { VRButton, xrStore, useVRSupport } from "./VRButton";
import { XRLocomotion } from "./XRLocomotion";
import { XRControllerRay } from "./XRControllerRay";
import { VRInfoPanel } from "./VRInfoPanel";
import { getRoomDims } from "./room-dimensions";

type GalleryRoomData = {
  artworks: ArtworkData[];
  roomTheme: string;
  roomSeed?: number;
  roomMode?: string;
  roomSize?: number;
  decorationLevel?: number;
  roomHeight?: number;
  lightingMood?: number;
  galleryTitle?: string;
  artistName?: string;
  id?: number;
};

interface GalleryRoomProps {
  gallery: GalleryRoomData;
  onExit?: () => void;
  onEditRequest?: () => void;
  isOwner?: boolean;
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

function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
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
        <h2 className="font-display text-xl font-bold text-white mb-3">3D Viewer Unavailable</h2>
        <p className="font-sans text-sm text-white/40 leading-relaxed">
          Your browser or device does not support WebGL. Try opening this page in a modern desktop browser with hardware acceleration enabled.
        </p>
      </div>
    </div>
  );
}

function ControlBtn({ symbol, label, accent, onClick, disabled = false }: {
  symbol: string; label: string; accent: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button aria-label={label} onClick={onClick} disabled={disabled}
      style={{ borderColor: accent, color: accent }}
      className={`w-11 h-11 rounded-full border-2 bg-black/60 backdrop-blur-md flex items-center justify-center text-base font-bold transition-all duration-150 active:scale-90 active:bg-white/10 select-none touch-manipulation ${disabled ? "opacity-30" : "opacity-80 hover:opacity-100"}`}>
      {symbol}
    </button>
  );
}

async function requestFullscreen(): Promise<boolean> {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
  };
  try {
    if (el.requestFullscreen) { await el.requestFullscreen(); return true; }
    if (el.webkitRequestFullscreen) { await el.webkitRequestFullscreen(); return true; }
    if (el.mozRequestFullScreen) { await el.mozRequestFullScreen(); return true; }
  } catch { /* denied */ }
  return false;
}

async function exitFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
    mozCancelFullScreen?: () => Promise<void>;
  };
  try {
    if (doc.exitFullscreen) await doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
    else if (doc.mozCancelFullScreen) await doc.mozCancelFullScreen();
  } catch { /* ignored */ }
}

function getFullscreenElement(): Element | null {
  const doc = document as Document & {
    webkitFullscreenElement?: Element;
    mozFullScreenElement?: Element;
  };
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? doc.mozFullScreenElement ?? null;
}

// ─── SVG Crosshair ────────────────────────────────────────────────────────────
function Crosshair({ hoverState, editMode }: { hoverState: HoverState; editMode: boolean }) {
  if (editMode) {
    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="7" stroke="#f5c060" strokeWidth="1.5" opacity="0.7" />
          <line x1="11" y1="3" x2="11" y2="8" stroke="#f5c060" strokeWidth="1.5" />
          <line x1="11" y1="14" x2="11" y2="19" stroke="#f5c060" strokeWidth="1.5" />
          <line x1="3" y1="11" x2="8" y2="11" stroke="#f5c060" strokeWidth="1.5" />
          <line x1="14" y1="11" x2="19" y2="11" stroke="#f5c060" strokeWidth="1.5" />
          <circle cx="11" cy="11" r="1.5" fill="#f5c060" />
        </svg>
      </div>
    );
  }
  if (hoverState === "artwork") {
    return (
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="#f5c060" strokeWidth="1.5" opacity="0.9" />
          <line x1="12" y1="4" x2="12" y2="8" stroke="#f5c060" strokeWidth="1.5" />
          <line x1="12" y1="16" x2="12" y2="20" stroke="#f5c060" strokeWidth="1.5" />
          <line x1="4" y1="12" x2="8" y2="12" stroke="#f5c060" strokeWidth="1.5" />
          <line x1="16" y1="12" x2="20" y2="12" stroke="#f5c060" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill="#f5c060" />
        </svg>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      <div className="w-2 h-2 rounded-full bg-white/50 ring-1 ring-black/30" />
    </div>
  );
}

// ─── Hint strip for artwork hover ─────────────────────────────────────────────
function HoverHintStrip({ hoverState, editMode }: { hoverState: HoverState; editMode: boolean }) {
  if (editMode) {
    return (
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="flex items-center gap-3 px-4 py-2 bg-black/70 backdrop-blur-sm border border-amber-500/40 rounded-full">
          <span className="font-mono text-[10px] tracking-widest text-amber-400">CLICK ARTWORK TO MOVE</span>
        </div>
      </div>
    );
  }
  if (hoverState !== "artwork") return null;
  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-none">
      <div className="flex items-center gap-3 px-4 py-2 bg-black/70 backdrop-blur-sm border border-amber-500/30 rounded-full">
        <span className="font-mono text-[10px] tracking-widest text-amber-400">CLICK TO INSPECT</span>
      </div>
    </div>
  );
}

// ─── Gallery entrance overlay ──────────────────────────────────────────────────
function EntranceOverlay({ galleryTitle, artistName, onEnter }: {
  galleryTitle?: string; artistName?: string; onEnter: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-20">
      <div className="text-center px-10 py-10 max-w-lg">
        <p className="font-mono text-[10px] tracking-[0.35em] text-white/30 mb-4 uppercase">Virtual Art Space</p>
        {galleryTitle && (
          <h1 className="font-display text-3xl italic text-white mb-2 leading-tight">{galleryTitle}</h1>
        )}
        {artistName && <p className="font-sans text-sm text-white/50 mb-8">{artistName}</p>}
        <button onClick={onEnter}
          className="inline-flex items-center gap-3 px-8 py-3 bg-amber-500/90 hover:bg-amber-400 text-black font-display text-base italic font-semibold rounded-sm transition-all duration-200 hover:scale-105">
          Enter Gallery →
        </button>
        <p className="font-mono text-[9px] tracking-widest text-white/20 mt-6">
          WASD TO MOVE · DRAG TO LOOK · ESC TO PAUSE
        </p>
      </div>
    </div>
  );
}

// ─── Pause overlay ────────────────────────────────────────────────────────────
function PauseOverlay({
  galleryTitle, artistName, isOwner, audioMuted, walkSpeed, onWalkSpeedChange,
  onResume, onExit, onEnterEditMode, onToggleAudio,
}: {
  galleryTitle?: string; artistName?: string; isOwner?: boolean; audioMuted: boolean;
  walkSpeed: number; onWalkSpeedChange: (v: number) => void;
  onResume: () => void; onExit?: () => void; onEnterEditMode?: () => void; onToggleAudio: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md z-30">
      <div className="text-center px-10 py-10 max-w-sm w-full">
        {galleryTitle && (
          <h2 className="font-display text-xl italic text-white mb-1">{galleryTitle}</h2>
        )}
        {artistName && <p className="font-sans text-xs text-white/40 mb-8">{artistName}</p>}

        <div className="flex flex-col gap-3">
          <button onClick={onResume}
            className="w-full py-3 bg-amber-500/90 hover:bg-amber-400 text-black font-display italic font-semibold rounded-sm transition-all">
            Resume Exploring
          </button>
          {isOwner && onEnterEditMode && (
            <button onClick={onEnterEditMode}
              className="w-full py-2.5 border border-amber-500/60 text-amber-400 hover:bg-amber-500/10 font-sans text-sm rounded-sm transition-all">
              Edit Gallery
            </button>
          )}
          <button onClick={onExit}
            className="w-full py-2.5 border border-white/15 text-white/50 hover:bg-white/5 font-sans text-sm rounded-sm transition-all">
            Exit Gallery
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
          {/* Walk speed slider */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] tracking-widest text-white/30 w-16 text-left">SPEED</span>
            <input
              type="range" min={2} max={10} step={0.5} value={walkSpeed}
              onChange={(e) => onWalkSpeedChange(Number(e.target.value))}
              className="flex-1 accent-amber-400"
            />
            <span className="font-mono text-[10px] text-amber-400/70 w-8 text-right">{walkSpeed.toFixed(1)}</span>
          </div>
          {/* Audio toggle */}
          <button onClick={onToggleAudio}
            className="flex items-center gap-2 mx-auto text-sm text-white/40 hover:text-white/70 font-sans transition-colors">
            <span>{audioMuted ? "🔇" : "🔊"}</span>
            <span>{audioMuted ? "Audio Off" : "Audio On"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function GalleryRoom({ gallery, onExit, onEditRequest, isOwner }: GalleryRoomProps) {
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fakeFullscreen, setFakeFullscreen] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkData | null>(null);
  const [hoverState, setHoverState] = useState<HoverState>("idle");
  const [sceneVisible, setSceneVisible] = useState(false);
  const [audioMuted, setAudioMuted] = useState(() => localStorage.getItem("vas_audioMuted") === "true");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [vrArtwork, setVrArtwork] = useState<ArtworkData | null>(null);
  const [walkSpeed, setWalkSpeed] = useState(() => {
    const saved = localStorage.getItem("vas_walkSpeed");
    return saved ? Number(saved) : 5.5;
  });
  const [lookSensitivity, setLookSensitivity] = useState(() => {
    const saved = localStorage.getItem("vas_lookSensitivity");
    return saved ? Number(saved) : 1.0;
  });

  const joystickRef = useRef<JoystickState>({ dx: 0, dy: 0 });
  const inspectRef = useRef<(() => void) | null>(null);

  const { supported: vrSupported } = useVRSupport();

  // Derived dimensions
  const { halfW, halfH, halfD } = getRoomDims(gallery.roomSize ?? 5);
  const floorY = -halfH;

  // Edit state — only instantiate when owner
  const editState = useEditState(
    gallery.id ?? 0,
    gallery.artworks,
    gallery.roomTheme,
    gallery.lightingMood ?? 1.0,
    gallery.decorationLevel ?? 5,
    gallery.roomSize ?? 5,
  );

  // Which artworks/theme/lighting/decoration to render (edit mode may override)
  const activeArtworks = isEditMode ? editState.artworks : gallery.artworks;
  const activeTheme = isEditMode ? editState.roomTheme : gallery.roomTheme;
  const activeLighting = isEditMode ? editState.lightingMood : (gallery.lightingMood ?? 1.0);
  const activeDecorationLevel = isEditMode ? editState.decorationLevel : (gallery.decorationLevel ?? 5);
  const activeRoomSize = isEditMode ? editState.roomSize : (gallery.roomSize ?? 5);
  const { halfW: activeHalfW, halfD: activeHalfD } = getRoomDims(activeRoomSize);

  // Selected artwork in edit mode (for frame properties panel)
  const selectedEditArtwork = editState.selectedArtworkId !== null
    ? (editState.artworks.find((a) => a.id === editState.selectedArtworkId) ?? null)
    : null;

  // XR store subscription for presenting state
  useEffect(() => {
    const unsub = xrStore.subscribe((state) => {
      setIsPresenting(state.session != null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!getFullscreenElement());
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    document.addEventListener("mozfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
      document.removeEventListener("mozfullscreenchange", handler);
    };
  }, []);

  // Navigation guard — warn on page unload when edit mode is dirty
  useEffect(() => {
    if (!isEditMode || !editState.isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isEditMode, editState.isDirty]);

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (vrArtwork) { setVrArtwork(null); return; }
        if (selectedArtwork) { setSelectedArtwork(null); return; }
        if (isEditMode && !editState.isDirty) { setIsEditMode(false); return; }
        if (isLocked) { setIsLocked(false); setIsPaused(true); }
        else if (isPaused) { setIsPaused(false); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked, isPaused, selectedArtwork, isEditMode, editState.isDirty, vrArtwork]);

  // Suppress pointer-lock errors in proxied iframe
  useEffect(() => {
    const onErr = (e: ErrorEvent) => {
      if (e.message?.toLowerCase().includes("pointer lock")) { e.preventDefault(); e.stopImmediatePropagation(); }
    };
    const onRej = (e: PromiseRejectionEvent) => {
      if (String(e.reason?.message ?? e.reason ?? "").toLowerCase().includes("pointer lock")) e.preventDefault();
    };
    window.addEventListener("error", onErr, true);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr, true);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (getFullscreenElement()) { await exitFullscreen(); return; }
    if (fakeFullscreen) { setFakeFullscreen(false); return; }
    if (isIOS()) { setFakeFullscreen(true); return; }
    const ok = await requestFullscreen();
    if (!ok) setFakeFullscreen(true);
  }, [fakeFullscreen]);

  const handleEnter = useCallback(() => {
    setHasEntered(true);
    setIsPaused(false);
    if (!isMobile) {
      setTimeout(() => { document.querySelector("canvas")?.click(); }, 50);
    }
    setIsLocked(isMobile);
  }, [isMobile]);

  const handleLock       = useCallback(() => setIsLocked(true), []);
  const handleUnlock     = useCallback(() => {
    setIsLocked(false);
    if (!selectedArtwork) setIsPaused(true);
  }, [selectedArtwork]);

  const handleArtworkSelect = useCallback((artwork: ArtworkData) => {
    if (isEditMode) return; // in edit mode, drag instead of select
    setSelectedArtwork(artwork); setIsLocked(false); setIsPaused(false);
  }, [isEditMode]);

  const handleModalClose = useCallback(() => setSelectedArtwork(null), []);
  const handleMobileActivate = useCallback(() => {
    if (isMobile && !isLocked && !selectedArtwork && hasEntered) setIsLocked(true);
  }, [isMobile, isLocked, selectedArtwork, hasEntered]);

  const handleResume = useCallback(() => {
    setIsPaused(false);
    if (!isMobile) {
      setTimeout(() => { document.querySelector("canvas")?.click(); }, 50);
    } else {
      setIsLocked(true);
    }
  }, [isMobile]);

  const handleToggleAudio = useCallback(() => {
    setAudioMuted((prev) => {
      const next = !prev;
      localStorage.setItem("vas_audioMuted", String(next));
      return next;
    });
  }, []);

  const handleEnterEditMode = useCallback(() => {
    setIsPaused(false);
    setIsEditMode(true);
    if (!isMobile) {
      setTimeout(() => { document.querySelector("canvas")?.click(); }, 50);
    }
  }, [isMobile]);

  const handleExitEditMode = useCallback(() => {
    if (editState.isDirty) {
      if (!window.confirm("You have unsaved changes. Discard and exit edit mode?")) return;
      editState.discard();
    }
    setIsEditMode(false);
  }, [editState]);

  const handleSaveEdit = useCallback(async () => {
    await editState.save();
    setIsEditMode(false);
  }, [editState]);

  const webglSupported = checkWebGLSupport();
  const mobileActive = isMobile && !selectedArtwork && hasEntered;
  const inAnyFullscreen = isFullscreen || fakeFullscreen;
  const showEntrance = !hasEntered && !isMobile;
  const showMobileEntrance = !hasEntered && isMobile;
  const showCrosshair = (isLocked || (isMobile && mobileActive)) && !selectedArtwork && !isPaused && !isPresenting;
  const showEditBorder = isEditMode && !editState.isPreviewing && !isPresenting;

  return (
    <div className={fakeFullscreen ? "fixed inset-0 z-[9999] bg-[#0d0b09]" : "absolute inset-0 bg-[#0d0b09]"}>
      {/* Canvas fade-in */}
      <div className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: sceneVisible ? 1 : 0 }}>
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
              <XR store={xrStore}>
                <XROrigin position={[0, -1.6, 0]} />

                <GalleryScene
                  artworks={activeArtworks}
                  roomTheme={activeTheme}
                  roomSeed={gallery.roomSeed}
                  roomMode={gallery.roomMode}
                  roomSize={activeRoomSize}
                  decorationLevel={activeDecorationLevel}
                  roomHeight={gallery.roomHeight}
                  lightingMood={activeLighting}
                  isLocked={isPresenting ? true : (isMobile ? mobileActive : isLocked)}
                  isMobile={isMobile && !isPresenting}
                  joystickRef={joystickRef}
                  onLock={handleLock}
                  onUnlock={handleUnlock}
                  onArtworkSelect={isPresenting ? (a) => setVrArtwork(a) : handleArtworkSelect}
                  onHoverStateChange={setHoverState}
                  inspectCallbackRef={inspectRef}
                  onSceneReady={() => setTimeout(() => setSceneVisible(true), 200)}
                  isEditMode={isEditMode && !editState.isPreviewing}
                  onArtworkMoved={editState.handleArtworkMoved}
                  onArtworkDropped={editState.handleArtworkMovedCommit}
                  onArtworkSelected={editState.handleArtworkSelected}
                  walkSpeed={walkSpeed}
                  lookSensitivity={lookSensitivity}
                />

                {/* Edit mode floor grid */}
                {isEditMode && !editState.isPreviewing && (
                  <EditFloorGrid halfW={activeHalfW} halfD={activeHalfD} floorY={floorY} />
                )}

                {/* Edit mode wall resize arrows */}
                {isEditMode && !editState.isPreviewing && (
                  <WallArrows halfW={activeHalfW} halfD={activeHalfD} halfH={halfH} floorY={floorY} onResize={editState.handleRoomResize} />
                )}

                {/* VR-only: locomotion + artwork info panel */}
                {isPresenting && (
                  <>
                    <XRLocomotion halfW={halfW} halfD={halfD} />
                    <XRControllerRay handedness="left" />
                    <XRControllerRay
                      handedness="right"
                      onArtworkSelect={(id) => {
                        const a = activeArtworks.find((aw) => aw.id === id) ?? null;
                        if (a) setVrArtwork(a);
                      }}
                    />
                    <VRInfoPanel artwork={vrArtwork} onClose={() => setVrArtwork(null)} />
                  </>
                )}
              </XR>
            </Canvas>
          </CanvasErrorBoundary>
        ) : (
          <WebGLUnsupportedFallback />
        )}
      </div>

      {/* Ambient audio */}
      {hasEntered && <AmbientAudio theme={activeTheme} muted={audioMuted} />}

      {/* Edit mode amber border */}
      {showEditBorder && (
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ boxShadow: "inset 0 0 0 3px rgba(245,192,96,0.7)", animation: "editPulse 2s ease-in-out infinite" }} />
      )}

      {/* Top-right controls row (visible when locked / in edit mode, not in VR) */}
      {webglSupported && hasEntered && !isPaused && !selectedArtwork && !isPresenting && (
        <div className="absolute top-4 right-4 z-40 flex items-center gap-2 pointer-events-auto">
          {/* Audio toggle */}
          <button onClick={handleToggleAudio}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors text-sm">
            {audioMuted ? "🔇" : "🔊"}
          </button>
          {/* VR button */}
          {vrSupported && !isMobile && (
            <VRButton
              isPresenting={isPresenting}
              onEnter={() => xrStore.enterVR()}
              onExit={() => xrStore.getState().session?.end()}
            />
          )}
        </div>
      )}

      {/* ─── DESKTOP OVERLAYS ─── */}
      {webglSupported && !isMobile && !isPresenting && (
        <>
          {/* Entrance overlay */}
          {showEntrance && (
            <EntranceOverlay
              galleryTitle={gallery.galleryTitle}
              artistName={gallery.artistName}
              onEnter={handleEnter}
            />
          )}

          {/* Pause overlay */}
          {isPaused && !selectedArtwork && !isEditMode && (
            <PauseOverlay
              galleryTitle={gallery.galleryTitle}
              artistName={gallery.artistName}
              isOwner={isOwner}
              audioMuted={audioMuted}
              walkSpeed={walkSpeed}
              onWalkSpeedChange={(v) => {
                setWalkSpeed(v);
                localStorage.setItem("vas_walkSpeed", String(v));
              }}
              onResume={handleResume}
              onExit={onExit}
              onEnterEditMode={isOwner ? handleEnterEditMode : undefined}
              onToggleAudio={handleToggleAudio}
            />
          )}

          {/* Crosshair + hints while locked */}
          {showCrosshair && (
            <>
              <Crosshair hoverState={hoverState} editMode={isEditMode && !editState.isPreviewing} />
              {(isEditMode && !editState.isPreviewing)
                ? <HoverHintStrip hoverState={hoverState} editMode />
                : <HoverHintStrip hoverState={hoverState} editMode={false} />
              }
              {showHints && !isEditMode && (
                <div className="absolute bottom-6 left-6 pointer-events-none">
                  <p className="font-mono text-[10px] tracking-widest text-white/20">
                    WASD · DRAG TO LOOK · CLICK TO INSPECT · ESC TO PAUSE
                  </p>
                </div>
              )}
            </>
          )}

          {/* Edit mode toolbar */}
          {isEditMode && !editState.isPreviewing && (
            <EditToolbar
              galleryId={gallery.id ?? 0}
              currentTheme={editState.roomTheme}
              currentLighting={editState.lightingMood}
              currentDecorationLevel={editState.decorationLevel}
              isDirty={editState.isDirty}
              isSaving={editState.isSaving}
              canUndo={editState.canUndo}
              canRedo={editState.canRedo}
              onThemeChange={editState.handleThemeChange}
              onLightingChange={editState.handleLightingChange}
              onDecorationLevelChange={editState.handleDecorationLevelChange}
              onSave={handleSaveEdit}
              onDiscard={handleExitEditMode}
              onUndo={editState.undo}
              onRedo={editState.redo}
              onPreviewToggle={() => editState.setIsPreviewing((v) => !v)}
              isPreviewing={editState.isPreviewing}
              selectedArtwork={selectedEditArtwork}
              onArtworkScale={(v) => editState.selectedArtworkId !== null && editState.handleArtworkScale(editState.selectedArtworkId, v)}
              onArtworkScaleCommit={editState.handleArtworkScaleCommit}
              onArtworkRotateOffset={(rad) => editState.selectedArtworkId !== null && editState.handleArtworkRotateOffset(editState.selectedArtworkId, rad)}
              onArtworkResetPlacement={editState.handleArtworkResetPlacement}
              onArtworkDeselect={() => editState.handleArtworkSelected(null)}
            />
          )}
        </>
      )}

      {/* ─── MOBILE OVERLAYS ─── */}
      {webglSupported && isMobile && !isPresenting && (
        <>
          {showMobileEntrance && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-20">
              <div className="text-center px-10 py-10 max-w-lg">
                <p className="font-mono text-[10px] tracking-[0.35em] text-white/30 mb-4 uppercase">Virtual Art Space</p>
                {gallery.galleryTitle && (
                  <h1 className="font-display text-2xl italic text-white mb-2">{gallery.galleryTitle}</h1>
                )}
                {gallery.artistName && (
                  <p className="font-sans text-sm text-white/50 mb-8">{gallery.artistName}</p>
                )}
                <button onClick={() => { setHasEntered(true); setIsLocked(true); }}
                  className="inline-flex items-center gap-3 px-8 py-3 bg-amber-500/90 hover:bg-amber-400 text-black font-display text-base italic font-semibold rounded-sm transition-all">
                  Enter Gallery →
                </button>
              </div>
            </div>
          )}

          {/* Mobile sensitivity / speed strip — shown when active */}
          {mobileActive && !selectedArtwork && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5 pointer-events-auto">
              <span className="font-mono text-[9px] tracking-widest text-white/30">LOOK</span>
              <input
                type="range" min={0.3} max={3} step={0.1} value={lookSensitivity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLookSensitivity(v);
                  localStorage.setItem("vas_lookSensitivity", String(v));
                }}
                className="w-20 accent-amber-400"
              />
              <span className="font-mono text-[9px] tracking-widest text-white/30 ml-2">SPD</span>
              <input
                type="range" min={2} max={14} step={0.5} value={walkSpeed}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setWalkSpeed(v);
                  localStorage.setItem("vas_walkSpeed", String(v));
                }}
                className="w-20 accent-amber-400"
              />
            </div>
          )}

          {mobileActive && (
            <>
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 ring-1 ring-black/40" />
              </div>
              <div className="absolute bottom-8 left-8 z-10" data-joystick>
                <VirtualJoystick stateRef={joystickRef} />
              </div>
              <div className="absolute bottom-8 right-6 z-10 select-none" data-controls style={{ width: 104, height: 164 }}>
                <div className="absolute" style={{ top: 0, left: 30 }}>
                  <ControlBtn symbol="△" label="Exit gallery" accent="#ff6b6b" onClick={() => onExit?.()} disabled={!onExit} />
                </div>
                <div className="absolute" style={{ top: 60, left: 0 }}>
                  <ControlBtn symbol="□" label="Toggle hints" accent="#a78bfa" onClick={() => setShowHints((h) => !h)} />
                </div>
                <div className="absolute" style={{ top: 60, left: 60 }}>
                  <ControlBtn symbol={inAnyFullscreen ? "⊠" : "○"} label="Fullscreen"
                    accent="#22d3ee" onClick={toggleFullscreen} />
                </div>
                <div className="absolute" style={{ top: 120, left: 30 }}>
                  <ControlBtn symbol="×" label="Inspect artwork" accent="#f59e0b" onClick={() => inspectRef.current?.()} />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* VR Exit button (XRDomOverlay style) */}
      {isPresenting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <button
            onClick={() => xrStore.getState().session?.end()}
            className="px-6 py-2 bg-amber-500/80 hover:bg-amber-400 text-black font-sans font-semibold rounded-sm text-sm">
            Exit VR
          </button>
        </div>
      )}

      {/* Empty gallery notice */}
      {webglSupported && hasEntered && !isLocked && !selectedArtwork && !isPaused && !isEditMode &&
        !isPresenting && gallery.artworks.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <p className="font-mono text-xs tracking-widest text-white/20">NO ARTWORKS IN THIS GALLERY YET</p>
          </div>
        )}

      {/* Artwork detail modal */}
      {selectedArtwork && !isPresenting && (
        <ArtworkDetailModal artwork={selectedArtwork} onClose={handleModalClose} />
      )}

      <style>{`
        @keyframes editPulse {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1.0; }
        }
      `}</style>
    </div>
  );
}
