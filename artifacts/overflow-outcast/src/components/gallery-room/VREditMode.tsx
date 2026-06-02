import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import type { ArtworkData } from "./ArtworkFrame";
import { getNearestWallPlane, snapToGrid } from "./GalleryEditMode";
import { makeCanvasTexture, roundRect, hexA } from "./VROverlayPanels";

const WALL_INSET = 0.12;
const WALL_ROTATIONS = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

interface XRVREditControllerProps {
  halfW: number;
  halfD: number;
  halfH: number;
  onArtworkMoved: (id: number, patch: Partial<ArtworkData>) => void;
  onDrop?: () => void;
  onArtworkSelected?: (id: number | null) => void;
  // While teleport mode owns the right trigger, suppress grab/drop/UI handling
  // so a single trigger press doesn't both teleport and act on an artwork.
  suppressRef?: React.RefObject<boolean>;
}

/**
 * VR edit interaction, driven by the RIGHT controller.
 *
 * This is the in-headset equivalent of EditDragController (which is mouse /
 * pointer-lock based and therefore useless in VR). The controller's own native
 * ray pointer is used as the visible aim line — we do NOT draw a second ray, so
 * the user never sees a confusing dual-ray. Hit detection for pickup/drop/
 * button-press runs invisibly off the controller transform each frame:
 *  - Point at an artwork + press trigger → pick it up.
 *  - While held, the artwork follows the aim along its wall (snapped to grid).
 *  - Press trigger again → drop & commit to undo history.
 *  - Point at a 3D edit-panel button + press trigger → activate it.
 */
