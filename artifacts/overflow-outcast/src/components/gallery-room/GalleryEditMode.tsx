import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import type { ArtworkData } from "./ArtworkFrame";
import { getTheme, getAllThemes, THEME_DISPLAY_NAMES } from "./theme-config";
import {
  usePatchArtworkPlacement,
  usePatchGalleryRoom,
} from "@workspace/api-client-react";

// ─── Edit history entry ───────────────────────────────────────────────────────
type EditSnapshot = {
  artworks: Array<Pick<ArtworkData, "id" | "xPosition" | "yPosition" | "zPosition" | "rotation" | "scale" | "isManuallyPlaced">>;
  room: { roomTheme: string; lightingMood: number; decorationLevel: number; roomSize: number };
};

// ─── Floor grid overlay ───────────────────────────────────────────────────────
export function EditFloorGrid({ halfW, halfD, floorY, isPicking = false }: {
  halfW: number; halfD: number; floorY: number; isPicking?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  // Pulse opacity / brightness while picking
  useFrame((state) => {
    if (!matRef.current) return;
    if (isPicking) {
      const t = state.clock.getElapsedTime();
      const pulse = 0.55 + 0.4 * Math.sin(t * 4);
      matRef.current.opacity = pulse;
      matRef.current.color.setStyle("#f5c060");
    } else {
      matRef.current.opacity = 0.22;
      matRef.current.color.setStyle("#f5c060");
    }
  });

  return (
    <group>
      <mesh ref={meshRef} position={[0, floorY + 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfW * 2, halfD * 2, Math.max(2, Math.ceil(halfW * 4)), Math.max(2, Math.ceil(halfD * 4))]} />
        <meshBasicMaterial ref={matRef} color="#f5c060" transparent opacity={0.22} wireframe />
      </mesh>
      {/* Solid soft underlay so grid reads on dark floors */}
      <mesh position={[0, floorY + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfW * 2, halfD * 2]} />
        <meshBasicMaterial color={isPicking ? "#f5c060" : "#1a1410"} transparent opacity={isPicking ? 0.08 : 0.15} />
      </mesh>
    </group>
  );
}

// ─── Artwork drag manager (raycasts onto wall planes) ─────────────────────────
const WALL_PLANES = [
  { wallIdx: 0, normal: new THREE.Vector3(0, 0, 1),  point: new THREE.Vector3(0, 0, 0) }, // north
  { wallIdx: 1, normal: new THREE.Vector3(-1, 0, 0), point: new THREE.Vector3(0, 0, 0) }, // east
  { wallIdx: 2, normal: new THREE.Vector3(0, 0, -1), point: new THREE.Vector3(0, 0, 0) }, // south
  { wallIdx: 3, normal: new THREE.Vector3(1, 0, 0),  point: new THREE.Vector3(0, 0, 0) }, // west
];

function snapToGrid(v: number, step = 0.25): number {
  return Math.round(v / step) * step;
}

function getNearestWallPlane(pos: THREE.Vector3, halfW: number, halfD: number) {
  const dists = [
    { idx: 0, d: Math.abs(pos.z + halfD) }, // north
    { idx: 1, d: Math.abs(pos.x - halfW) }, // east
    { idx: 2, d: Math.abs(pos.z - halfD) }, // south
    { idx: 3, d: Math.abs(pos.x + halfW) }, // west
  ];
  return dists.sort((a, b) => a.d - b.d)[0].idx;
}

export function EditDragController({
  isEditing,
  artworks,
  halfW,
  halfD,
  halfH,
  onArtworkMoved,
  onDrop,
  onArtworkSelected,
  onDraggingChange,
}: {
  isEditing: boolean;
  artworks: ArtworkData[];
  halfW: number;
  halfD: number;
  halfH: number;
  onArtworkMoved: (id: number, patch: Partial<ArtworkData>) => void;
  onDrop?: () => void;
  onArtworkSelected?: (id: number | null) => void;
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const { camera, scene } = useThree();
  const draggingRef = useRef<{ artworkId: number; wallIdx: number } | null>(null);
  const pendingPatchRef = useRef<{ id: number; patch: Partial<ArtworkData> } | null>(null);

  const rc = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());
  const hitPt = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!isEditing || !draggingRef.current) return;
    const WALL_INSET = 0.12;
    rc.current.setFromCamera(new THREE.Vector2(0, 0), camera);
    const w = draggingRef.current.wallIdx;

    if (w === 0) plane.current.set(new THREE.Vector3(0, 0, 1),  halfD - WALL_INSET);
    if (w === 1) plane.current.set(new THREE.Vector3(-1, 0, 0), -(halfW - WALL_INSET));
    if (w === 2) plane.current.set(new THREE.Vector3(0, 0, -1), halfD - WALL_INSET);
    if (w === 3) plane.current.set(new THREE.Vector3(1, 0, 0),  -(halfW - WALL_INSET));

    const ok = rc.current.ray.intersectPlane(plane.current, hitPt.current);
    if (!ok) return;

    const artworkId = draggingRef.current.artworkId;
    const wallRotations = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

    let x = snapToGrid(hitPt.current.x);
    let y = Math.max(-halfH + 0.5, Math.min(halfH - 0.5, snapToGrid(hitPt.current.y)));
    let z = snapToGrid(hitPt.current.z);

    x = Math.max(-halfW + WALL_INSET + 0.2, Math.min(halfW - WALL_INSET - 0.2, x));
    z = Math.max(-halfD + WALL_INSET + 0.2, Math.min(halfD - WALL_INSET - 0.2, z));

    const patch: Partial<ArtworkData> = {
      xPosition: x, yPosition: y, zPosition: z,
      rotation: wallRotations[w], isManuallyPlaced: true,
    };
    pendingPatchRef.current = { id: artworkId, patch };
    onArtworkMoved(artworkId, patch);
  });

  // Click-to-pick, click-to-drop drag model
  useEffect(() => {
    if (!isEditing) { draggingRef.current = null; return; }

    const findArtworkHit = (): { artworkId: number; point: THREE.Vector3 } | null => {
      rc.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      const intersects = rc.current.intersectObjects(scene.children, true);
      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData.artworkId !== undefined) {
            return { artworkId: obj.userData.artworkId as number, point: hit.point };
          }
          obj = obj.parent;
        }
      }
      return null;
    };

    const handleClick = (e: MouseEvent) => {
      if (!isEditing) return;
      // Ignore clicks that originated inside an interactive UI overlay —
      // toolbar buttons, joystick, control cluster, etc. — so tapping a
      // mobile control doesn't pick/drop an artwork under the crosshair.
      const target = e.target as HTMLElement | null;
      if (target && target.closest("button, input, a, [data-controls], [data-joystick], [role='dialog']")) {
        return;
      }
      const artworkHit = findArtworkHit();

      if (draggingRef.current) {
        // Drop: commit to undo history
        draggingRef.current = null;
        pendingPatchRef.current = null;
        onDraggingChange?.(false);
        onDrop?.();
      } else if (artworkHit) {
        // Pick up
        const wallIdx = getNearestWallPlane(artworkHit.point, halfW, halfD);
        draggingRef.current = { artworkId: artworkHit.artworkId, wallIdx };
        onDraggingChange?.(true);
      } else {
        // Click on empty space — deselect
        onArtworkSelected?.(null);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!isEditing) return;
      e.preventDefault();
      const artworkHit = findArtworkHit();
      if (artworkHit) {
        onArtworkSelected?.(artworkHit.artworkId);
      }
    };

    window.addEventListener("click", handleClick);
    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [isEditing, camera, scene, halfW, halfD, onDrop, onArtworkSelected, onDraggingChange]);

  return null;
}

