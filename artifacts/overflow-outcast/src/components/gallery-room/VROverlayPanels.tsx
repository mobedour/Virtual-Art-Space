import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { ArtworkData } from "./ArtworkFrame";

// ─── Shared head-anchor hook ───────────────────────────────────────────────────
// Anchors the panel ONCE in front of the user on the first frame the XR camera
// pose is ready, then billboards it (yaw only) so it stays readable as the user
// turns. We read the LIVE XR camera via gl.xr.getCamera() — useThree().camera in
// @react-three/xr v6 is the head's local offset within the rig, NOT its world
// position. Reading its world position would pin the panel near the rig origin
// instead of in front of the user. (See webxr-gotchas memory.)
function useHeadAnchor(
  groupRef: React.RefObject<THREE.Group | null>,
  { distance = 1.35, yOffset = 0 }: { distance?: number; yOffset?: number } = {},
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
      // Looking straight up/down collapses horizontal forward to ~0 — fall back
      // to a safe default so the panel still lands in reach.
      if (fwd.current.lengthSq() < 1e-6) fwd.current.set(0, 0, -1);
      fwd.current.normalize();
      anchor.current.copy(camPos.current).addScaledVector(fwd.current, distance);
      anchor.current.y = camPos.current.y + yOffset;
      anchored.current = true;
    }

    g.position.copy(anchor.current);
    // Yaw-only billboard: always face the user's horizontal position.
    const dx = camPos.current.x - anchor.current.x;
    const dz = camPos.current.z - anchor.current.z;
    g.rotation.set(0, Math.atan2(dx, dz), 0);
  });
}

// ─── Ray-pressable 3D button ────────────────────────────────────────────────────
// Interactive via the controller ray, which reads userData.onVRSelect.
// selectionPaused on the XRControllerRay gates artwork picking but NOT
// onVRSelect buttons, so panel buttons always remain reachable.
interface VRPanelButtonProps {
  position: [number, number, number];
  width?: number;
  height?: number;
  label: string;
  color?: string;
  enabled?: boolean;
  onSelect: () => void;
}

export function VRPanelButton({
  position, width = 0.5, height = 0.11, label, color = "#f5c060", enabled = true, onSelect,
}: VRPanelButtonProps) {
  return (
    <group position={position} userData={enabled ? { onVRSelect: onSelect } : {}}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={color} transparent opacity={enabled ? 0.22 : 0.05} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
        <lineBasicMaterial color={color} transparent opacity={enabled ? 0.65 : 0.2} />
      </lineSegments>
      <Text
        position={[0, 0, 0.003]}
        fontSize={0.038}
        color={color}
        fillOpacity={enabled ? 1 : 0.3}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.002}
        outlineColor="#000000"
      >
        {label}
      </Text>
    </group>
  );
}

// ─── VR Artwork Detail Panel ─────────────────────────────────────────────────────
// Opens when the user pulls the trigger while pointing at (or gazing at) an
// artwork in the headset. Head-anchored and billboarded. Shows the full artwork
// metadata as readable 3D text — the artwork itself is visible on the wall right
// in front of the user, so an additional image is unnecessary.
//
// While this panel is open, GalleryRoom passes selectionPaused=true to the right
// XRControllerRay so the only way to return to roaming is to press CLOSE.
//
// Panel layout (PANEL_W=0.68, PANEL_H=0.78 at 1.35 m):
//   ┌──────────────────────────────┐  +0.39
//   │  ARTWORK INFO               │  +0.37  (header label)
//   │  Title of the Work          │  +0.30  (anchorY top, up to 2 lines)
//   │  Artist Name                │  +0.155 (anchorY top)
//   │  Year · Medium              │  +0.094 (anchorY top)
//   │  ─────────────────────────  │  separator
//   │  Description text…          │  +0.028 (anchorY top, 3–4 lines max)
//   │                             │
//   │         [ ✕ CLOSE ]         │  -0.305 (center)
//   └──────────────────────────────┘  -0.39
//
// Angular size at 1.35 m: ~31° tall — comfortable for immersive VR.
interface VRDetailPanelProps {
  artwork: ArtworkData;
  onClose: () => void;
}

const PW = 0.68;
const PH = 0.78;

