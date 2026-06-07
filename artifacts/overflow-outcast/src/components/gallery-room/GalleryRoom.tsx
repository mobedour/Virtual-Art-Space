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
import { XRVREditController, VREditPanel } from "./VREditMode";
import { VRDetailPanel, VRMenuPanel } from "./VROverlayPanels";
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
  // Called after a successful edit save so the host page can refetch/invalidate
  // its gallery query and normal mode reflects the saved changes. May return a
  // promise; the save awaits it before exiting edit mode to avoid a stale flash.
  onSaved?: () => void | Promise<void>;
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

function ControlBtn({ symbol, label, accent, onClick, disabled = false, size = "md" }: {
  symbol: string; label: string; accent: string; onClick: () => void; disabled?: boolean;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "w-14 h-14 text-2xl" : "w-12 h-12 text-lg";
  return (
    <button aria-label={label} onClick={onClick} disabled={disabled}
      style={{ borderColor: accent, color: accent }}
      className={`${dim} rounded-full border-2 bg-black/65 backdrop-blur-md flex items-center justify-center font-bold transition-all duration-150 active:scale-90 active:bg-white/10 select-none touch-manipulation shadow-lg shadow-black/40 ${disabled ? "opacity-30" : "opacity-90 hover:opacity-100"}`}>
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
function EntranceOverlay({ galleryTitle, artistName, isOwner, onEnter, onEnterEditMode,
  vrSupported, isPresenting, onEnterVR,
}: {
  galleryTitle?: string; artistName?: string; isOwner?: boolean;
  onEnter: () => void; onEnterEditMode?: () => void;
  vrSupported?: boolean; isPresenting?: boolean; onEnterVR?: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-[70]">
      <div className="text-center px-10 py-10 max-w-lg">
        <p className="font-mono text-[10px] tracking-[0.35em] text-white/30 mb-4 uppercase">Virtual Art Space</p>
        {galleryTitle && (
          <h1 className="font-display text-3xl italic text-white mb-2 leading-tight">{galleryTitle}</h1>
        )}
        {artistName && <p className="font-sans text-sm text-white/50 mb-8">{artistName}</p>}
        <div className="flex flex-col items-center gap-3">
          <button onClick={onEnter}
            className="inline-flex items-center gap-3 px-8 py-3 bg-amber-500/90 hover:bg-amber-400 text-black font-display text-base italic font-semibold rounded-sm transition-all duration-200 hover:scale-105">
            Enter Gallery →
          </button>
          {vrSupported && onEnterVR && !isPresenting && (
            <button onClick={onEnterVR}
              className="inline-flex items-center gap-2 px-7 py-2.5 border-2 border-amber-500/70 text-amber-300 hover:bg-amber-500/15 font-sans text-sm font-medium rounded-sm transition-all duration-200 backdrop-blur-md">
              ◈ Enter VR Mode
            </button>
          )}
          {isOwner && onEnterEditMode && (
            <button onClick={onEnterEditMode}
              className="inline-flex items-center gap-2 px-6 py-2 border border-white/20 text-white/50 hover:bg-white/5 font-sans text-sm rounded-sm transition-all duration-200">
              ✏ Edit Gallery
            </button>
          )}
        </div>
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
  lookSensitivity, onLookSensitivityChange, isMobile,
  onResume, onExit, onEnterEditMode, onToggleAudio,
  vrSupported, isPresenting, onEnterVR,
}: {
  galleryTitle?: string; artistName?: string; isOwner?: boolean; audioMuted: boolean;
  walkSpeed: number; onWalkSpeedChange: (v: number) => void;
  lookSensitivity?: number; onLookSensitivityChange?: (v: number) => void;
  isMobile?: boolean;
  onResume: () => void; onExit?: () => void; onEnterEditMode?: () => void; onToggleAudio: () => void;
  vrSupported?: boolean; isPresenting?: boolean; onEnterVR?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-start bg-black/85 backdrop-blur-md z-[70] overflow-y-auto"
      style={{
        paddingTop: "max(3.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="text-center px-8 py-6 max-w-sm w-full">
        {galleryTitle && (
          <h2 className="font-display text-xl italic text-white mb-1">{galleryTitle}</h2>
        )}
        {artistName && <p className="font-sans text-xs text-white/40 mb-6">{artistName}</p>}

        <div className="flex flex-col gap-3">
          <button onClick={onResume}
            className="w-full py-3 bg-amber-500/90 hover:bg-amber-400 text-black font-display italic font-semibold rounded-sm transition-all">
            Resume Exploring
          </button>
          {vrSupported && onEnterVR && !isPresenting && (
            <button onClick={onEnterVR}
              className="w-full py-2.5 border-2 border-amber-500/70 text-amber-300 hover:bg-amber-500/15 font-sans text-sm font-medium rounded-sm transition-all">
              ◈ Enter VR Mode
            </button>
          )}
          {isOwner && onEnterEditMode && (
            <button onClick={onEnterEditMode}
              className="w-full py-2.5 border border-amber-500/40 text-amber-400/80 hover:bg-amber-500/10 font-sans text-sm rounded-sm transition-all">
              Edit Gallery
            </button>
          )}
          <button onClick={onExit}
            className="w-full py-2.5 border border-white/15 text-white/50 hover:bg-white/5 font-sans text-sm rounded-sm transition-all">
            Exit Gallery
          </button>
        </div>

        <div className="mt-6 pt-5 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] tracking-widest text-white/40 w-16 text-left">SPEED</span>
            <input
              type="range" min={2} max={14} step={0.5} value={walkSpeed}
              onChange={(e) => onWalkSpeedChange(Number(e.target.value))}
              className="flex-1 accent-amber-400 h-2"
            />
            <span className="font-mono text-[10px] text-amber-400/70 w-8 text-right">{walkSpeed.toFixed(1)}</span>
          </div>
          {isMobile && onLookSensitivityChange && lookSensitivity !== undefined && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] tracking-widest text-white/40 w-16 text-left">LOOK</span>
              <input
                type="range" min={0.3} max={3} step={0.1} value={lookSensitivity}
                onChange={(e) => onLookSensitivityChange(Number(e.target.value))}
                className="flex-1 accent-amber-400 h-2"
              />
              <span className="font-mono text-[10px] text-amber-400/70 w-8 text-right">{lookSensitivity.toFixed(1)}</span>
            </div>
          )}
          <button onClick={onToggleAudio}
            className="flex items-center gap-2 mx-auto text-sm text-white/50 hover:text-white/80 font-sans transition-colors">
            <span>{audioMuted ? "🔇" : "🔊"}</span>
            <span>{audioMuted ? "Audio Off" : "Audio On"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function GalleryRoom({ gallery, onExit, onEditRequest, isOwner, onSaved }: GalleryRoomProps) {
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
  // VR-only: the artwork whose detail panel is open in the headset (point at a
  // piece + pull the trigger). null → roaming. The DOM detail modal is invisible
  // in immersive WebXR, so this drives an in-scene 3D panel instead.
  const [vrSelectedArtwork, setVrSelectedArtwork] = useState<ArtworkData | null>(null);
  // VR-only: whether the in-headset menu (edit room / exit / resume) is open.
  const [vrMenuOpen, setVrMenuOpen] = useState(false);
  // Defensively clear VR overlay state whenever we leave VR so nothing stays
  // latched on into the next session.
  useEffect(() => {
    if (!isPresenting) {
      if (vrSelectedArtwork) setVrSelectedArtwork(null);
      if (vrMenuOpen) setVrMenuOpen(false);
    }
  }, [isPresenting, vrSelectedArtwork, vrMenuOpen]);
  // Mutable ref that mirrors selectedArtwork but is updated synchronously
  // (before React batches/commits state). handleUnlock reads this ref so it
  // always sees the current intent even when the async pointerlockchange event
  // arrives after a state update has already been queued but not yet rendered.
  const selectedArtworkRef = useRef<ArtworkData | null>(null);
  const xrOriginRef = useRef<THREE.Group>(null);
  // Shared flag: true while VR teleport-aim mode owns the right trigger, so the
  // ray / edit controllers suppress their own trigger handling.
  const teleportActiveRef = useRef(false);
  const [isEditDragging, setIsEditDragging] = useState(false);
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
    onSaved,
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
        if (selectedArtwork) { selectedArtworkRef.current = null; setSelectedArtwork(null); return; }
        if (isEditMode && !editState.isDirty) { setIsEditMode(false); return; }
        if (isLocked) { setIsLocked(false); setIsPaused(true); }
        else if (isPaused) { setIsPaused(false); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked, isPaused, selectedArtwork, isEditMode, editState.isDirty]);

  // ─── Browser back button handling ───────────────────────────────────────────
  // Push a sentinel state when entering any modal layer so back button pops it
  // off in order: artwork modal → edit mode → pause → exit gallery.
  useEffect(() => {
    // Push history sentinel when entering immersive mode
    if (!hasEntered) return;
    window.history.pushState({ vasImmersive: true }, "");
    const onPop = () => {
      // Pop layers in order; if nothing to pop, the browser will navigate away
      if (selectedArtwork) { selectedArtworkRef.current = null; setSelectedArtwork(null); window.history.pushState({ vasImmersive: true }, ""); return; }
      if (isEditMode) {
        if (editState.isDirty) {
          if (!window.confirm("Discard unsaved edits?")) {
            window.history.pushState({ vasImmersive: true }, "");
            return;
          }
          editState.discard();
        }
        setIsEditMode(false);
        window.history.pushState({ vasImmersive: true }, "");
        return;
      }
      if (isPaused) {
        // Back from pause menu → exit the gallery
        onExit?.();
        return;
      }
      // Walking with no overlays open → open the pause menu first (so the
      // user gets a chance to confirm) instead of immediately exiting.
      setIsPaused(true);
      setIsLocked(false);
      window.history.pushState({ vasImmersive: true }, "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEntered, selectedArtwork, isEditMode, isPaused, isMobile, editState.isDirty]);

  // ─── Visual viewport tracking for proper mobile fullscreen ──────────────────
  // Browser chrome on iOS Safari changes viewport height as you scroll. Force
  // body height to match visualViewport so controls stay glued to the bottom.
  useEffect(() => {
    if (!isMobile || !hasEntered) return;
    const setVh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--vas-vh", `${h}px`);
    };
    setVh();
    window.visualViewport?.addEventListener("resize", setVh);
    window.visualViewport?.addEventListener("scroll", setVh);
    window.addEventListener("orientationchange", setVh);
    // Prevent body scroll while immersive
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    return () => {
      window.visualViewport?.removeEventListener("resize", setVh);
      window.visualViewport?.removeEventListener("scroll", setVh);
      window.removeEventListener("orientationchange", setVh);
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, [isMobile, hasEntered]);

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
    } else {
      // Auto-enable fake fullscreen on mobile so browser chrome doesn't cover controls
      setFakeFullscreen(true);
    }
    setIsLocked(isMobile);
  }, [isMobile]);

  // Tracks a Ctrl-hold induced pointer-unlock so handleUnlock doesn't pop
  // the pause overlay (and so we can auto re-lock on key release).
  const ctrlUnlockedRef = useRef(false);
  const handleLock       = useCallback(() => setIsLocked(true), []);
  const handleUnlock     = useCallback(() => {
    setIsLocked(false);
    // Skip pause overlay when:
    //  - artwork modal is open (selectedArtworkRef tracks synchronous intent,
    //    not the potentially-stale React closure, to survive the async gap
    //    between controls.unlock() and the browser's pointerlockchange event), or
    //  - edit mode (pointer intentionally unlocked for the toolbar), or
    //  - user is holding Ctrl to temporarily free the cursor.
    if (!selectedArtworkRef.current && !isEditMode && !ctrlUnlockedRef.current) setIsPaused(true);
  }, [isEditMode]);

  // Hold Ctrl to release the mouse, release Ctrl to re-lock. Works in both
  // normal walking and edit mode. Desktop only.
  useEffect(() => {
    if (isMobile || !hasEntered) return;
    const isCtrl = (e: KeyboardEvent) =>
      e.code === "ControlLeft" || e.code === "ControlRight" || e.key === "Control";
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isCtrl(e) || e.repeat) return;
      if (!document.pointerLockElement) return;
      ctrlUnlockedRef.current = true;
      document.exitPointerLock();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!isCtrl(e) || !ctrlUnlockedRef.current) return;
      ctrlUnlockedRef.current = false;
      // Don't try to re-lock while a modal / pause overlay is up.
      if (selectedArtwork || isPaused) return;
      // Ask GalleryScene to call controlsRef.current.lock() directly. We
      // avoid synthesising a canvas click because in edit mode that would
      // also fire the EditDragController pick/drop handler.
      window.dispatchEvent(new CustomEvent("vas:request-lock"));
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isMobile, hasEntered, selectedArtwork, isPaused]);

  const handleArtworkSelect = useCallback((artwork: ArtworkData) => {
    if (isEditMode) return; // in edit mode, drag instead of select
    selectedArtworkRef.current = artwork; // sync ref so handleUnlock sees it immediately
    setSelectedArtwork(artwork); setIsLocked(false); setIsPaused(false);
  }, [isEditMode]);

  const handleModalClose = useCallback(() => {
    selectedArtworkRef.current = null; // sync ref before state update
    setSelectedArtwork(null);
  }, []);
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
    setHasEntered(true);
    if (!isMobile) {
      setTimeout(() => { document.querySelector("canvas")?.click(); }, 50);
    } else {
      setIsLocked(true);
      setFakeFullscreen(true);
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
    <div
      className={fakeFullscreen ? "fixed inset-0 z-[9999] bg-[#0d0b09] overflow-hidden" : "absolute inset-0 bg-[#0d0b09] overflow-hidden"}
      style={fakeFullscreen && isMobile ? { height: "var(--vas-vh, 100dvh)" } : undefined}
    >
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
                <XROrigin ref={xrOriginRef} position={[0, -1.6, 0]} />

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
                  onArtworkSelect={isPresenting
                    ? (a) => {
                        // VR selection: ArtworkFrame's R3F onClick is fired by
                        // the library's controller ray pointer. Open the VR
                        // detail panel (and dismiss the menu if it was open).
                        // Ignore while teleport-aim owns the trigger, so one
                        // pull doesn't both teleport and select.
                        if (isEditMode || teleportActiveRef.current) return;
                        setVrMenuOpen(false);
                        setVrSelectedArtwork(a);
                      }
                    : handleArtworkSelect}
                  onHoverStateChange={setHoverState}
                  inspectCallbackRef={inspectRef}
                  onSceneReady={() => setTimeout(() => setSceneVisible(true), 200)}
                  isEditMode={isEditMode && !editState.isPreviewing}
                  onArtworkMoved={editState.handleArtworkMoved}
                  onArtworkDropped={editState.handleArtworkMovedCommit}
                  onArtworkSelected={editState.handleArtworkSelected}
                  onEditDraggingChange={setIsEditDragging}
                  walkSpeed={walkSpeed}
                  lookSensitivity={lookSensitivity}
                  isPresenting={isPresenting}
                />

                {/* Edit mode floor grid — pulses amber while picking */}
                {isEditMode && !editState.isPreviewing && (
                  <EditFloorGrid halfW={activeHalfW} halfD={activeHalfD} floorY={floorY} isPicking={isEditDragging} />
                )}

                {/* Edit mode wall resize arrows */}
                {isEditMode && !editState.isPreviewing && (
                  <WallArrows halfW={activeHalfW} halfD={activeHalfD} halfH={halfH} floorY={floorY} onResize={editState.handleRoomResize} />
                )}

                {/* VR-only: locomotion + interaction. Edit mode swaps the
                    right-hand ray for the grab-to-move edit controller and
                    shows an in-scene 3D control panel, since the DOM toolbar
                    is invisible inside the headset. */}
                {isPresenting && (
                  <>
                    <XRLocomotion
                      halfW={halfW}
                      halfD={halfD}
                      xrOriginRef={xrOriginRef}
                      teleportActiveRef={teleportActiveRef}
                      onExitGallery={() => xrStore.getState().session?.end()}
                      onToggleMenu={isEditMode ? undefined : () => {
                        setVrSelectedArtwork(null);
                        setVrMenuOpen((o) => !o);
                      }}
                    />

                    {isEditMode && !editState.isPreviewing ? (
                      <>
                        <XRVREditController
                          artworks={activeArtworks}
                          halfW={activeHalfW}
                          halfD={activeHalfD}
                          halfH={halfH}
                          suppressRef={teleportActiveRef}
                          onArtworkMoved={editState.handleArtworkMoved}
                          onDrop={() => { editState.handleArtworkMovedCommit(); setIsEditDragging(false); }}
                          onArtworkSelected={(id) => {
                            editState.handleArtworkSelected(id);
                            setIsEditDragging(id !== null);
                          }}
                        />
                        <VREditPanel
                          isDirty={editState.isDirty}
                          isSaving={editState.isSaving}
                          isDragging={isEditDragging}
                          canUndo={editState.canUndo}
                          canRedo={editState.canRedo}
                          onSave={() => { void handleSaveEdit(); }}
                          onUndo={editState.undo}
                          onRedo={editState.redo}
                          onExit={() => {
                            if (editState.isDirty) { void editState.save(); }
                            setIsEditMode(false);
                          }}
                        />
                      </>
                    ) : (
                      <>
                        {vrSelectedArtwork && (
                          <VRDetailPanel
                            artwork={vrSelectedArtwork}
                            suppressRef={teleportActiveRef}
                            onClose={() => setVrSelectedArtwork(null)}
                          />
                        )}
                        {vrMenuOpen && (
                          <VRMenuPanel
                            isOwner={isOwner}
                            suppressRef={teleportActiveRef}
                            onEditRoom={() => { setVrMenuOpen(false); handleEnterEditMode(); }}
                            onExitVR={() => xrStore.getState().session?.end()}
                            onClose={() => setVrMenuOpen(false)}
                          />
                        )}
                      </>
                    )}
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

      {/* Top-right controls row (visible when exploring, not in VR) */}
      {webglSupported && hasEntered && !isPaused && !selectedArtwork && !isPresenting && (
        <div
          className="absolute right-3 z-[60] flex items-center gap-2 pointer-events-auto"
          style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          {/* Audio toggle */}
          <button onClick={handleToggleAudio}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors text-sm">
            {audioMuted ? "🔇" : "🔊"}
          </button>
          {/* VR button — only shown on non-mobile when VR is supported */}
          {vrSupported && !isMobile && (
            <VRButton
              isPresenting={isPresenting}
              onEnter={() => xrStore.enterVR()}
              onExit={() => xrStore.getState().session?.end()}
              size="sm"
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
              isOwner={isOwner}
              onEnter={handleEnter}
              onEnterEditMode={isOwner ? handleEnterEditMode : undefined}
              vrSupported={vrSupported}
              isPresenting={isPresenting}
              onEnterVR={() => { handleEnter(); setTimeout(() => xrStore.enterVR(), 100); }}
            />
          )}

          {/* Pause overlay */}
          {isPaused && !selectedArtwork && (
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
              isMobile={false}
              onResume={handleResume}
              onExit={onExit}
              onEnterEditMode={isOwner && !isEditMode ? handleEnterEditMode : undefined}
              onToggleAudio={handleToggleAudio}
              vrSupported={vrSupported}
              isPresenting={isPresenting}
              onEnterVR={() => { setIsPaused(false); setTimeout(() => xrStore.enterVR(), 100); }}
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
              isMobile={false}
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
                <div className="flex flex-col items-center gap-3">
                  <button onClick={handleEnter}
                    className="inline-flex items-center gap-3 px-8 py-3 bg-amber-500/90 hover:bg-amber-400 text-black font-display text-base italic font-semibold rounded-sm transition-all">
                    Enter Gallery →
                  </button>
                  {isOwner && (
                    <button onClick={handleEnterEditMode}
                      className="inline-flex items-center gap-2 px-6 py-2 border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 font-sans text-sm rounded-sm transition-all">
                      ✏ Edit Gallery
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mobile pause overlay */}
          {isPaused && !selectedArtwork && (
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
              lookSensitivity={lookSensitivity}
              onLookSensitivityChange={(v) => {
                setLookSensitivity(v);
                localStorage.setItem("vas_lookSensitivity", String(v));
              }}
              isMobile={true}
              onResume={handleResume}
              onExit={onExit}
              onEnterEditMode={isOwner && !isEditMode ? handleEnterEditMode : undefined}
              onToggleAudio={handleToggleAudio}
              vrSupported={vrSupported}
              isPresenting={isPresenting}
              onEnterVR={() => { setIsPaused(false); setTimeout(() => xrStore.enterVR(), 100); }}
            />
          )}

          {/* Floating "Exit Preview" pill — the only way out of preview mode
              once the edit toolbar is hidden. Always on top, safe-area aware. */}
          {isEditMode && editState.isPreviewing && !isPaused && !selectedArtwork && (
            <button
              onClick={() => editState.setIsPreviewing(false)}
              aria-label="Exit preview"
              className="absolute z-50 flex items-center gap-2 px-4 h-11 rounded-full bg-amber-500/90 hover:bg-amber-400 active:scale-95 transition-all font-sans text-sm font-semibold text-black shadow-lg shadow-black/50 touch-manipulation pointer-events-auto"
              style={{
                top: "max(1rem, env(safe-area-inset-top))",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            >
              <span aria-hidden>✏</span>
              <span>Exit preview</span>
            </button>
          )}

          {/* Mobile edit-mode toolbar (compact, sits above joystick) */}
          {isEditMode && !editState.isPreviewing && (
            <EditToolbar
              isMobile={true}
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

          {mobileActive && !isPaused && (
            <>
              {/* Centre crosshair */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white/60 ring-1 ring-black/40" />
              </div>
              {/* Joystick — anchored to bottom-left with safe area */}
              <div
                className="absolute z-20"
                data-joystick
                style={{
                  left: "max(1.5rem, env(safe-area-inset-left))",
                  bottom: `calc(${isEditMode ? "9rem" : "2rem"} + env(safe-area-inset-bottom))`,
                }}
              >
                <VirtualJoystick stateRef={joystickRef} />
              </div>
              {/* Right-side control cluster — 2-column grid so it stays
                  compact in both portrait and landscape orientations. */}
              <div
                className="absolute z-20 grid grid-cols-2 gap-3 select-none"
                data-controls
                style={{
                  right: "max(1rem, env(safe-area-inset-right))",
                  bottom: `calc(${isEditMode ? "9rem" : "2rem"} + env(safe-area-inset-bottom))`,
                }}
              >
                <ControlBtn
                  symbol="☰"
                  label="Menu"
                  accent="#f5c060"
                  size="lg"
                  onClick={() => { setIsLocked(false); setIsPaused(true); }}
                />
                <ControlBtn
                  symbol={inAnyFullscreen ? "⊠" : "⛶"}
                  label="Fullscreen"
                  accent="#22d3ee"
                  size="lg"
                  onClick={toggleFullscreen}
                />
                <ControlBtn
                  symbol={audioMuted ? "🔇" : "🔊"}
                  label="Audio"
                  accent="#a78bfa"
                  size="lg"
                  onClick={handleToggleAudio}
                />
                <ControlBtn
                  symbol={showHints ? "ⓘ" : "ⓘ"}
                  label="Toggle hints"
                  accent={showHints ? "#f5c060" : "#71717a"}
                  size="lg"
                  onClick={() => setShowHints((h) => !h)}
                />
                {!isEditMode && (
                  <ControlBtn
                    symbol="◎"
                    label="Inspect artwork"
                    accent="#f59e0b"
                    size="lg"
                    onClick={() => inspectRef.current?.()}
                  />
                )}
                {isEditMode && (
                  <ControlBtn
                    symbol="✓"
                    label="Pick / Drop"
                    accent="#f5c060"
                    size="lg"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("vas:pick-drop"));
                    }}
                  />
                )}
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
        /* Landscape phones: tight on vertical space. Slim the edit bar and
           anchor both joystick and right-cluster at the same bottom row so
           they don't overlap the top status strip or each other. */
        @media (orientation: landscape) and (max-height: 500px) {
          [data-joystick],
          [data-controls] {
            bottom: calc(2.75rem + env(safe-area-inset-bottom)) !important;
            top: auto !important;
            transform: none !important;
          }
          [data-controls] {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.4rem !important;
          }
          [data-controls] button {
            width: 2.5rem !important;
            height: 2.5rem !important;
            font-size: 1rem !important;
          }
          [data-mobile-edit-bar] .vas-edit-bar-row {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }
          [data-mobile-edit-bar] .vas-edit-bar-row button {
            height: 1.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}
