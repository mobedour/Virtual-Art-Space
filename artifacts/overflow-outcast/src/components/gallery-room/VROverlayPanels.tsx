import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArtworkData } from "./ArtworkFrame";

// ─── Canvas drawing helpers ─────────────────────────────────────────────────────
// We render every panel as a synchronous CanvasTexture instead of drei <Text>.
// In an immersive WebXR session the async troika font fetch behind <Text> often
// never resolves (the panels render as a bare black backing) — whereas a
// CanvasTexture is drawn immediately and works in the headset exactly like the
// floor/wall textures do. ctx.fillText also uses always-available system fonts.

export function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D, text: string, x: number, yStart: number,
  maxWidth: number, lineHeight: number, maxLines: number,
): number {
  const words = text.split(/\s+/);
  let line = "";
  let y = yStart;
  let lines = 0;
  for (let n = 0; n < words.length; n++) {
    const test = line ? line + " " + words[n] : words[n];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = words[n];
      y += lineHeight;
      lines++;
      if (lines >= maxLines - 1) {
        let rest = words.slice(n).join(" ");
        while (rest.length && ctx.measureText(rest + "…").width > maxWidth) rest = rest.slice(0, -1);
        if (rest) ctx.fillText(rest + "…", x, y);
        return y;
      }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y;
}

export function makeCanvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// ─── Shared head-anchor hook ───────────────────────────────────────────────────
// Anchors a panel in front of the user the moment it appears, then billboards it
// to keep facing them. Reads the LIVE XR camera (gl.xr.getCamera()), since
// useThree().camera is only the rig-local head offset in @react-three/xr v6.
function useHeadAnchor(
  groupRef: React.RefObject<THREE.Group | null>,
  { distance = 1.5, yOffset = 0 }: { distance?: number; yOffset?: number } = {},
) {
  const { camera, gl } = useThree();
  const anchor = useRef(new THREE.Vector3());
  const anchored = useRef(false);
  const camPos = useRef(new THREE.Vector3());
  const fwd = useRef(new THREE.Vector3());

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const cam = gl.xr.isPresenting ? (gl.xr.getCamera() as unknown as THREE.Camera) : camera;
    cam.getWorldPosition(camPos.current);

    if (!anchored.current) {
      cam.getWorldDirection(fwd.current);
      fwd.current.y = 0;
      if (fwd.current.lengthSq() < 1e-6) fwd.current.set(0, 0, -1);
      fwd.current.normalize();
      anchor.current.copy(camPos.current).addScaledVector(fwd.current, distance);
      anchor.current.y = camPos.current.y + yOffset;
      anchored.current = true;
    }

    g.position.copy(anchor.current);
    const dx = camPos.current.x - anchor.current.x;
    const dz = camPos.current.z - anchor.current.z;
    g.rotation.set(0, Math.atan2(dx, dz), 0);
  });
}

// ─── Ray-pressable 3D button (canvas texture + native pointer events) ───────────
// Interaction uses the library's own controller ray pointer via standard R3F
// onClick / onPointerOver events — the same mechanism wall artworks already use.
// No custom raycasting, so the ray always originates from the user's hand.
interface VRPanelButtonProps {
  position: [number, number, number];
  width?: number;
  height?: number;
  label: string;
  color?: string;
  enabled?: boolean;
  onSelect: () => void;
  // While true (teleport-aim mode), the trigger is owned by locomotion, so the
  // button ignores clicks to avoid a single trigger pull both teleporting and
  // pressing a button.
  suppressRef?: React.RefObject<boolean>;
}