export function XRVREditController({
  halfW,
  halfD,
  halfH,
  onArtworkMoved,
  onDrop,
  onArtworkSelected,
  suppressRef,
}: XRVREditControllerProps) {
  const { scene } = useThree();
  const ctrlState = useXRInputSourceState("controller", "right");

  const draggingRef = useRef<{ artworkId: number; wallIdx: number } | null>(null);
  const prevTriggerRef = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());
  const hitPt = useRef(new THREE.Vector3());
  const posV = useRef(new THREE.Vector3());
  const dirV = useRef(new THREE.Vector3());
  const interactiveRootsRef = useRef<THREE.Object3D[]>([]);
  const frameCountRef = useRef(0);
  // Last position pushed for the held artwork — used to avoid firing a React
  // state update every single frame (which re-renders the whole scene → lag).
  const lastEmitRef = useRef<{ x: number; y: number; z: number; w: number } | null>(null);

  const pulse = (strength: number, ms: number) => {
    try {
      const ha = ctrlState?.inputSource?.gamepad?.hapticActuators?.[0];
      if (ha && "pulse" in ha) (ha as any).pulse(strength, ms);
    } catch {
      /* haptics are best-effort; never let them crash the render loop */
    }
  };

  useFrame(() => {
    const ctrlObj = ctrlState?.object;
    if (!ctrlObj) return;
    if (!Number.isFinite(halfW) || !Number.isFinite(halfD) || !Number.isFinite(halfH)) return;

    const pos = posV.current;
    const dir = dirV.current;
    ctrlObj.getWorldPosition(pos);
    ctrlObj.getWorldDirection(dir).multiplyScalar(-1);

    raycaster.current.set(pos, dir);

    // ── While dragging: slide the held artwork along its wall ──────────────
    if (draggingRef.current) {
      const w = draggingRef.current.wallIdx;
      if (w === 0) plane.current.set(new THREE.Vector3(0, 0, 1), halfD - WALL_INSET);
      if (w === 1) plane.current.set(new THREE.Vector3(-1, 0, 0), -(halfW - WALL_INSET));
      if (w === 2) plane.current.set(new THREE.Vector3(0, 0, -1), halfD - WALL_INSET);
      if (w === 3) plane.current.set(new THREE.Vector3(1, 0, 0), -(halfW - WALL_INSET));

      if (raycaster.current.ray.intersectPlane(plane.current, hitPt.current)) {
        let x = snapToGrid(hitPt.current.x);
        let y = Math.max(-halfH + 0.5, Math.min(halfH - 0.5, snapToGrid(hitPt.current.y)));
        let z = snapToGrid(hitPt.current.z);
        x = Math.max(-halfW + WALL_INSET + 0.2, Math.min(halfW - WALL_INSET - 0.2, x));
        z = Math.max(-halfD + WALL_INSET + 0.2, Math.min(halfD - WALL_INSET - 0.2, z));

        // Guard: never let a NaN/Infinity reach three.js — a single bad matrix
        // value blanks the entire canvas (and in a headset that reads as the
        // gallery "going black").
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
          const last = lastEmitRef.current;
          // Only push when the snapped target actually changed — saves ~90 React
          // re-renders/sec while the artwork is held, which is the edit-mode lag.
          if (!last || last.x !== x || last.y !== y || last.z !== z || last.w !== w) {
            lastEmitRef.current = { x, y, z, w };
            onArtworkMoved(draggingRef.current.artworkId, {
              xPosition: x, yPosition: y, zPosition: z,
              rotation: WALL_ROTATIONS[w], isManuallyPlaced: true,
            });
          }
        }
      }
    }

    // ── Hit-test for artworks + UI buttons (refresh cache periodically) ────
    if (frameCountRef.current % 20 === 0) {
      const roots: THREE.Object3D[] = [];
      scene.traverse((o) => {
        if (o.userData.artworkId !== undefined || typeof o.userData.onVRSelect === "function") {
          roots.push(o);
        }
      });
      interactiveRootsRef.current = roots;
    }
    frameCountRef.current++;

    let hitArtworkId: number | null = null;
    let hitPoint: THREE.Vector3 | null = null;
    let hitUISelect: (() => void) | null = null;

    if (!draggingRef.current) {
      const intersects = raycaster.current.intersectObjects(interactiveRootsRef.current, true);
      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (typeof obj.userData.onVRSelect === "function") {
            hitUISelect = obj.userData.onVRSelect as () => void;
            break;
          }
          if (obj.userData.artworkId !== undefined) {
            hitArtworkId = obj.userData.artworkId as number;
            hitPoint = hit.point.clone();
            break;
          }
          obj = obj.parent;
        }
        if (hitArtworkId !== null || hitUISelect !== null) break;
      }
    }

    // ── Trigger rising-edge ────────────────────────────────────────────────
    const triggerPressed = ctrlState?.gamepad?.["xr-standard-trigger"]?.state === "pressed";
    if (triggerPressed && !prevTriggerRef.current && !suppressRef?.current) {
      try {
        if (draggingRef.current) {
          // Drop & commit
          draggingRef.current = null;
          lastEmitRef.current = null;
          onDrop?.();
          pulse(0.5, 60);
        } else if (hitUISelect) {
          hitUISelect();
          pulse(0.6, 70);
        } else if (hitArtworkId !== null && hitPoint) {
          // Pick up — anchor to the nearest wall of the hit point
          const wallIdx = getNearestWallPlane(hitPoint, halfW, halfD);
          draggingRef.current = { artworkId: hitArtworkId, wallIdx };
          lastEmitRef.current = null;
          onArtworkSelected?.(hitArtworkId);
          pulse(0.7, 80);
        } else {
          onArtworkSelected?.(null);
        }
      } catch {
        // A stray interaction error must never tear down the XR canvas. Reconcile
        // parent UI state (e.g. isEditDragging) so the panel doesn't get stuck.
        const wasDragging = draggingRef.current !== null;
        draggingRef.current = null;
        lastEmitRef.current = null;
        if (wasDragging) onDrop?.();
        onArtworkSelected?.(null);
      }
    }
    prevTriggerRef.current = triggerPressed;
  });

  return null;
}

// ─── 3D edit-control panel (floating, billboarded) ─────────────────────────────
interface VREditButtonProps {
  position: [number, number, number];
  width?: number;
  height?: number;
  label: string;
  color?: string;
  enabled?: boolean;
  onSelect: () => void;
}

