import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { JoystickState } from "./VirtualJoystick";

const EYE_Y = 0;
const LOOK_SENSITIVITY = 0.004;
const MOVE_SPEED = 7;
const TAP_MOVE_THRESHOLD = 12; // pixels — below this counts as a tap

interface TouchControlsProps {
  enabled: boolean;
  joystickRef: React.RefObject<JoystickState>;
  onArtworkTap: () => void;
  halfW: number;
  halfD: number;
}

export function TouchControls({
  enabled,
  joystickRef,
  onArtworkTap,
  halfW,
  halfD,
}: TouchControlsProps) {
  const { gl, camera } = useThree();

  // Camera look state
  const yawRef = useRef(0);
  const pitchRef = useRef(0);

  // Active look touch tracking
  const lookTouchRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);

  // Initialise yaw/pitch from the camera's starting orientation
  useEffect(() => {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    yawRef.current = euler.y;
    pitchRef.current = euler.x;
  }, [camera]);

  useEffect(() => {
    const canvas = gl.domElement;

    function onTouchStart(e: TouchEvent) {
      // Only handle new look touch if none is active
      if (lookTouchRef.current !== null) return;
      // Use the first changed touch that is NOT already on the joystick element
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const target = document.elementFromPoint(t.clientX, t.clientY);
        // Skip if the touch landed on the joystick or controller buttons overlay
        if (target && (target as HTMLElement).closest("[data-joystick], [data-controls]")) {
          continue;
        }
        lookTouchRef.current = {
          id: t.identifier,
          startX: t.clientX,
          startY: t.clientY,
          lastX: t.clientX,
          lastY: t.clientY,
          moved: false,
        };
        break;
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      if (!lookTouchRef.current) return;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier !== lookTouchRef.current.id) continue;

        const dx = t.clientX - lookTouchRef.current.lastX;
        const dy = t.clientY - lookTouchRef.current.lastY;

        const totalDx = t.clientX - lookTouchRef.current.startX;
        const totalDy = t.clientY - lookTouchRef.current.startY;
        const totalDist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
        if (totalDist > TAP_MOVE_THRESHOLD) {
          lookTouchRef.current.moved = true;
        }

        if (enabled) {
          yawRef.current -= dx * LOOK_SENSITIVITY;
          pitchRef.current -= dy * LOOK_SENSITIVITY;
          pitchRef.current = Math.max(
            -Math.PI / 2 + 0.05,
            Math.min(Math.PI / 2 - 0.05, pitchRef.current)
          );
        }

        lookTouchRef.current.lastX = t.clientX;
        lookTouchRef.current.lastY = t.clientY;
        break;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!lookTouchRef.current) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchRef.current.id) {
          if (!lookTouchRef.current.moved && enabled) {
            onArtworkTap();
          }
          lookTouchRef.current = null;
          break;
        }
      }
    }

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [gl, enabled, onArtworkTap]);

  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  useFrame(({ camera }, delta) => {
    // Apply look rotation
    euler.current.set(pitchRef.current, yawRef.current, 0, "YXZ");
    camera.quaternion.setFromEuler(euler.current);

    if (!enabled) return;

    // Apply joystick movement
    const joy = joystickRef.current;
    if (!joy || (Math.abs(joy.dx) < 0.05 && Math.abs(joy.dy) < 0.05)) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    const move = new THREE.Vector3();
    move.addScaledVector(forward, -joy.dy); // joystick up = forward (dy negative)
    move.addScaledVector(right, joy.dx); // joystick right = strafe right

    if (move.lengthSq() > 0.0001) {
      move.normalize().multiplyScalar(MOVE_SPEED * delta);
      camera.position.add(move);
      camera.position.x = Math.max(
        -(halfW - 0.6),
        Math.min(halfW - 0.6, camera.position.x)
      );
      camera.position.z = Math.max(
        -(halfD - 0.6),
        Math.min(halfD - 0.6, camera.position.z)
      );
      camera.position.y = EYE_Y;
    }
  });

  return null;
}
