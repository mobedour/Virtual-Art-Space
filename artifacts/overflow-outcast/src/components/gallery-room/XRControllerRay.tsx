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
}

export function XRControllerRay({
  handedness = "right",
  onArtworkSelect,
  accentColor = "#f5c060",
}: XRControllerRayProps) {
  const { scene } = useThree();
  const lastHoverIdRef = useRef<number | null>(null);
  const prevTriggerRef = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());

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
    return () => { scene.remove(line); };
  }, [scene, line]);

  const ctrlState = useXRInputSourceState("controller", handedness);

  useFrame(() => {
    const inputSource = ctrlState?.inputSource;
    if (!inputSource) {
      // Hide ray when controller not active
      const arr = posAttr.array as Float32Array;
      arr.fill(0);
      posAttr.needsUpdate = true;
      return;
    }

    const ctrlObj =
      scene.getObjectByName(`xr-controller-${handedness}`) ??
      scene.getObjectByProperty("userData.xrControllerHandedness", handedness);

    const pos = new THREE.Vector3(handedness === "right" ? 0.2 : -0.2, 1.4, -0.3);
    const dir = new THREE.Vector3(0, -0.1, -1).normalize();

    if (ctrlObj) {
      ctrlObj.getWorldPosition(pos);
      ctrlObj.getWorldDirection(dir);
    }

    raycaster.current.set(pos, dir);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    let hitDist = 10;
    let hitArtworkId: number | null = null;
    let hitArtwork: ArtworkData | null = null;

    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.artworkId !== undefined) {
          hitDist = Math.min(hit.distance, 10);
          hitArtworkId = obj.userData.artworkId as number;
          hitArtwork = obj.userData.artworkData as ArtworkData ?? null;
          break;
        }
        obj = obj.parent;
      }
      if (hitArtworkId !== null) break;
    }

    // Hover haptic feedback (right hand only, on enter)
    if (hitArtworkId !== lastHoverIdRef.current) {
      lastHoverIdRef.current = hitArtworkId;
      if (hitArtworkId !== null && handedness === "right") {
        const gp = inputSource.gamepad;
        const ha = gp?.hapticActuators?.[0];
        if (ha && "pulse" in ha) (ha as any).pulse(0.25, 35);
      }
    }

    // Trigger rising-edge → select artwork (right hand, artwork in crosshairs)
    const triggerPressed = inputSource.gamepad?.buttons?.[0]?.pressed ?? false;
    if (triggerPressed && !prevTriggerRef.current && hitArtworkId !== null && handedness === "right") {
      onArtworkSelect?.(hitArtworkId);
      // Stronger haptic on select
      const ha = inputSource.gamepad?.hapticActuators?.[0];
      if (ha && "pulse" in ha) (ha as any).pulse(0.6, 80);
    }
    prevTriggerRef.current = triggerPressed;

    // Update ray geometry
    const end = pos.clone().addScaledVector(dir, hitDist);
    const arr = posAttr.array as Float32Array;
    arr[0] = pos.x; arr[1] = pos.y; arr[2] = pos.z;
    arr[3] = end.x; arr[4] = end.y; arr[5] = end.z;
    posAttr.needsUpdate = true;
  });

  return null;
}
