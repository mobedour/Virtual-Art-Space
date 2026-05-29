import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import type { ArtworkData } from "./ArtworkFrame";

export interface XRControllerRayProps {
  handedness?: "left" | "right";
  onArtworkHover?: (artwork: ArtworkData | null) => void;
  onArtworkSelect?: (id: number) => void;
  // Reports the right-hand trigger hold state (pressed → true, released →
  // false). Drives the VR "hold to reveal info on every artwork frame" mode.
  // Suppressed while teleport mode owns the trigger (suppressRef).
  onTriggerHoldChange?: (held: boolean) => void;
  accentColor?: string;
  // When this ref is true, teleport mode owns the right trigger — suppress our
  // own select handling so a single trigger press doesn't both teleport and
  // select an artwork.
  suppressRef?: React.RefObject<boolean>;
  // When true, fall back to head-gaze targeting whenever the controller ray
  // isn't pointing at an artwork: whatever artwork the user is looking at gets
  // highlighted and can be selected with the trigger. "Both" mode — controller
  // when aiming, gaze when not.
  enableGaze?: boolean;
  // When true, artwork targeting/highlight/selection is paused (e.g. while the
  // detail panel is open) so the user can only press the panel's EXIT button to
  // return to roaming, rather than re-selecting artworks behind it. In-scene UI
  // buttons (userData.onVRSelect) stay interactive.
  selectionPaused?: boolean;
}

// Refresh the cached artwork root list every N frames. Artworks rarely
// change at runtime so we don't need to walk the whole scene each frame.
const ARTWORK_CACHE_REFRESH_FRAMES = 30;