export function VRPanelButton({
  position, width = 0.5, height = 0.12, label, color = "#f5c060", enabled = true, onSelect, suppressRef,
}: VRPanelButtonProps) {
  const [hovered, setHovered] = useState(false);

  const texture = useMemo(() => {
    const W = 512;
    const H = Math.round((height / width) * W);
    return makeCanvasTexture(W, H, (ctx) => {
      ctx.clearRect(0, 0, W, H);
      const pad = 6;
      const radius = Math.min(H, W) * 0.22;
      ctx.fillStyle = enabled ? hexA(color, hovered ? 0.55 : 0.22) : hexA(color, 0.05);
      roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, radius);
      ctx.fill();
      ctx.strokeStyle = enabled ? color : hexA(color, 0.25);
      ctx.lineWidth = hovered ? 8 : 4;
      roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, radius);
      ctx.stroke();
      ctx.fillStyle = enabled ? "#ffffff" : "rgba(255,255,255,0.3)";
      ctx.font = `700 ${Math.round(H * 0.42)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, W / 2, H / 2 + H * 0.02);
    });
  }, [label, color, hovered, enabled, width, height]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh
      position={position}
      renderOrder={1003}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (suppressRef?.current) return;
        if (enabled) onSelect();
      }}
      onPointerOver={(e) => { e.stopPropagation(); if (enabled) setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        side={THREE.DoubleSide}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Artwork image loader ────────────────────────────────────────────────────────
// Loads the artwork via THREE.TextureLoader — the same loader the wall/floor
// artwork frames use, which is proven to render in the headset. The texture is
// shown on its OWN mesh (see VRDetailImage) rather than composited into the
// panel's CanvasTexture, because an HTMLImageElement drawn onto the panel canvas
// was not appearing in-headset (text on the same canvas did).
function useArtworkTexture(imageUrl?: string): {
  texture: THREE.Texture | null; loading: boolean; failed: boolean; aspect: number;
} {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [aspect, setAspect] = useState(1);

  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      setLoading(false);
      setFailed(true);
      return;
    }
    let cancelled = false;
    setTexture(null);
    setLoading(true);
    setFailed(false);
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      imageUrl,
      (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        const im = tex.image as { width?: number; height?: number } | undefined;
        if (im?.width && im?.height) setAspect(im.width / im.height);
        setTexture(tex);
        setLoading(false);
      },
      undefined,
      () => { if (!cancelled) { setFailed(true); setLoading(false); } },
    );
    return () => { cancelled = true; };
  }, [imageUrl]);

  // Dispose the GPU texture when it is replaced or the panel unmounts.
  useEffect(() => () => { texture?.dispose(); }, [texture]);

  return { texture, loading, failed, aspect };
}

// Mesh that shows the artwork texture, sized object-fit: contain inside a square
// box of side `box` and centred at panel-local height `cy`.
//
// It must render in the SAME (transparent) pass as the panel backing and at a
// HIGHER renderOrder, otherwise the backing paints over it. Three.js always
// draws transparent objects after all opaque ones regardless of renderOrder, so
// an opaque image mesh (even at a higher renderOrder) is overdrawn by the
// alpha-0.97 backing and effectively vanishes. Matching the backing's
// transparent + depthTest:false config — the exact path the panel text/buttons
// already use successfully in-headset — keeps the image on top and visible.
function VRDetailImage({ texture, aspect, box, cy }: {
  texture: THREE.Texture; aspect: number; box: number; cy: number;
}) {
  const w = aspect >= 1 ? box : box * aspect;
  const h = aspect >= 1 ? box / aspect : box;
  return (
    <mesh position={[0, cy, 0.012]} renderOrder={1001}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
}

// ─── VR Artwork Detail Panel ────────────────────────────────────────────────────
interface VRDetailPanelProps {
  artwork: ArtworkData;
  onClose: () => void;
  suppressRef?: React.RefObject<boolean>;
}

const DETAIL_W = 1.15;
const DETAIL_H = 1.6;
const DETAIL_IMG = 0.86;
// Image sits in the upper area; text is drawn below it on the backing canvas.
const DETAIL_IMG_CY = DETAIL_H / 2 - 0.1 - DETAIL_IMG / 2;

export function VRDetailPanel({ artwork, onClose, suppressRef }: VRDetailPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  useHeadAnchor(groupRef, { distance: 1.4, yOffset: 0 });
  const { texture, loading, failed, aspect } = useArtworkTexture(artwork.imageUrl);

  const meta = [artwork.year, artwork.medium].filter(Boolean).join("   ·   ");
  const desc = artwork.description ?? "";

  // Backing canvas: panel chrome + all text + image placeholder. Redraws when
  // the image load state changes so the "Loading…"/"unavailable" hint is right.
  const backingTex = useMemo(() => {
    const W = 800;
    const H = Math.round((DETAIL_H / DETAIL_W) * W); // 1114
    return makeCanvasTexture(W, H, (ctx) => {
      ctx.clearRect(0, 0, W, H);
      // Panel background
      ctx.fillStyle = "rgba(13,11,9,0.97)";
      roundRect(ctx, 0, 0, W, H, 26);
      ctx.fill();
      // Border
      ctx.strokeStyle = hexA("#f5c060", 0.6);
      ctx.lineWidth = 5;
      roundRect(ctx, 4, 4, W - 8, H - 8, 24);
      ctx.stroke();

      // Image region — a dark backing rect plus load-state text. The actual
      // artwork pixels are drawn by the opaque VRDetailImage mesh layered on top
      // (the proven wall path); the canvas only shows the placeholder while it
      // loads or if it fails, which the opaque mesh then covers once ready.
      const imgW = (DETAIL_IMG / DETAIL_W) * W;
      const imgH = (DETAIL_IMG / DETAIL_H) * H;
      const imgX = (W - imgW) / 2;
      const imgY = (0.5 - DETAIL_IMG_CY / DETAIL_H) * H - imgH / 2;
      ctx.fillStyle = "#1e1a14";
      ctx.fillRect(imgX, imgY, imgW, imgH);
      if (loading || failed) {
        ctx.fillStyle = loading ? hexA("#f5c060", 0.8) : "rgba(120,108,90,0.8)";
        ctx.font = `500 ${Math.round(imgH * 0.06)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(loading ? "Loading image…" : "Image unavailable", W / 2, imgY + imgH / 2);
      }

      // Text block below the image
      let y = imgY + imgH + 64;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 52px 'Playfair Display', Georgia, serif";
      y = wrapText(ctx, artwork.title, W / 2, y, W - 90, 60, 2) + 56;

      if (artwork.artistName) {
        ctx.fillStyle = "#f5c060";
        ctx.font = "600 36px 'Plus Jakarta Sans', system-ui, sans-serif";
        ctx.fillText(artwork.artistName, W / 2, y);
        y += 48;
      }

      if (meta) {
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.font = "400 30px 'Plus Jakarta Sans', system-ui, sans-serif";
        ctx.fillText(meta, W / 2, y);
        y += 46;
      }

      if (desc) {
        ctx.fillStyle = "rgba(255,255,255,0.78)";
        ctx.font = "400 28px 'Plus Jakarta Sans', system-ui, sans-serif";
        wrapText(ctx, desc, W / 2, y, W - 110, 38, 6);
      }
    });
  }, [artwork.title, artwork.artistName, meta, desc, loading, failed]);

  useEffect(() => () => backingTex.dispose(), [backingTex]);

  return (
    <group ref={groupRef}>
      {/* Backing — also captures the ray so artworks behind the panel aren't clicked */}
      <mesh
        position={[0, 0, 0]}
        renderOrder={1000}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <planeGeometry args={[DETAIL_W, DETAIL_H]} />
        <meshBasicMaterial map={backingTex} transparent toneMapped={false} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
      </mesh>

      {/* Artwork image — drawn in the transparent pass above the backing */}
      {texture && (
        <VRDetailImage texture={texture} aspect={aspect} box={DETAIL_IMG} cy={DETAIL_IMG_CY} />
      )}

      {/* Close button */}
      <VRPanelButton
        position={[0, -DETAIL_H / 2 + 0.12, 0.02]}
        width={0.52}
        height={0.13}
        label="✕  CLOSE"
        color="#e5777a"
        suppressRef={suppressRef}
        onSelect={onClose}
      />
    </group>
  );
}