export function VRDetailPanel({ artwork, onClose }: VRDetailPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  useHeadAnchor(groupRef, { distance: 1.35, yOffset: 0 });

  const desc = artwork.description
    ? (artwork.description.length > 165 ? artwork.description.slice(0, 162) + "…" : artwork.description)
    : null;

  const meta = [artwork.year, artwork.medium].filter(Boolean).join("   ·   ") || null;

  return (
    <group ref={groupRef} renderOrder={1000}>
      {/* Backing panel */}
      <mesh position={[0, 0, -0.013]}>
        <planeGeometry args={[PW, PH]} />
        <meshBasicMaterial color="#0d0b09" transparent opacity={0.96} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments position={[0, 0, -0.012]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(PW, PH)]} />
        <lineBasicMaterial color="#f5c060" transparent opacity={0.55} />
      </lineSegments>

      {/* "ARTWORK INFO" header */}
      <Text
        position={[0, 0.37, 0.003]}
        fontSize={0.028}
        color="#f5c060"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        outlineWidth={0.0015}
        outlineColor="#000000"
      >
        ARTWORK INFO
      </Text>

      {/* Title — up to 2 lines; anchorY="top" so variable height flows DOWN */}
      <Text
        position={[0, 0.30, 0.003]}
        fontSize={0.050}
        color="#ffffff"
        anchorX="center"
        anchorY="top"
        maxWidth={PW - 0.10}
        textAlign="center"
        outlineWidth={0.0025}
        outlineColor="#000000"
      >
        {artwork.title}
      </Text>

      {/* Artist name — shown only when available */}
      {artwork.artistName && (
        <Text
          position={[0, 0.155, 0.003]}
          fontSize={0.038}
          color="#f5c060"
          anchorX="center"
          anchorY="top"
          maxWidth={PW - 0.10}
          textAlign="center"
        >
          {artwork.artistName}
        </Text>
      )}

      {/* Year · Medium metadata */}
      {meta && (
        <Text
          position={[0, 0.094, 0.003]}
          fontSize={0.029}
          color="#ffffff"
          fillOpacity={0.70}
          anchorX="center"
          anchorY="top"
          maxWidth={PW - 0.10}
          textAlign="center"
        >
          {meta}
        </Text>
      )}

      {/* Thin separator */}
      {desc && (
        <mesh position={[0, 0.044, 0.003]}>
          <planeGeometry args={[PW - 0.12, 0.002]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.12} />
        </mesh>
      )}

      {/* Description — truncated to fit ~3–4 lines */}
      {desc && (
        <Text
          position={[0, 0.028, 0.003]}
          fontSize={0.027}
          color="#ffffff"
          fillOpacity={0.75}
          anchorX="center"
          anchorY="top"
          lineHeight={1.40}
          maxWidth={PW - 0.10}
          textAlign="center"
        >
          {desc}
        </Text>
      )}

      {/* CLOSE button — always reachable via onVRSelect even while selectionPaused */}
      <VRPanelButton
        position={[0, -(PH / 2 - 0.085), 0.003]}
        width={0.48}
        label="✕  CLOSE"
        color="#e5777a"
        onSelect={onClose}
      />
    </group>
  );
}

// ─── VR Menu Panel ───────────────────────────────────────────────────────────────
// Head-anchored menu opened by the left controller's lower button (X on Quest /
// primary-button on other runtimes). Gives access to edit mode and exit from
// inside the headset — the DOM toolbar is invisible in immersive WebXR.
//
// Panel layout (PANEL_W=0.66, PANEL_H varies):
//   ┌──────────────────────────────┐
//   │           MENU               │
//   │       [ EDIT ROOM ]          │  (owner only)
//   │         [ RESUME ]           │
//   │        [ EXIT VR ]           │
//   └──────────────────────────────┘
interface VRMenuPanelProps {
  isOwner?: boolean;
  onEditRoom: () => void;
  onExitVR: () => void;
  onClose: () => void;
}

export function VRMenuPanel({ isOwner, onEditRoom, onExitVR, onClose }: VRMenuPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  useHeadAnchor(groupRef, { distance: 1.25, yOffset: -0.04 });

  const MW = 0.66;
  // Layout: title row + N buttons, each 0.155 step, with top/bottom margins.
  const buttonDefs = [
    ...(isOwner ? [{ label: "EDIT ROOM", color: "#f5c060", onSelect: onEditRoom }] : []),
    { label: "RESUME", color: "#9adf8f", onSelect: onClose },
    { label: "EXIT VR", color: "#e5777a", onSelect: onExitVR },
  ];
  const MH = 0.16 + buttonDefs.length * 0.155 + 0.08; // title + buttons + margins
  const firstButtonY = MH / 2 - 0.16 - 0.11 / 2;     // top margin 0.16, button h 0.11

  return (
    <group ref={groupRef} renderOrder={1000}>
      <mesh position={[0, 0, -0.013]}>
        <planeGeometry args={[MW, MH]} />
        <meshBasicMaterial color="#0d0b09" transparent opacity={0.96} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments position={[0, 0, -0.012]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(MW, MH)]} />
        <lineBasicMaterial color="#f5c060" transparent opacity={0.55} />
      </lineSegments>

      <Text
        position={[0, MH / 2 - 0.075, 0.003]}
        fontSize={0.048}
        color="#f5c060"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.20}
        outlineWidth={0.002}
        outlineColor="#000000"
      >
        MENU
      </Text>

      {buttonDefs.map((b, i) => (
        <VRPanelButton
          key={b.label}
          position={[0, firstButtonY - i * 0.155, 0.003]}
          width={MW - 0.12}
          label={b.label}
          color={b.color}
          onSelect={b.onSelect}
        />
      ))}
    </group>
  );
}
