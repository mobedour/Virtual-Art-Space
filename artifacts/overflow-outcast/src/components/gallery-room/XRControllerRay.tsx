import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import type { ArtworkData } from "./ArtworkFrame";

export interface XRControllerRayProps {
  handedness?: "left" | "right";
  onArtworkHover?: (artwork: ArtworkData | null) => void;
  onArtworkSelect?: (id: number) => void;
  onTriggerHoldChange?: (held: boolean) => void;
  accentColor?: string;
  suppressRef?: React.RefObject<boolean>;
  enableGaze?: boolean;
  selectionPaused?: boolean;
}

// Refresh the cached artwork root list every N frames.
const ARTWORK_CACHE_REFRESH_FRAMES = 3;

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
  const posV = useRef(new THREE.Vector3());
  const dirV = useRef(new THREE.Vector3());
  const endV = useRef(new THREE.Vector3());
  const rayQuat = useRef(new THREE.Quaternion());

  const needsHitTest = !!(onArtworkHover || onArtworkSelect);

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
    const material = new THREE.LineBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.renderOrder = 999;
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

  useEffect(() => {
    return () => {
      if (holdRef.current) {
        holdRef.current = false;
        onTriggerHoldChange?.(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_state, _delta, frame) => {
    const pos = posV.current;
    const dir = dirV.current;

    // ── Universal controller pointing via XR target ray space ────────────────
    // R3F passes the live XRFrame as the third useFrame argument — this is the
    // only reliable way to read pose data inside the frame callback. The target
    // ray space is the WebXR-standard "pointing" direction calibrated by every
    // runtime (Quest 2/3, Index, WMR, etc.).
    let gotTargetRay = false;

    const inputSource = ctrlState?.inputSource as XRInputSource | undefined;
    if (inputSource?.targetRaySpace && frame) {
      try {
        const xrFrame = frame as XRFrame;
        const refSpace = (gl.xr as any).getReferenceSpace() as XRReferenceSpace | null;
        if (refSpace) {
          const pose = xrFrame.getPose(inputSource.targetRaySpace, refSpace);
          if (pose) {
            const p = pose.transform.position;
            const o = pose.transform.orientation;
            pos.set(p.x, p.y, p.z);
            rayQuat.current.set(o.x, o.y, o.z, o.w);
            // Target ray fires along -Z of the ray space (WebXR spec)
            dir.set(0, 0, -1).applyQuaternion(rayQuat.current);
            gotTargetRay = true;
          }
        }
      } catch {
        /* fall through to grip-space fallback */
      }
    }

    // ── Fallback: grip space ─────────────────────────────────────────────────
    // THREE.Object3D.getWorldDirection() returns the object's -Z world axis,
    // which is the pointing/forward direction in Three.js convention. Do NOT
    // negate — the grip object in @react-three/xr already faces the aiming dir.
    if (!gotTargetRay) {
      const ctrlObj = ctrlState?.object;
      if (!ctrlObj) {
        const arr = posAttr.array as Float32Array;
        arr.fill(0);
        posAttr.needsUpdate = true;
        if (holdRef.current) {
          holdRef.current = false;
          onTriggerHoldChange?.(false);
        }
        return;
      }
      ctrlObj.getWorldPosition(pos);
      ctrlObj.getWorldDirection(dir);
    }

    let hitDist = 8;
    let hitArtworkId: number | null = null;
    let hitUISelect: (() => void) | null = null;

    if (needsHitTest) {
      // Refresh interactive root cache every N frames — much faster than
      // walking the whole scene each frame while still catching newly mounted
      // panels (VRMenuPanel, VRDetailPanel) within a few frames.
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
      const intersects = raycaster.current.intersectObjects(interactiveRootsRef.current, true);

      let hitGroup: THREE.Object3D | null = null;

      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (typeof obj.userData.onVRSelect === "function") {
            hitDist = Math.min(hit.distance, 8);
            hitUISelect = obj.userData.onVRSelect as () => void;
            break;
          }
          if (!selectionPaused && obj.userData.artworkId !== undefined) {
            hitDist = Math.min(hit.distance, 8);
            hitArtworkId = obj.userData.artworkId as number;
            hitGroup = obj;
            break;
          }
          obj = obj.parent;
        }
        if (hitArtworkId !== null || hitUISelect !== null) break;
      }

      // Gaze fallback
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

      const targetArtworkId = hitArtworkId ?? gazeArtworkId;

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

      // Hover haptics (right hand only, on enter)
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

      // Trigger rising-edge → activate
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

    // Trigger hold → global "reveal info" mode
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

    // Draw ray from target ray origin to hit point (or max distance)
    const end = endV.current.copy(pos).addScaledVector(dir, hitDist);
    const arr = posAttr.array as Float32Array;
    arr[0] = pos.x; arr[1] = pos.y; arr[2] = pos.z;
    arr[3] = end.x; arr[4] = end.y; arr[5] = end.z;
    posAttr.needsUpdate = true;
  });

  return null;
}