// ─── VR Menu Panel ──────────────────────────────────────────────────────────────
interface VRMenuPanelProps {
  isOwner?: boolean;
  onEditRoom: () => void;
  onExitVR: () => void;
  onClose: () => void;
  suppressRef?: React.RefObject<boolean>;
}

export function VRMenuPanel({ isOwner, onEditRoom, onExitVR, onClose, suppressRef }: VRMenuPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  useHeadAnchor(groupRef, { distance: 1.3, yOffset: -0.05 });

  const PANEL_W = 0.72;
  const PANEL_H = isOwner ? 0.82 : 0.64;

  const buttons = useMemo(() => {
    const list: { label: string; color?: string; onSelect: () => void }[] = [];
    if (isOwner) list.push({ label: "EDIT ROOM", onSelect: onEditRoom });
    list.push({ label: "RESUME", color: "#9adf8f", onSelect: onClose });
    list.push({ label: "EXIT VR", color: "#e5777a", onSelect: onExitVR });
    return list;
  }, [isOwner, onEditRoom, onClose, onExitVR]);

  const startY = PANEL_H / 2 - 0.24;
  const step = 0.18;

  const backingTex = useMemo(() => {
    const W = 512;
    const H = Math.round((PANEL_H / PANEL_W) * W);
    return makeCanvasTexture(W, H, (ctx) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(13,11,9,0.97)";
      roundRect(ctx, 0, 0, W, H, 22);
      ctx.fill();
      ctx.strokeStyle = hexA("#f5c060", 0.6);
      ctx.lineWidth = 4;
      roundRect(ctx, 3, 3, W - 6, H - 6, 20);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#f5c060";
      ctx.font = "700 46px 'Playfair Display', Georgia, serif";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("MENU", W / 2, 58);

      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "400 20px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillText("Point & pull trigger to select", W / 2, 88);
    });
  }, [PANEL_W, PANEL_H]);

  useEffect(() => () => backingTex.dispose(), [backingTex]);

  return (
    <group ref={groupRef}>
      <mesh
        position={[0, 0, 0]}
        renderOrder={1000}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial map={backingTex} transparent toneMapped={false} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
      </mesh>

      {buttons.map((b, i) => (
        <VRPanelButton
          key={b.label}
          position={[0, startY - i * step, 0.01]}
          width={0.58}
          height={0.13}
          label={b.label}
          color={b.color}
          suppressRef={suppressRef}
          onSelect={b.onSelect}
        />
      ))}
    </group>
  );
}