export function XRControllerRay({
  handedness = "right",
  onArtworkHover,
  onArtworkSelect,
  onTriggerHoldChange,
  accentColor = "#f5c060",
  suppressRef,
  enableGaze = false,
  selectionPaused = false,
}: XRControllerRayProps) {
  const { scene, camera, gl } = useThree();
  const lastHoverKeyRef = useRef<string | null>(null);
  const prevTriggerRef = useRef(false);
  const holdRef = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());
  const interactiveRootsRef = useRef<THREE.Object3D[]>([]);
  const frameCountRef = useRef(0);
  const box3 = useRef(new THREE.Box3());
  const gazePos = useRef(new THREE.Vector3());
  const gazeQuat = useRef(new THREE.Quaternion());
  const gazeDir = useRef(new THREE.Vector3());
  // Reused per-frame temporaries — avoid allocating new vectors every frame.
  const posV = useRef(new THREE.Vector3());
  const dirV = useRef(new THREE.Vector3());
  const endV = useRef(new THREE.Vector3());

  // Whether this controller has any work to do beyond drawing its ray.
  // Left controller with no handlers becomes nearly free — we still
  // draw the ray but skip raycasting entirely.
  const needsHitTest = !!(onArtworkHover || onArtworkSelect);

  // Amber wireframe box drawn around the currently targeted artwork (whether
  // aimed at by the controller or looked at via gaze) so the user can always
  // see what they're about to select. Built once and repositioned per frame.
  const highlight = useMemo(() => {
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(boxGeo);
    boxGeo.dispose();
    const mat = new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.95 });
    const seg = new THREE.LineSegments(edges, mat);
    seg.frustumCulled = false;
    seg.visible = false;
    seg.renderOrder = 998;
    return seg;
  }, [accentColor]);

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
    if (needsHitTest) scene.add(highlight);
    return () => {
      scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
      scene.remove(highlight);
      highlight.geometry.dispose();
      (highlight.material as THREE.Material).dispose();
    };
  }, [scene, line, highlight, needsHitTest]);

  const ctrlState = useXRInputSourceState("controller", handedness);

  // On unmount (e.g. XR session ends), force release so a held trigger doesn't
  // leave the info-reveal mode latched on for the next session.
  useEffect(() => {
    return () => {
      if (holdRef.current) {
        holdRef.current = false;
        onTriggerHoldChange?.(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Controller lost tracking while a hold was active → report release so
      // the info overlays don't get stuck on.
      if (holdRef.current) {
        holdRef.current = false;
        onTriggerHoldChange?.(false);
      }
      return;
    }

    const pos = posV.current;
    const dir = dirV.current;
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

      // The frame group (the object carrying userData.artworkId) of whatever
      // we're targeting — used to draw the highlight box around it.
      let hitGroup: THREE.Object3D | null = null;

      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (typeof obj.userData.onVRSelect === "function") {
            hitDist = Math.min(hit.distance, 10);
            hitUISelect = obj.userData.onVRSelect as () => void;
            break;
          }
          if (!selectionPaused && obj.userData.artworkId !== undefined) {
            hitDist = Math.min(hit.distance, 10);
            hitArtworkId = obj.userData.artworkId as number;
            hitGroup = obj;
            break;
          }
          obj = obj.parent;
        }
        if (hitArtworkId !== null || hitUISelect !== null) break;
      }

      // Gaze fallback: when the controller isn't pointing at anything
      // interactive, target whatever artwork the headset is looking at. This is
      // the "gaze when I'm not pointing" half of the Both selection mode. Gaze
      // only targets artworks (never UI buttons), so a user can't accidentally
      // trigger a button just by looking near it.
      let gazeArtworkId: number | null = null;
      if (enableGaze && !selectionPaused && hitArtworkId === null && hitUISelect === null) {
        const cam = gl.xr.isPresenting ? (gl.xr.getCamera() as unknown as THREE.Camera) : camera;
        cam.getWorldPosition(gazePos.current);
        cam.getWorldQuaternion(gazeQuat.current);
        gazeDir.current.set(0, 0, -1).applyQuaternion(gazeQuat.current);
        raycaster.current.set(gazePos.current, gazeDir.current);
        const gazeHits = raycaster.current.intersectObjects(interactiveRootsRef.current, true);
        for (const hit of gazeHits) {
          let obj: THREE.Object3D | null = hit.object;
          while (obj) {
            if (obj.userData.artworkId !== undefined) {
              gazeArtworkId = obj.userData.artworkId as number;
              hitGroup = obj;
              break;
            }
            obj = obj.parent;
          }
          if (gazeArtworkId !== null) break;
        }
      }

      // What a trigger press would activate / what we highlight.
      const targetArtworkId = hitArtworkId ?? gazeArtworkId;

      // Position the highlight box around the targeted artwork frame.
      if (hitGroup && targetArtworkId !== null) {
        box3.current.setFromObject(hitGroup);
        if (!box3.current.isEmpty()) {
          box3.current.getCenter(highlight.position);
          box3.current.getSize(highlight.scale);
          highlight.scale.multiplyScalar(1.05);
          highlight.scale.z = Math.max(highlight.scale.z, 0.08);
          highlight.visible = true;
        } else {
          highlight.visible = false;
        }
      } else {
        highlight.visible = false;
      }

      // Hover haptic feedback (right hand only, on enter)
      const hoverKey = hitUISelect
        ? "ui"
        : targetArtworkId !== null
          ? `art:${targetArtworkId}`
          : null;
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
        } else if (targetArtworkId !== null) {
          onArtworkSelect?.(targetArtworkId);
          const ha = ctrlState?.inputSource?.gamepad?.hapticActuators?.[0];
          if (ha && "pulse" in ha) (ha as any).pulse(0.6, 80);
        }
      }
      prevTriggerRef.current = triggerPressed;
    }

    // Trigger hold → global "reveal info on every artwork frame" mode (VR).
    // Independent of hit-testing so it works even when this ray does no
    // targeting. While teleport mode owns the trigger (suppressRef) we report
    // not-held so a teleport confirm doesn't also flash the info overlays.
    if (handedness === "right" && onTriggerHoldChange) {
      const held =
        ctrlState?.gamepad?.["xr-standard-trigger"]?.state === "pressed" &&
        !suppressRef?.current;
      if (held !== holdRef.current) {
        holdRef.current = held;
        onTriggerHoldChange(held);
        if (held) {
          const ha = ctrlState?.inputSource?.gamepad?.hapticActuators?.[0];
          if (ha && "pulse" in ha) (ha as any).pulse(0.4, 50);
        }
      }
    }

    // Update ray geometry
    const end = endV.current.copy(pos).addScaledVector(dir, hitDist);
    const arr = posAttr.array as Float32Array;
    arr[0] = pos.x; arr[1] = pos.y; arr[2] = pos.z;
    arr[3] = end.x; arr[4] = end.y; arr[5] = end.z;
    posAttr.needsUpdate = true;
  });

  return null;
}