// Ray-pickable button. Selection is handled by XRVREditController's invisible
// raycaster via userData.onVRSelect, so the label only needs to render — and it
// renders as a CanvasTexture (not drei <Text>), which is the only text that
// shows reliably inside a WebXR session.
function VREditButton({ position, width = 0.46, height = 0.16, label, color = "#f5c060", enabled = true, onSelect }: VREditButtonProps) {
  const texture = useMemo(() => {
    const W = 512;
    const H = Math.round((height / width) * W);
    return makeCanvasTexture(W, H, (ctx) => {
      ctx.clearRect(0, 0, W, H);
      const pad = 6;
      const radius = Math.min(H, W) * 0.22;
      ctx.fillStyle = enabled ? hexA(color, 0.22) : hexA(color, 0.05);
      roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, radius);
      ctx.fill();
      ctx.strokeStyle = enabled ? color : hexA(color, 0.25);
      ctx.lineWidth = 4;
      roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, radius);
      ctx.stroke();
      ctx.fillStyle = enabled ? "#ffffff" : "rgba(255,255,255,0.3)";
      ctx.font = `700 ${Math.round(H * 0.4)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, W / 2, H / 2 + H * 0.02);
    });
  }, [label, color, enabled, width, height]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group position={position} userData={enabled ? { onVRSelect: onSelect } : {}}>
      <mesh renderOrder={1003}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

interface VREditPanelProps {
  isDirty: boolean;
  isSaving: boolean;
  isDragging: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExit: () => void;
}

/**
 * Floating in-scene control panel for VR edit mode. Anchored in front of the
 * user when edit mode opens and billboarded (yaw only) so it stays readable.
 */
export function VREditPanel({
  isDirty, isSaving, isDragging, canUndo, canRedo, onSave, onUndo, onRedo, onExit,
}: VREditPanelProps) {
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const anchor = useRef(new THREE.Vector3());
  const anchored = useRef(false);
  const camPos = useRef(new THREE.Vector3());
  const fwd = useRef(new THREE.Vector3());

  const PANEL_W = 0.64;
  const PANEL_H = 0.86;

  const backingTex = useMemo(() => {
    const W = 512;
    const H = Math.round((PANEL_H / PANEL_W) * W);
    return makeCanvasTexture(W, H, (ctx) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(13,11,9,0.96)";
      roundRect(ctx, 0, 0, W, H, 22);
      ctx.fill();
      ctx.strokeStyle = hexA("#f5c060", 0.5);
      ctx.lineWidth = 4;
      roundRect(ctx, 3, 3, W - 6, H - 6, 20);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = "#f5c060";
      ctx.font = "700 40px 'Playfair Display', Georgia, serif";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("EDIT MODE", W / 2, 64);

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "400 22px 'Plus Jakarta Sans', system-ui, sans-serif";
      ctx.fillText(isDragging ? "Aim & pull trigger to drop" : "Point at art · trigger to grab", W / 2, 100);
    });
  }, [isDragging, PANEL_W, PANEL_H]);

  useEffect(() => () => backingTex.dispose(), [backingTex]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    // Use the LIVE XR camera world transform — useThree().camera holds only the
    // head's local offset within the rig in @react-three/xr v6, so anchoring off
    // its .position would place the panel near the rig origin, far from the user.
    const cam = gl.xr.isPresenting ? (gl.xr.getCamera() as unknown as THREE.Camera) : camera;
    cam.getWorldPosition(camPos.current);

    // Anchor once, on the first frame the camera pose is available, slightly to
    // the side and below eye level so it doesn't block the artwork being edited.
    if (!anchored.current) {
      cam.getWorldDirection(fwd.current);
      fwd.current.y = 0;
      // If the user is looking straight up/down at entry, the horizontal
      // forward collapses to ~0. Fall back to a default forward so the panel
      // still anchors in reach instead of getting stuck at the world origin.
      if (fwd.current.lengthSq() < 1e-6) fwd.current.set(0, 0, -1);
      fwd.current.normalize();
      const rx = fwd.current.z;
      const rz = -fwd.current.x;
      anchor.current
        .copy(camPos.current)
        .addScaledVector(fwd.current, 1.5);
      anchor.current.x += rx * 0.55;
      anchor.current.z += rz * 0.55;
      anchor.current.y = camPos.current.y - 0.45;
      anchored.current = true;
    }

    g.position.copy(anchor.current);
    const dx = camPos.current.x - anchor.current.x;
    const dz = camPos.current.z - anchor.current.z;
    g.rotation.set(0, Math.atan2(dx, dz), 0);
  });

  return (
    <group ref={groupRef} renderOrder={1000}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial map={backingTex} transparent toneMapped={false} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
      </mesh>

      <VREditButton position={[0, 0.13, 0.002]} width={0.5}
        label={isSaving ? "SAVING…" : isDirty ? "SAVE *" : "SAVE"}
        enabled={isDirty && !isSaving} onSelect={onSave} />
      <VREditButton position={[-0.135, -0.05, 0.002]} width={0.24} label="UNDO" enabled={canUndo} onSelect={onUndo} />
      <VREditButton position={[0.135, -0.05, 0.002]} width={0.24} label="REDO" enabled={canRedo} onSelect={onRedo} />
      <VREditButton position={[0, -0.25, 0.002]} width={0.5} label="EXIT EDIT" color="#e5777a" onSelect={onExit} />
    </group>
  );
}