// ─── Wall handle arrows for room resize ───────────────────────────────────────
export function WallArrows({
  halfW, halfD, halfH, floorY,
  onResize,
}: {
  halfW: number; halfD: number; halfH: number; floorY: number;
  onResize: (direction: "north" | "south" | "east" | "west", delta: number) => void;
}) {
  const ARROW_Y = floorY + halfH; // mid height

  const arrows: Array<{
    key: string;
    dir: "north" | "south" | "east" | "west";
    pos: [number, number, number];
    label: string;
  }> = [
    { key: "n",  dir: "north", pos: [0,  ARROW_Y, -halfD + 0.5], label: "←→" },
    { key: "s",  dir: "south", pos: [0,  ARROW_Y,  halfD - 0.5], label: "←→" },
    { key: "e",  dir: "east",  pos: [halfW - 0.5, ARROW_Y, 0],   label: "↕" },
    { key: "w",  dir: "west",  pos: [-halfW + 0.5, ARROW_Y, 0],  label: "↕" },
  ];

  return (
    <>
      {arrows.map((a) => (
        <group key={a.key} position={a.pos}>
          <mesh
            onClick={(e) => { e.stopPropagation(); onResize(a.dir, 1); }}
            onContextMenu={(e) => { e.stopPropagation(); onResize(a.dir, -1); }}
          >
            <sphereGeometry args={[0.22, 10, 10]} />
            <meshStandardMaterial color="#f5c060" emissive="#f5c060" emissiveIntensity={0.6} roughness={0.3} />
          </mesh>
          <Html center distanceFactor={8} style={{ pointerEvents: "none", color: "#000", fontSize: 14, fontWeight: "bold", userSelect: "none" }}>
            {a.label}
          </Html>
        </group>
      ))}
    </>
  );
}

