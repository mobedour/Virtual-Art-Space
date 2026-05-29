import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import type { ArtworkData } from "./ArtworkFrame";
import { getNearestWallPlane, snapToGrid } from "./GalleryEditMode";

const WALL_INSET = 0.12;
const WALL_ROTATIONS = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

interface XRVREditControllerProps {
  halfW: number;
  halfD: number;
  halfH: number;
  onArtworkMoved: (id: number, patch: Partial<ArtworkData>) => void;
  onDrop?: () => void;
  onArtworkSelected?: (id: number | null) => void;
  accentColor?: string;
  // While teleport mode owns the right trigger, suppress grab/drop/UI handling
  // so a single trigger press doesn't both teleport and act on an artwork.
  suppressRef?: React.RefObject<boolean>;
}

/**
 * VR edit interaction, driven by the RIGHT controller.
 *
 * This is the in-headset equivalent of EditDragController (which is mouse /
 * pointer-lock based and therefore useless in VR). One ray drives everything:
 *  - Point at an artwork + press trigger → pick it up.
 *  - While held, the artwork follows the ray along its wall (snapped to grid).
 *  - Press trigger again → drop & commit to undo history.
 *  - Point at a 3D edit-panel button + press trigger → activate it.
 *
 * It draws its own ray and owns the right-hand trigger, so the normal
 * XRControllerRay must NOT be mounted on the right hand while editing.
 */
export function XRVREditController({
  halfW,
  halfD,
  halfH,
  onArtworkMoved,
  onDrop,
  onArtworkSelected,
  accentColor = "#f5c060",
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
  const endV = useRef(new THREE.Vector3());
  const interactiveRootsRef = useRef<THREE.Object3D[]>([]);
  const frameCountRef = useRef(0);

  const { posAttr, line } = useMemo(() => {
    const positions = new Float32Array(6);
    const posAttr = new THREE.BufferAttribute(positions, 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", posAttr);
    const material = new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.85 });
    const l = new THREE.Line(geometry, material);
    l.frustumCulled = false;
    return { posAttr, line: l };
  }, [accentColor]);

  useEffect(() => {
    scene.add(line);
    return () => {
      scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    };
  }, [scene, line]);

  const pulse = (strength: number, ms: number) => {
    const ha = ctrlState?.inputSource?.gamepad?.hapticActuators?.[0];
    if (ha && "pulse" in ha) (ha as any).pulse(strength, ms);
  };

  useFrame(() => {
    const ctrlObj = ctrlState?.object;
    if (!ctrlObj) {
      const arr = posAttr.array as Float32Array;
      arr.fill(0);
      posAttr.needsUpdate = true;
      return;
    }

    const pos = posV.current;
    const dir = dirV.current;
    ctrlObj.getWorldPosition(pos);
    ctrlObj.getWorldDirection(dir).multiplyScalar(-1);

    raycaster.current.set(pos, dir);

    let hitDist = 10;

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
        onArtworkMoved(draggingRef.current.artworkId, {
          xPosition: x, yPosition: y, zPosition: z,
          rotation: WALL_ROTATIONS[w], isManuallyPlaced: true,
        });
        hitDist = pos.distanceTo(hitPt.current);
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
            hitDist = Math.min(hit.distance, 10);
            break;
          }
          if (obj.userData.artworkId !== undefined) {
            hitArtworkId = obj.userData.artworkId as number;
            hitPoint = hit.point.clone();
            hitDist = Math.min(hit.distance, 10);
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
      if (draggingRef.current) {
        // Drop & commit
        draggingRef.current = null;
        onDrop?.();
        pulse(0.5, 60);
      } else if (hitUISelect) {
        hitUISelect();
        pulse(0.6, 70);
      } else if (hitArtworkId !== null && hitPoint) {
        // Pick up — anchor to the nearest wall of the hit point
        const wallIdx = getNearestWallPlane(hitPoint, halfW, halfD);
        draggingRef.current = { artworkId: hitArtworkId, wallIdx };
        onArtworkSelected?.(hitArtworkId);
        pulse(0.7, 80);
      } else {
        onArtworkSelected?.(null);
      }
    }
    prevTriggerRef.current = triggerPressed;

    // ── Update ray geometry ────────────────────────────────────────────────
    const end = endV.current.copy(pos).addScaledVector(dir, hitDist);
    const arr = posAttr.array as Float32Array;
    arr[0] = pos.x; arr[1] = pos.y; arr[2] = pos.z;
    arr[3] = end.x; arr[4] = end.y; arr[5] = end.z;
    posAttr.needsUpdate = true;
  });

  return null;
}

// ─── 3D edit-control panel (floating, billboarded) ─────────────────────────────
interface VREditButtonProps {
  position: [number, number, number];
  width?: number;
  label: string;
  color?: string;
  enabled?: boolean;
  onSelect: () => void;
}

function VREditButton({ position, width = 0.46, label, color = "#f5c060", enabled = true, onSelect }: VREditButtonProps) {
  const h = 0.16;
  return (
    <group position={position} userData={enabled ? { onVRSelect: onSelect } : {}}>
      <mesh>
        <planeGeometry args={[width, h]} />
        <meshBasicMaterial color={color} transparent opacity={enabled ? 0.2 : 0.05} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, h)]} />
        <lineBasicMaterial color={color} transparent opacity={enabled ? 0.6 : 0.2} />
      </lineSegments>
      <Text position={[0, 0, 0.002]} fontSize={0.05} color={color} fillOpacity={enabled ? 1 : 0.3} anchorX="center" anchorY="middle">
        {label}
      </Text>
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
        <planeGeometry args={[0.64, 0.86]} />
        <meshBasicMaterial color="#0d0b09" transparent opacity={0.94} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(0.64, 0.86)]} />
        <lineBasicMaterial color="#f5c060" transparent opacity={0.5} />
      </lineSegments>

      <Text position={[0, 0.36, 0.002]} fontSize={0.045} color="#f5c060" anchorX="center" anchorY="middle" letterSpacing={0.15}>
        EDIT MODE
      </Text>
      <Text position={[0, 0.27, 0.002]} fontSize={0.028} color="#ffffff" fillOpacity={0.55} anchorX="center" anchorY="middle" maxWidth={0.58} textAlign="center">
        {isDragging ? "Aim & pull trigger to drop" : "Point at art · trigger to grab"}
      </Text>

      <VREditButton position={[0, 0.13, 0.002]} width={0.5}
        label={isSaving ? "SAVING…" : isDirty ? "SAVE *" : "SAVE"}
        enabled={isDirty && !isSaving} onSelect={onSave} />
      <VREditButton position={[-0.135, -0.05, 0.002]} width={0.24} label="UNDO" enabled={canUndo} onSelect={onUndo} />
      <VREditButton position={[0.135, -0.05, 0.002]} width={0.24} label="REDO" enabled={canRedo} onSelect={onRedo} />
      <VREditButton position={[0, -0.25, 0.002]} width={0.5} label="EXIT EDIT" color="#e5777a" onSelect={onExit} />
    </group>
  );
}
