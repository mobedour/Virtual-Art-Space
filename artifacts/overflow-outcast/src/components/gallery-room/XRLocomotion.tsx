import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRControllerLocomotion, useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";

interface XRLocomotionProps {
  halfW: number;
  halfD: number;
}

// ─── Movement vignette (billboard quad) ───────────────────────────────────────
function VRVignette({ intensityRef }: { intensityRef: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const geo = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0,
    depthTest: false, depthWrite: false, side: THREE.FrontSide,
  }), []);

  useFrame(({ camera }, delta) => {
    if (!meshRef.current) return;
    const forward = new THREE.Vector3(0, 0, -0.3).applyQuaternion(camera.quaternion);
    meshRef.current.position.copy(camera.position).add(forward);
    meshRef.current.quaternion.copy(camera.quaternion);
    if (matRef.current) {
      matRef.current.opacity = THREE.MathUtils.lerp(
        matRef.current.opacity, intensityRef.current * 0.7, 1 - Math.exp(-8 * delta)
      );
    }
  });

  return (
    <mesh ref={meshRef} geometry={geo} renderOrder={999}>
      <primitive object={mat} ref={matRef} />
    </mesh>
  );
}

// ─── Teleport arc ─────────────────────────────────────────────────────────────
function TeleportArc({
  halfW, halfD, visible, targetRef,
}: {
  halfW: number; halfD: number; visible: boolean;
  targetRef: React.MutableRefObject<THREE.Vector3 | null>;
}) {
  const { camera, scene } = useThree();
  const lineRef = useRef<THREE.Line | null>(null);
  const markerRef = useRef<THREE.Mesh | null>(null);
  const posAttr = useRef(new THREE.BufferAttribute(new Float32Array(30 * 3), 3));
  const geoRef = useRef(new THREE.BufferGeometry());

  useMemo(() => {
    geoRef.current.setAttribute("position", posAttr.current);
  }, []);

  useEffect(() => {
    const g = geoRef.current;
    const mat = new THREE.LineBasicMaterial({ color: "#f5c060", transparent: true, opacity: 0.75 });
    const line = new THREE.Line(g, mat);
    line.frustumCulled = false;
    lineRef.current = line;

    const ring = new THREE.RingGeometry(0.22, 0.32, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: "#f5c060", transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const marker = new THREE.Mesh(ring, ringMat);
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    markerRef.current = marker;

    scene.add(line);
    scene.add(marker);
    return () => {
      scene.remove(line);
      scene.remove(marker);
      mat.dispose();
      ringMat.dispose();
    };
  }, [scene]);

  useFrame(() => {
    const line = lineRef.current;
    const marker = markerRef.current;
    if (!line || !marker) return;

    if (!visible) {
      marker.visible = false;
      geoRef.current.setDrawRange(0, 0);
      targetRef.current = null;
      return;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const origin = camera.position.clone();
    const vel = forward.multiplyScalar(8);
    const gravity = new THREE.Vector3(0, -9.8, 0);
    const arr = posAttr.current.array as Float32Array;
    let count = 0;
    let landPos: THREE.Vector3 | null = null;

    for (let i = 0; i < 30; i++) {
      const t = i * 0.07;
      const pos = origin.clone()
        .addScaledVector(vel, t)
        .addScaledVector(gravity, 0.5 * t * t);
      arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y; arr[i * 3 + 2] = pos.z;
      count = i + 1;
      if (!landPos && pos.y <= -1.2) {
        landPos = new THREE.Vector3(
          Math.max(-(halfW - 0.6), Math.min(halfW - 0.6, pos.x)),
          -1.2,
          Math.max(-(halfD - 0.6), Math.min(halfD - 0.6, pos.z)),
        );
      }
    }

    posAttr.current.needsUpdate = true;
    geoRef.current.setDrawRange(0, count);
    geoRef.current.computeBoundingSphere();
    targetRef.current = landPos;

    if (landPos) {
      marker.position.set(landPos.x, -1.19, landPos.z);
      marker.visible = true;
    } else {
      marker.visible = false;
    }
  });

  return null;
}

// ─── Main locomotion component ────────────────────────────────────────────────
export function XRLocomotion({ halfW, halfD }: XRLocomotionProps) {
  const { camera } = useThree();
  const vrVignette = localStorage.getItem("vas_vrVignette") !== "false";

  const [teleportVisible, setTeleportVisible] = useState(false);
  const teleportModeRef = useRef(false);
  const targetRef = useRef<THREE.Vector3 | null>(null);
  const vignetteIntensity = useRef(0);
  const prevSqueezeRef = useRef(false);
  const prevTriggerRef = useRef(false);

  const rightCtrl = useXRInputSourceState("controller", "right");

  // Smooth locomotion — left thumbstick drives movement
  useXRControllerLocomotion(
    (velocity, _rotY, delta, state) => {
      if (teleportModeRef.current) return;
      const { camera: cam } = state;
      vignetteIntensity.current = Math.min(1, velocity.length() / 5);
      cam.position.addScaledVector(velocity, delta);
      cam.position.x = Math.max(-(halfW - 0.6), Math.min(halfW - 0.6, cam.position.x));
      cam.position.z = Math.max(-(halfD - 0.6), Math.min(halfD - 0.6, cam.position.z));
    },
    { speed: 5.5 },
    { type: "snap", degrees: 45 },
    "left",
  );

  // Poll right controller gamepad each frame:
  //   Squeeze (button 1) rising edge → toggle teleport arc
  //   Trigger (button 0) rising edge while teleport active → execute + exit
  useFrame(() => {
    const gp = rightCtrl?.inputSource?.gamepad;
    const squeeze = gp?.buttons?.[1]?.pressed ?? false;
    const trigger = gp?.buttons?.[0]?.pressed ?? false;

    if (squeeze && !prevSqueezeRef.current) {
      const next = !teleportModeRef.current;
      teleportModeRef.current = next;
      setTeleportVisible(next);
      if (!next) targetRef.current = null;
    }
    prevSqueezeRef.current = squeeze;

    if (trigger && !prevTriggerRef.current && teleportModeRef.current) {
      if (targetRef.current) {
        camera.position.x = targetRef.current.x;
        camera.position.z = targetRef.current.z;
      }
      teleportModeRef.current = false;
      setTeleportVisible(false);
      targetRef.current = null;
    }
    prevTriggerRef.current = trigger;

    if (!teleportModeRef.current) {
      vignetteIntensity.current = Math.max(0, vignetteIntensity.current - 0.02);
    }
  });

  return (
    <>
      {vrVignette && <VRVignette intensityRef={vignetteIntensity} />}
      <TeleportArc halfW={halfW} halfD={halfD} visible={teleportVisible} targetRef={targetRef} />
    </>
  );
}
