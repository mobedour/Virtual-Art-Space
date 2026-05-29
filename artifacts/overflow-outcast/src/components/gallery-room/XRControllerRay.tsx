import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import type { ArtworkData } from "./ArtworkFrame";

export interface XRControllerRayProps {
  handedness?: "left" | "right";
  onArtworkHover?: (artwork: ArtworkData | null) => void;
  onArtworkSelect?: (id: number) => void;
  accentColor?: string;
  // When this ref is true, teleport mode owns the right trigger — suppress our
  // own select handling so a single trigger press doesn't both teleport and
  // select an artwork.
  suppressRef?: React.RefObject<boolean>;
}

// Refresh the cached artwork root list every N frames. Artworks rarely
// change at runtime so we don't need to walk the whole scene each frame.
const ARTWORK_CACHE_REFRESH_FRAMES = 30;

export function XRControllerRay({
  handedness = "right",
  onArtworkHover,
  onArtworkSelect,
  accentColor = "#f5c060",
  suppressRef,
}: XRControllerRayProps) {
  const { scene } = useThree();
  const lastHoverKeyRef = useRef<string | null>(null);
  const prevTriggerRef = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const interactiveRootsRef = useRef<THREE.Object3D[]>([]);
  const frameCountRef = useRef(0);

  // Whether this controller has any work to do beyond drawing its ray.
  // Left controller with no handlers becomes nearly free — we still
  // draw the ray but skip raycasting entirely.
  const needsHitTest = !!(onArtworkHover || onArtworkSelect);

  const { posAttr, line } = useMemo(() => {
    const positions = new Float32Array(6);
    const posAttr = new THREE.BufferAttribute(positions, 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", posAttr);
    const material = new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.8 });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    return { posAttr, line };
  }, [accentColor]);

  useEffect(() => {
    scene.add(line);
    return () => {
      scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    };
  }, [scene, line]);

  const ctrlState = useXRInputSourceState("controller", handedness);

  useFrame(() => {
    // ctrlState.object is the controller's tracked 3D node in the scene.
    // Earlier we looked it up by name, but @react-three/xr v6 doesn't tag
    // controllers that way — so the ray defaulted to a static spot and
    // never hit anything. Using the state object directly fixes that.
    const ctrlObj = ctrlState?.object;
    if (!ctrlObj) {
      const arr = posAttr.array as Float32Array;
      arr.fill(0);
      posAttr.needsUpdate = true;
      return;
    }

    const pos = new THREE.Vector3();
    const dir = new THREE.Vector3();
    ctrlObj.getWorldPosition(pos);
    // `getWorldDirection` returns the object's local +Z in world space.
    // WebXR controllers (like cameras) point down −Z, so negate — otherwise
    // the ray fires backward into the user's wrist and never hits artwork.
    ctrlObj.getWorldDirection(dir).multiplyScalar(-1);

    let hitDist = 10;
    let hitArtworkId: number | null = null;
    let hitUISelect: (() => void) | null = null;

    if (needsHitTest) {
      // Refresh the interactive-root cache periodically. Walking the whole
      // scene every frame was the single biggest perf cost in VR. We track
      // both artwork frames (userData.artworkId) and in-scene 3D UI buttons
      // (userData.onVRSelect — e.g. the info-panel close button) so the same
      // ray can drive both.
      if (frameCountRef.current % ARTWORK_CACHE_REFRESH_FRAMES === 0) {
        const roots: THREE.Object3D[] = [];
        scene.traverse((o) => {
          if (o.userData.artworkId !== undefined || typeof o.userData.onVRSelect === "function") {
            roots.push(o);
          }
        });
        interactiveRootsRef.current = roots;
      }
      frameCountRef.current++;

      raycaster.current.set(pos, dir);
      // Recurse only into the small interactive subtree, not the whole scene
      // (walls, floor, decor props, lights, etc. are all skipped).
      const intersects = raycaster.current.intersectObjects(interactiveRootsRef.current, true);

      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (typeof obj.userData.onVRSelect === "function") {
            hitDist = Math.min(hit.distance, 10);
            hitUISelect = obj.userData.onVRSelect as () => void;
            break;
          }
          if (obj.userData.artworkId !== undefined) {
            hitDist = Math.min(hit.distance, 10);
            hitArtworkId = obj.userData.artworkId as number;
            break;
          }
          obj = obj.parent;
        }
        if (hitArtworkId !== null || hitUISelect !== null) break;
      }

      // Hover haptic feedback (right hand only, on enter)
      const hoverKey = hitUISelect ? "ui" : hitArtworkId !== null ? `art:${hitArtworkId}` : null;
      if (hoverKey !== lastHoverKeyRef.current) {
        lastHoverKeyRef.current = hoverKey;
        if (hoverKey !== null && handedness === "right") {
          const ha = ctrlState?.inputSource?.gamepad?.hapticActuators?.[0];
          if (ha && "pulse" in ha) (ha as any).pulse(0.25, 35);
        }
      }

      // Trigger rising-edge → activate (right hand only). A 3D UI button
      // (close, save, …) takes priority over selecting an artwork behind it.
      // Use the parsed component state instead of raw gamepad indices —
      // Quest / Index / WMR all expose the trigger under this id.
      const triggerPressed =
        ctrlState?.gamepad?.["xr-standard-trigger"]?.state === "pressed";
      if (triggerPressed && !prevTriggerRef.current && handedness === "right" && !suppressRef?.current) {
        if (hitUISelect) {
          hitUISelect();
          const ha = ctrlState?.inputSource?.gamepad?.hapticActuators?.[0];
          if (ha && "pulse" in ha) (ha as any).pulse(0.6, 80);
        } else if (hitArtworkId !== null) {
          onArtworkSelect?.(hitArtworkId);
          const ha = ctrlState?.inputSource?.gamepad?.hapticActuators?.[0];
          if (ha && "pulse" in ha) (ha as any).pulse(0.6, 80);
        }
      }
      prevTriggerRef.current = triggerPressed;
    }

    // Update ray geometry
    const end = pos.clone().addScaledVector(dir, hitDist);
    const arr = posAttr.array as Float32Array;
    arr[0] = pos.x; arr[1] = pos.y; arr[2] = pos.z;
    arr[3] = end.x; arr[4] = end.y; arr[5] = end.z;
    posAttr.needsUpdate = true;
  });

  return null;
}