// ─── 2D Edit toolbar ──────────────────────────────────────────────────────────
interface EditToolbarProps {
  galleryId: number;
  currentTheme: string;
  currentLighting: number;
  currentDecorationLevel: number;
  isDirty: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onThemeChange: (theme: string) => void;
  onLightingChange: (v: number) => void;
  onDecorationLevelChange: (v: number) => void;
  onSave: () => void;
  onDiscard: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPreviewToggle: () => void;
  isPreviewing: boolean;
  // Frame properties (shown when an artwork is right-click selected)
  selectedArtwork?: ArtworkData | null;
  onArtworkScale?: (v: number) => void;
  onArtworkScaleCommit?: () => void;
  onArtworkRotateOffset?: (rad: number) => void;
  onArtworkResetPlacement?: (id: number) => void;
  onArtworkDeselect?: () => void;
  isMobile?: boolean;
}

export function EditToolbar(props: EditToolbarProps) {
  if (props.isMobile) return <MobileEditToolbar {...props} />;
  return <DesktopEditToolbar {...props} />;
}

function MobileEditToolbar({
  currentTheme, currentLighting, currentDecorationLevel, isDirty, isSaving,
  canUndo, canRedo,
  onThemeChange, onLightingChange, onDecorationLevelChange, onSave, onDiscard, onUndo, onRedo,
  onPreviewToggle, isPreviewing,
  selectedArtwork, onArtworkScale, onArtworkScaleCommit, onArtworkRotateOffset,
  onArtworkResetPlacement, onArtworkDeselect,
}: EditToolbarProps) {
  const themes = getAllThemes();
  const [panel, setPanel] = useState<"none" | "theme" | "light" | "furn">("none");

  return (
    <>
      {/* Top status strip — sits in top safe area */}
      <div
        className="fixed left-0 right-0 z-40 flex items-center justify-between pointer-events-none px-3"
        style={{ top: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="pointer-events-auto px-2.5 py-1 bg-black/75 backdrop-blur-md border border-amber-500/60 rounded-sm">
          <span className="font-mono text-[9px] tracking-widest text-amber-400">
            {isPreviewing ? "PREVIEW" : "EDIT"}
          </span>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button onClick={onDiscard} disabled={isSaving}
            className="px-3 h-8 text-[11px] border border-white/25 bg-black/70 backdrop-blur-md text-white/80 rounded-sm transition-all disabled:opacity-40">
            ✕
          </button>
          <button onClick={onSave} disabled={!isDirty || isSaving}
            className="px-4 h-8 text-[11px] bg-amber-500 text-black font-semibold rounded-sm transition-all disabled:opacity-40 disabled:bg-amber-500/40">
            {isSaving ? "…" : "Save"}
          </button>
        </div>
      </div>

      {/* Frame properties — slide-up from above bottom toolbar when artwork selected */}
      {selectedArtwork && (
        <div
          className="fixed left-3 right-3 z-40 pointer-events-auto"
          style={{ bottom: `calc(4.5rem + env(safe-area-inset-bottom))` }}
        >
          <div className="px-3 py-2 bg-black/90 backdrop-blur-md border border-amber-500/50 rounded-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] tracking-widest text-amber-400 truncate flex-1">{selectedArtwork.title}</span>
              <button onClick={onArtworkDeselect} className="text-white/50 font-mono text-sm px-2">✕</button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[9px] text-white/40 w-10">SIZE</span>
              <input
                type="range" min={0.4} max={2.0} step={0.05}
                value={selectedArtwork.scale ?? 1.0}
                onChange={(e) => onArtworkScale?.(Number(e.target.value))}
                onTouchEnd={onArtworkScaleCommit} onMouseUp={onArtworkScaleCommit}
                className="flex-1 accent-amber-400 h-2"
              />
              <span className="font-mono text-[10px] text-amber-400/70 w-10 text-right">{(selectedArtwork.scale ?? 1.0).toFixed(2)}×</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[9px] text-white/40 w-10">SPIN</span>
              {[-45, -15, 15, 45].map((deg) => (
                <button key={deg} onClick={() => onArtworkRotateOffset?.(deg * Math.PI / 180)}
                  className="flex-1 py-1 text-[10px] font-mono border border-white/20 text-white/60 rounded-sm">
                  {deg > 0 ? `+${deg}` : `${deg}`}°
                </button>
              ))}
              <button onClick={() => { onArtworkResetPlacement?.(selectedArtwork.id); onArtworkDeselect?.(); }}
                className="px-2 py-1 text-[10px] font-mono border border-white/15 text-white/40 rounded-sm">
                ↺
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup panel (theme / light / furnishings) */}
      {panel !== "none" && (
        <div
          className="fixed left-3 right-3 z-40 pointer-events-auto"
          style={{ bottom: `calc(4.5rem + env(safe-area-inset-bottom))` }}
        >
          <div className="px-3 py-3 bg-black/90 backdrop-blur-md border border-amber-500/40 rounded-sm">
            {panel === "theme" && (
              <div className="flex gap-2 flex-wrap justify-center">
                {themes.map(({ key, config }) => (
                  <button
                    key={key}
                    title={THEME_DISPLAY_NAMES[key] ?? key}
                    onClick={() => { onThemeChange(key); setPanel("none"); }}
                    className={`w-12 h-12 rounded-sm border-2 ${currentTheme === key ? "border-amber-400" : "border-white/20"}`}
                    style={{ background: `linear-gradient(135deg, ${config.wallColor} 50%, ${config.floorColor} 50%)` }}
                  />
                ))}
              </div>
            )}
            {panel === "light" && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-white/40 w-12">LIGHT</span>
                <input
                  type="range" min={0.5} max={2.0} step={0.1} value={currentLighting}
                  onChange={(e) => onLightingChange(Number(e.target.value))}
                  className="flex-1 accent-amber-400 h-2"
                />
                <span className="font-mono text-[10px] text-amber-400/70 w-10 text-right">{currentLighting.toFixed(1)}×</span>
              </div>
            )}
            {panel === "furn" && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-white/40 w-12">DECOR</span>
                <input
                  type="range" min={0} max={10} step={1} value={currentDecorationLevel}
                  onChange={(e) => onDecorationLevelChange(Number(e.target.value))}
                  className="flex-1 accent-amber-400 h-2"
                />
                <span className="font-mono text-[10px] text-amber-400/70 w-10 text-right">{currentDecorationLevel}/10</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom toolbar — compact icon row */}
      <div
        className="fixed left-0 right-0 z-40 pointer-events-auto"
        style={{ bottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between gap-1 px-3 py-2 bg-black/85 backdrop-blur-md border-t-2 border-amber-500/60">
          <button onClick={onUndo} disabled={!canUndo}
            className="w-9 h-9 flex items-center justify-center text-white/70 disabled:opacity-30 font-mono text-base">↩</button>
          <button onClick={onRedo} disabled={!canRedo}
            className="w-9 h-9 flex items-center justify-center text-white/70 disabled:opacity-30 font-mono text-base">↪</button>
          <button onClick={() => setPanel(panel === "theme" ? "none" : "theme")}
            className={`flex-1 h-9 text-[11px] font-sans rounded-sm border ${panel === "theme" ? "border-amber-400 text-amber-400 bg-amber-400/10" : "border-white/20 text-white/70"}`}>
            🎨
          </button>
          <button onClick={() => setPanel(panel === "light" ? "none" : "light")}
            className={`flex-1 h-9 text-[11px] font-sans rounded-sm border ${panel === "light" ? "border-amber-400 text-amber-400 bg-amber-400/10" : "border-white/20 text-white/70"}`}>
            ☀
          </button>
          <button onClick={() => setPanel(panel === "furn" ? "none" : "furn")}
            className={`flex-1 h-9 text-[11px] font-sans rounded-sm border ${panel === "furn" ? "border-amber-400 text-amber-400 bg-amber-400/10" : "border-white/20 text-white/70"}`}>
            🪴
          </button>
          <button onClick={onPreviewToggle}
            className="flex-1 h-9 text-[11px] font-sans rounded-sm border border-white/20 text-white/70">
            {isPreviewing ? "Edit" : "👁"}
          </button>
        </div>
      </div>
    </>
  );
}

function DesktopEditToolbar({
  currentTheme, currentLighting, currentDecorationLevel, isDirty, isSaving,
  canUndo, canRedo,
  onThemeChange, onLightingChange, onDecorationLevelChange, onSave, onDiscard, onUndo, onRedo,
  onPreviewToggle, isPreviewing,
  selectedArtwork, onArtworkScale, onArtworkScaleCommit, onArtworkRotateOffset,
  onArtworkResetPlacement, onArtworkDeselect,
}: EditToolbarProps) {
  const themes = getAllThemes();
  const [showThemes, setShowThemes] = useState(false);
  const [showFurnishings, setShowFurnishings] = useState(false);

  return (
    <div className="absolute inset-x-0 bottom-0 z-40 flex flex-col pointer-events-none">

      {/* Frame properties panel — shown when artwork selected via right-click */}
      {selectedArtwork && (
        <div className="pointer-events-auto mx-auto mb-2 w-80 px-4 py-3 bg-black/90 backdrop-blur-md border border-amber-500/40 rounded-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] tracking-widest text-amber-400">FRAME PROPERTIES</span>
            <button onClick={onArtworkDeselect} className="text-white/40 hover:text-white/80 font-mono text-xs">✕</button>
          </div>
          <p className="font-sans text-xs text-white/50 mb-3 truncate italic">{selectedArtwork.title}</p>
          {/* Scale */}
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[9px] text-white/30 w-12">SCALE</span>
            <input
              type="range" min={0.4} max={2.0} step={0.05}
              value={selectedArtwork.scale ?? 1.0}
              onChange={(e) => onArtworkScale?.(Number(e.target.value))}
              onMouseUp={onArtworkScaleCommit} onTouchEnd={onArtworkScaleCommit}
              className="flex-1 accent-amber-400"
            />
            <span className="font-mono text-[10px] text-amber-400/70 w-8">{(selectedArtwork.scale ?? 1.0).toFixed(2)}×</span>
          </div>
          {/* Rotation offset */}
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[9px] text-white/30 w-12">ROTATE</span>
            <div className="flex gap-1">
              {[-45, -15, 15, 45].map((deg) => (
                <button key={deg} onClick={() => onArtworkRotateOffset?.(deg * Math.PI / 180)}
                  className="px-2 py-1 text-[10px] font-mono border border-white/20 text-white/50 hover:text-white hover:border-amber-400/60 rounded-sm transition-all">
                  {deg > 0 ? `+${deg}°` : `${deg}°`}
                </button>
              ))}
            </div>
          </div>
          {/* Reset placement */}
          <button
            onClick={() => { onArtworkResetPlacement?.(selectedArtwork.id); onArtworkDeselect?.(); }}
            className="w-full py-1.5 text-[10px] font-mono border border-white/15 text-white/30 hover:text-white/60 hover:border-white/30 rounded-sm transition-all">
            RESET TO AUTO-PLACEMENT
          </button>
        </div>
      )}

      {/* Furnishings panel */}
      {showFurnishings && (
        <div className="pointer-events-auto mx-auto mb-2 px-4 py-3 bg-black/80 backdrop-blur-md border border-amber-500/30 rounded-sm w-64">
          <span className="font-mono text-[10px] tracking-widest text-amber-400/70 mb-2 block">DECORATION DENSITY</span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-white/30">NONE</span>
            <input
              type="range" min={0} max={10} step={1} value={currentDecorationLevel}
              onChange={(e) => onDecorationLevelChange(Number(e.target.value))}
              className="flex-1 accent-amber-400"
            />
            <span className="font-mono text-[9px] text-white/30">MAX</span>
          </div>
          <p className="font-mono text-[9px] text-white/25 mt-2">Level {currentDecorationLevel}/10 — affects pedestals, plants & accents</p>
        </div>
      )}

      {/* Theme picker panel */}
      {showThemes && (
        <div className="pointer-events-auto mx-auto mb-2 flex items-center gap-2 px-4 py-3 bg-black/80 backdrop-blur-md border border-amber-500/30 rounded-sm">
          {themes.map(({ key, config }) => (
            <button
              key={key}
              title={THEME_DISPLAY_NAMES[key] ?? key}
              onClick={() => { onThemeChange(key); setShowThemes(false); }}
              className={`w-10 h-10 rounded-sm border-2 transition-all hover:scale-110 ${currentTheme === key ? "border-amber-400" : "border-white/20"}`}
              style={{ background: `linear-gradient(135deg, ${config.wallColor} 50%, ${config.floorColor} 50%)` }}
            />
          ))}
        </div>
      )}

      {/* Main toolbar */}
      <div className="pointer-events-auto flex items-center justify-between px-4 py-3 bg-black/85 backdrop-blur-md border-t-2 border-amber-500/60">
        {/* Left: Undo/Redo + Theme + Lighting + Furnishings */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={onUndo} disabled={!canUndo}
            className="w-8 h-8 flex items-center justify-center rounded text-white/60 hover:text-white disabled:opacity-30 hover:bg-white/10 transition-all font-mono text-xs">
            ↩
          </button>
          <button onClick={onRedo} disabled={!canRedo}
            className="w-8 h-8 flex items-center justify-center rounded text-white/60 hover:text-white disabled:opacity-30 hover:bg-white/10 transition-all font-mono text-xs">
            ↪
          </button>
          <div className="w-px h-5 bg-white/15" />
          <button onClick={() => { setShowThemes((v) => !v); setShowFurnishings(false); }}
            className={`flex items-center gap-2 px-3 h-8 rounded-sm border text-xs font-sans transition-all ${showThemes ? "border-amber-400 text-amber-400 bg-amber-400/10" : "border-white/20 text-white/60 hover:text-white"}`}>
            <span className="w-4 h-4 rounded-sm inline-block" style={{ background: `${getTheme(currentTheme).wallColor}` }} />
            Theme
          </button>
          <button onClick={() => { setShowFurnishings((v) => !v); setShowThemes(false); }}
            className={`flex items-center gap-2 px-3 h-8 rounded-sm border text-xs font-sans transition-all ${showFurnishings ? "border-amber-400 text-amber-400 bg-amber-400/10" : "border-white/20 text-white/60 hover:text-white"}`}>
            🪴 Furnishings
          </button>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-white/30 tracking-widest">LIGHT</span>
            <input
              type="range" min={0.5} max={2.0} step={0.1} value={currentLighting}
              onChange={(e) => onLightingChange(Number(e.target.value))}
              className="w-24 accent-amber-400"
            />
            <span className="font-mono text-[10px] text-amber-400/70 w-8">{currentLighting.toFixed(1)}×</span>
          </div>
        </div>

        {/* Centre: Edit mode badge */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-widest text-amber-400 border border-amber-500/50 px-2 py-0.5 rounded-sm">
            {isPreviewing ? "VISITOR PREVIEW" : "EDIT MODE"}
          </span>
          <button onClick={onPreviewToggle}
            className="px-3 h-7 text-xs border border-white/20 text-white/50 hover:text-white rounded-sm transition-all">
            {isPreviewing ? "Resume Editing" : "Preview"}
          </button>
        </div>

        {/* Right: Save/Discard */}
        <div className="flex items-center gap-3">
          <button onClick={onDiscard} disabled={isSaving}
            className="px-4 h-8 text-xs border border-white/20 text-white/60 hover:text-white hover:bg-white/5 rounded-sm transition-all disabled:opacity-40">
            Discard
          </button>
          <button onClick={onSave} disabled={!isDirty || isSaving}
            className="px-5 h-8 text-xs bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-sm transition-all disabled:opacity-40 disabled:bg-amber-500/40">
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main edit wrapper – orchestrates state and mutations ─────────────────────
export type PendingArtworkPatch = Pick<ArtworkData, "id"> & Partial<ArtworkData>;
export type PendingRoomPatch = { roomTheme?: string; lightingMood?: number };

interface GalleryEditModeProps {
  galleryId: number;
  originalArtworks: ArtworkData[];
  originalTheme: string;
  originalLighting: number;
  roomSize: number;
  halfW: number;
  halfD: number;
  halfH: number;
  floorY: number;
  isPresenting: boolean;
  children?: React.ReactNode;
  onExitEdit: () => void;
  onArtworksChange: (artworks: ArtworkData[]) => void;
  onThemeChange: (theme: string) => void;
  onLightingChange: (v: number) => void;
}

const MAX_HISTORY = 20;

export function useEditState(
  galleryId: number,
  originalArtworks: ArtworkData[],
  originalTheme: string,
  originalLighting: number,
  originalDecorationLevel = 5,
  originalRoomSize = 5,
) {
  const draftKey = `vas_editDraft_${galleryId}`;

  // Restore draft from localStorage if one exists
  const initFromDraft = (): { artworks: ArtworkData[]; roomTheme: string; lightingMood: number; dirty: boolean } => {
    if (!galleryId) return { artworks: originalArtworks, roomTheme: originalTheme, lightingMood: originalLighting, dirty: false };
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return { artworks: originalArtworks, roomTheme: originalTheme, lightingMood: originalLighting, dirty: false };
      const draft = JSON.parse(raw) as { artworks: Array<Partial<ArtworkData> & { id: number }>; roomTheme: string; lightingMood: number };
      if (!window.confirm("You have unsaved edits from a previous session. Restore them?")) {
        localStorage.removeItem(draftKey);
        return { artworks: originalArtworks, roomTheme: originalTheme, lightingMood: originalLighting, dirty: false };
      }
      const merged = originalArtworks.map((a) => {
        const p = draft.artworks.find((d) => d.id === a.id);
        return p ? { ...a, ...p } : a;
      });
      return { artworks: merged, roomTheme: draft.roomTheme ?? originalTheme, lightingMood: draft.lightingMood ?? originalLighting, dirty: true };
    } catch {
      return { artworks: originalArtworks, roomTheme: originalTheme, lightingMood: originalLighting, dirty: false };
    }
  };

  const init = initFromDraft();

  const [artworks, setArtworks] = useState<ArtworkData[]>(init.artworks);
  const [roomTheme, setRoomTheme] = useState(init.roomTheme);
  const [lightingMood, setLightingMood] = useState(init.lightingMood);
  const [decorationLevel, setDecorationLevel] = useState(originalDecorationLevel);
  const [roomSize, setRoomSize] = useState(originalRoomSize);
  const [selectedArtworkId, setSelectedArtworkId] = useState<number | null>(null);

  // History index 0 = initial/oldest state; we always keep the "before edit" snapshot at index 0
  const initSnap: EditSnapshot = {
    artworks: init.artworks.map((a) => ({ id: a.id, xPosition: a.xPosition, yPosition: a.yPosition, zPosition: a.zPosition, rotation: a.rotation, scale: a.scale, isManuallyPlaced: a.isManuallyPlaced })),
    room: { roomTheme: init.roomTheme, lightingMood: init.lightingMood, decorationLevel: originalDecorationLevel, roomSize: originalRoomSize },
  };
  const [history, setHistory] = useState<EditSnapshot[]>([initSnap]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [isDirty, setIsDirty] = useState(init.dirty);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const patchArtwork    = usePatchArtworkPlacement();
  const patchRoom       = usePatchGalleryRoom();

  const snapshot = useCallback((): EditSnapshot => ({
    artworks: artworks.map((a) => ({
      id: a.id,
      xPosition: a.xPosition,
      yPosition: a.yPosition,
      zPosition: a.zPosition,
      rotation: a.rotation,
      scale: a.scale,
      isManuallyPlaced: a.isManuallyPlaced,
    })),
    room: { roomTheme, lightingMood, decorationLevel, roomSize },
  }), [artworks, roomTheme, lightingMood, decorationLevel, roomSize]);

  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const next = prev.slice(0, historyIdx + 1);
      const s = snapshot();
      return [...next, s].slice(-MAX_HISTORY);
    });
    setHistoryIdx((i) => Math.min(i + 1, MAX_HISTORY - 1));
    setIsDirty(true);
  }, [snapshot, historyIdx]);

  const applySnapshot = useCallback((s: EditSnapshot) => {
    setArtworks((prev) => prev.map((a) => {
      const patch = s.artworks.find((p) => p.id === a.id);
      return patch ? { ...a, ...patch } : a;
    }));
    setRoomTheme(s.room.roomTheme);
    setLightingMood(s.room.lightingMood);
    setDecorationLevel(s.room.decorationLevel ?? originalDecorationLevel);
    setRoomSize(s.room.roomSize ?? originalRoomSize);
  }, [originalDecorationLevel, originalRoomSize]);

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const s = history[historyIdx - 1];
    if (!s) return;
    applySnapshot(s);
    setHistoryIdx((i) => i - 1);
  }, [history, historyIdx, applySnapshot]);

  const redo = useCallback(() => {
    const s = history[historyIdx + 1];
    if (!s) return;
    applySnapshot(s);
    setHistoryIdx((i) => i + 1);
  }, [history, historyIdx, applySnapshot]);

  const handleArtworkMoved = useCallback((id: number, patch: Partial<ArtworkData>) => {
    setArtworks((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
    setIsDirty(true);
  }, []);

  const handleArtworkMovedCommit = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const handleArtworkSelected = useCallback((id: number | null) => {
    setSelectedArtworkId(id);
  }, []);

  const handleArtworkScale = useCallback((id: number, scale: number) => {
    setArtworks((prev) => prev.map((a) => a.id === id ? { ...a, scale } : a));
    setIsDirty(true);
  }, []);

  const handleArtworkScaleCommit = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const handleArtworkRotateOffset = useCallback((id: number, rad: number) => {
    setArtworks((prev) => prev.map((a) => a.id === id ? { ...a, rotation: (a.rotation ?? 0) + rad, isManuallyPlaced: true } : a));
    pushHistory();
    setIsDirty(true);
  }, [pushHistory]);

  const handleArtworkResetPlacement = useCallback((id: number) => {
    setArtworks((prev) => prev.map((a) => a.id === id ? { ...a, isManuallyPlaced: false, xPosition: undefined, yPosition: undefined, zPosition: undefined, rotation: undefined, scale: 1 } : a));
    pushHistory();
    setIsDirty(true);
  }, [pushHistory]);

  const handleDecorationLevelChange = useCallback((v: number) => {
    setDecorationLevel(v);
    setIsDirty(true);
  }, []);

  const handleDecorationLevelCommit = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const handleRoomResize = useCallback((dir: "north" | "south" | "east" | "west", delta: number) => {
    setRoomSize((prev) => Math.max(3, Math.min(12, prev + delta * 0.5)));
    pushHistory();
    setIsDirty(true);
  }, [pushHistory]);

  const handleThemeChange = useCallback((theme: string) => {
    pushHistory();
    setRoomTheme(theme);
  }, [pushHistory]);

  const handleLightingChange = useCallback((v: number) => {
    setLightingMood(v);
    setIsDirty(true);
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const artworkPatches = artworks
        .filter((a) => a.isManuallyPlaced !== undefined)
        .map((a) =>
          patchArtwork.mutateAsync({ id: a.id, data: {
            xPosition: a.xPosition,
            yPosition: a.yPosition,
            zPosition: a.zPosition,
            rotation: a.rotation,
            scale: a.scale ?? 1,
            isManuallyPlaced: a.isManuallyPlaced ?? false,
          }})
        );
      await Promise.all([
        ...artworkPatches,
        patchRoom.mutateAsync({ id: galleryId, data: { roomTheme, lightingMood, decorationLevel, roomSize } }),
      ]);
      setIsDirty(false);
      try { localStorage.removeItem(draftKey); } catch {}
    } finally {
      setIsSaving(false);
    }
  }, [artworks, galleryId, patchArtwork, patchRoom, roomTheme, lightingMood, decorationLevel, roomSize, draftKey]);

  const discard = useCallback(() => {
    setArtworks(originalArtworks);
    setRoomTheme(originalTheme);
    setLightingMood(originalLighting);
    setDecorationLevel(originalDecorationLevel);
    setRoomSize(originalRoomSize);
    setSelectedArtworkId(null);
    const fresh = initSnap;
    setHistory([fresh]);
    setHistoryIdx(0);
    setIsDirty(false);
    setIsPreviewing(false);
    try { localStorage.removeItem(draftKey); } catch {}
  }, [originalArtworks, originalTheme, originalLighting, originalDecorationLevel, originalRoomSize, initSnap, draftKey]);

  // Autosave draft
  useEffect(() => {
    if (!isDirty) return;
    const key = draftKey;
    const timer = setInterval(() => {
      try {
        localStorage.setItem(key, JSON.stringify({
          artworks: artworks.map((a) => ({
            id: a.id, xPosition: a.xPosition, yPosition: a.yPosition,
            zPosition: a.zPosition, rotation: a.rotation, scale: a.scale,
            isManuallyPlaced: a.isManuallyPlaced,
          })),
          roomTheme, lightingMood, decorationLevel, roomSize,
        }));
      } catch {}
    }, 30_000);
    return () => clearInterval(timer);
  }, [isDirty, galleryId, artworks, roomTheme, lightingMood, decorationLevel, roomSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyZ") { e.preventDefault(); redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyZ") { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyS") { e.preventDefault(); if (isDirty) save(); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, isDirty, save]);

  return {
    artworks, setArtworks,
    roomTheme, lightingMood, decorationLevel, roomSize,
    selectedArtworkId,
    isDirty, isSaving, isPreviewing, setIsPreviewing,
    canUndo: historyIdx > 0,
    canRedo: historyIdx < history.length - 1,
    handleArtworkMoved,
    handleArtworkMovedCommit,
    handleArtworkSelected,
    handleArtworkScale,
    handleArtworkScaleCommit,
    handleArtworkRotateOffset,
    handleArtworkResetPlacement,
    handleDecorationLevelChange,
    handleDecorationLevelCommit,
    handleRoomResize,
    handleThemeChange,
    handleLightingChange,
    undo, redo, save, discard,
  };
}
