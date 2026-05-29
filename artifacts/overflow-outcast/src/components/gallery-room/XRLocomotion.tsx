import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRControllerLocomotion, useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";

interface XRLocomotionProps {
  halfW: number;
  halfD: number;
  // Ref to the XROrigin group (player rig). Locomotion translates this
  // rig instead of the camera, since the camera pose is owned by the
  // headset and writing to it directly has no effect.
  xrOriginRef: React.RefObject<THREE.Group | null>;
  // Shared flag mirroring teleport-aim mode. While true, the right trigger is
  // owned by teleport, so the ray / edit controllers suppress their own
  // trigger handling to avoid double-firing (teleport + select in one press).
  teleportActiveRef?: React.MutableRefObject<boolean>;
  // Shortcut to leave VR / the gallery — bound to the left controller's
  // secondary (upper) button so it can't be hit by accident during play.
  onExitGallery?: () => void;
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

// ─── Teleport arc (cast from right controller) ────────────────────────────────
function TeleportArc({
  halfW, halfD, visible, targetRef, originObj,
}: {
  halfW: number; halfD: number; visible: boolean;
  targetRef: React.MutableRefObject<THREE.Vector3 | null>;
  originObj: THREE.Object3D | null;
}) {
  const { scene } = useThree();
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

    if (!visible || !originObj) {
      marker.visible = false;
      geoRef.current.setDrawRange(0, 0);
      targetRef.current = null;
      return;
    }

    // Cast from the right controller, aimed along its forward (-Z local).
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    originObj.getWorldPosition(origin);
    // `getWorldDirection` returns the object's local +Z axis in world space,
    // but WebXR controllers (like cameras) point down −Z. Negate so the arc
    // fires out the front of the controller, not into the user's wrist.
    originObj.getWorldDirection(dir).multiplyScalar(-1);

    const vel = dir.clone().multiplyScalar(8);
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
export function XRLocomotion({ halfW, halfD, xrOriginRef, teleportActiveRef, onExitGallery }: XRLocomotionProps) {
  const { camera } = useThree();
  const vrVignette = localStorage.getItem("vas_vrVignette") !== "false";

  const [teleportVisible, setTeleportVisible] = useState(false);
  const internalTeleportRef = useRef(false);
  // Use the shared ref when provided so other VR systems can observe teleport
  // mode; fall back to a local ref otherwise.
  const teleportModeRef = teleportActiveRef ?? internalTeleportRef;
  const targetRef = useRef<THREE.Vector3 | null>(null);
  const vignetteIntensity = useRef(0);
  const prevSqueezeRef = useRef(false);
  const prevTriggerRef = useRef(false);
  const prevExitRef = useRef(false);
  const prevOriginXZ = useRef(new THREE.Vector2(0, 0));

  const rightCtrl = useXRInputSourceState("controller", "right");
  const leftCtrl = useXRInputSourceState("controller", "left");

  // Smooth locomotion — translate the player rig (XROrigin), not the camera.
  // Writing camera.position in WebXR has no effect because the headset pose
  // overwrites the camera every frame.
  useXRControllerLocomotion(
    xrOriginRef,
    { speed: 5.5 },
    { type: "snap", degrees: 45 },
    "left",
  );

  // Per-frame: clamp the player rig to the room, drive the vignette from
  // motion delta, and poll the right controller for teleport input.
  useFrame((_, delta) => {
    const origin = xrOriginRef.current;
    if (origin) {
      // Clamp the rig so the player can't walk through walls. The headset
      // contributes a small extra offset (room-scale), so leave 0.6 slack.
      origin.position.x = Math.max(-(halfW - 0.6), Math.min(halfW - 0.6, origin.position.x));
      origin.position.z = Math.max(-(halfD - 0.6), Math.min(halfD - 0.6, origin.position.z));

      // Vignette tracks rig translation speed (snap turns / headset look
      // shouldn't trigger it).
      const dx = origin.position.x - prevOriginXZ.current.x;
      const dz = origin.position.z - prevOriginXZ.current.y;
      const moved = Math.hypot(dx, dz) / Math.max(delta, 0.0001);
      prevOriginXZ.current.set(origin.position.x, origin.position.z);
      if (!teleportModeRef.current) {
        vignetteIntensity.current = THREE.MathUtils.lerp(
          vignetteIntensity.current, Math.min(1, moved / 5), 0.2,
        );
      }
    }

    // Left controller secondary (upper) button → exit the gallery / VR. Try the
    // known cross-vendor ids for the upper face button so it works on Quest
    // ("y-button"), Index / WMR ("b-button"), etc.
    const lg = leftCtrl?.gamepad;
    const exitPressed =
      lg?.["y-button"]?.state === "pressed" ||
      lg?.["b-button"]?.state === "pressed" ||
      lg?.["secondary-button"]?.state === "pressed";
    if (exitPressed && !prevExitRef.current) {
      onExitGallery?.();
    }
    prevExitRef.current = exitPressed;

    // Right controller gamepad — use the parsed component state (cross-vendor
    // safe) instead of raw button indices.
    const gp = rightCtrl?.gamepad;
    const squeeze = gp?.["xr-standard-squeeze"]?.state === "pressed";
    const trigger = gp?.["xr-standard-trigger"]?.state === "pressed";

    if (squeeze && !prevSqueezeRef.current) {
      const next = !teleportModeRef.current;
      teleportModeRef.current = next;
      setTeleportVisible(next);
      if (!next) targetRef.current = null;
    }
    prevSqueezeRef.current = squeeze;

    if (trigger && !prevTriggerRef.current && teleportModeRef.current) {
      if (targetRef.current && origin) {
        // In @react-three/xr v6 the XR camera is added as a child of XROrigin,
        // so `camera.position` is the headset's local offset within the rig.
        // To land the player's head at the world-space target we want
        //   camera_world = origin_world + camera_local = target
        // → origin.position = target − camera.position (assignment, not +=).
        origin.position.x = targetRef.current.x - camera.position.x;
        origin.position.z = targetRef.current.z - camera.position.z;
        origin.position.x = Math.max(-(halfW - 0.6), Math.min(halfW - 0.6, origin.position.x));
        origin.position.z = Math.max(-(halfD - 0.6), Math.min(halfD - 0.6, origin.position.z));
      }
      teleportModeRef.current = false;
      setTeleportVisible(false);
      targetRef.current = null;
    }
    prevTriggerRef.current = trigger;
  });

  return (
    <>
      {vrVignette && <VRVignette intensityRef={vignetteIntensity} />}
      <TeleportArc
        halfW={halfW}
        halfD={halfD}
        visible={teleportVisible}
        targetRef={targetRef}
        originObj={rightCtrl?.object ?? null}
      />
    </>
  );
}
