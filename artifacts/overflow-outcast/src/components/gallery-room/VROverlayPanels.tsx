import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { ArtworkData } from "./ArtworkFrame";

// ─── Shared head-anchor hook ───────────────────────────────────────────────────
// Anchors a panel ONCE in front of the user (the first frame the XR camera pose
// is ready), then billboards it (yaw only) so it stays readable as the user
// turns. We read the LIVE XR camera via gl.xr.getCamera() — useThree().camera in
// @react-three/xr v6 is only the head's local offset within the rig, so reading
// its world position would pin the panel near the rig origin instead of in front
// of the user. (See webxr-gotchas memory.)
function useHeadAnchor(
  groupRef: React.RefObject<THREE.Group | null>,
  { distance = 1.5, yOffset = 0 }: { distance?: number; yOffset?: number } = {},
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
      // Looking straight up/down at open collapses horizontal forward to ~0 —
      // fall back to a default so the panel still lands in reach.
      if (fwd.current.lengthSq() < 1e-6) fwd.current.set(0, 0, -1);
      fwd.current.normalize();
      anchor.current.copy(camPos.current).addScaledVector(fwd.current, distance);
      anchor.current.y = camPos.current.y + yOffset;
      anchored.current = true;
    }

    g.position.copy(anchor.current);
    const dx = camPos.current.x - anchor.current.x;
    const dz = camPos.current.z - anchor.current.z;
    g.rotation.set(0, Math.atan2(dx, dz), 0);
  });
}

// ─── Ray-pressable 3D button ────────────────────────────────────────────────────
// Interactive via the controller ray, which picks up userData.onVRSelect.
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
  position, width = 0.5, height = 0.12, label, color = "#f5c060", enabled = true, onSelect,
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
        position={[0, 0, 0.002]}
        fontSize={0.04}
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

// ─── Artwork image texture loader (mirrors ArtworkFrame) ────────────────────────
function useArtworkTexture(imageUrl?: string): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!imageUrl) { setTexture(null); return; }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      imageUrl,
      (tex) => { if (!cancelled) { tex.colorSpace = THREE.SRGBColorSpace; setTexture(tex); } },
      undefined,
      () => { if (!cancelled) setTexture(null); },
    );
    return () => { cancelled = true; };
  }, [imageUrl]);
  return texture;
}

// ─── VR Artwork Detail Panel ────────────────────────────────────────────────────
// Opens when the user pulls the trigger while pointing at (or gazing at) an
// artwork. Head-anchored, billboarded, shows the image + full details with a
// CLOSE button. While it's open the caller pauses artwork re-selection so the
// only way back to roaming is the CLOSE button.
interface VRDetailPanelProps {
  artwork: ArtworkData;
  onClose: () => void;
}

export function VRDetailPanel({ artwork, onClose }: VRDetailPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  useHeadAnchor(groupRef, { distance: 1.4, yOffset: 0 });
  const texture = useArtworkTexture(artwork.imageUrl);

  const PANEL_W = 1.1;
  const PANEL_H = 1.55;
  const IMG_W = 0.78;
  const IMG_H = 0.78 * 1.25; // 4:5 portrait, matches gallery frames

  // Image sits in the upper area; text flows below it.
  const imgCenterY = PANEL_H / 2 - 0.12 - IMG_H / 2;
  const textTop = imgCenterY - IMG_H / 2 - 0.07;

  const meta = [artwork.year, artwork.medium].filter(Boolean).join("   ·   ");
  const desc = artwork.description
    ? (artwork.description.length > 280 ? artwork.description.slice(0, 277) + "…" : artwork.description)
    : "";

  return (
    <group ref={groupRef} renderOrder={1000}>
      {/* Backing panel */}
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial color="#0d0b09" transparent opacity={0.95} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments position={[0, 0, -0.011]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(PANEL_W, PANEL_H)]} />
        <lineBasicMaterial color="#f5c060" transparent opacity={0.5} />
      </lineSegments>

      {/* Image */}
      <mesh position={[0, imgCenterY, 0]}>
        <planeGeometry args={[IMG_W, IMG_H]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#1a1510" />
        )}
      </mesh>

      {/* Title */}
      <Text
        position={[0, textTop, 0.002]}
        fontSize={0.058}
        color="#ffffff"
        anchorX="center"
        anchorY="top"
        maxWidth={PANEL_W - 0.14}
        textAlign="center"
        outlineWidth={0.0025}
        outlineColor="#000000"
      >
        {artwork.title}
      </Text>

      {artwork.artistName && (
        <Text
          position={[0, textTop - 0.1, 0.002]}
          fontSize={0.04}
          color="#f5c060"
          anchorX="center"
          anchorY="top"
          maxWidth={PANEL_W - 0.14}
          textAlign="center"
        >
          {artwork.artistName}
        </Text>
      )}

      {meta && (
        <Text
          position={[0, textTop - 0.17, 0.002]}
          fontSize={0.032}
          color="#ffffff"
          fillOpacity={0.7}
          anchorX="center"
          anchorY="top"
          maxWidth={PANEL_W - 0.14}
          textAlign="center"
        >
          {meta}
        </Text>
      )}

      {desc && (
        <Text
          position={[0, textTop - 0.25, 0.002]}
          fontSize={0.03}
          color="#ffffff"
          fillOpacity={0.78}
          anchorX="center"
          anchorY="top"
          lineHeight={1.4}
          maxWidth={PANEL_W - 0.18}
          textAlign="center"
        >
          {desc}
        </Text>
      )}

      {/* Close button */}
      <VRPanelButton
        position={[0, -PANEL_H / 2 + 0.12, 0.002]}
        width={0.5}
        label="✕  CLOSE"
        color="#e5777a"
        onSelect={onClose}
      />
    </group>
  );
}

// ─── VR Menu Panel ──────────────────────────────────────────────────────────────
// Head-anchored menu opened with the left controller's lower button. Gives the
// user access to edit mode and exit from inside the headset, since the DOM
// toolbars are invisible in immersive WebXR.
interface VRMenuPanelProps {
  isOwner?: boolean;
  onEditRoom: () => void;
  onExitVR: () => void;
  onClose: () => void;
}

export function VRMenuPanel({ isOwner, onEditRoom, onExitVR, onClose }: VRMenuPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  useHeadAnchor(groupRef, { distance: 1.3, yOffset: -0.05 });

  const PANEL_W = 0.7;
  const PANEL_H = isOwner ? 0.78 : 0.62;

  // Stack the buttons from the top with a fixed step.
  const buttons = useMemo(() => {
    const list: { label: string; color?: string; onSelect: () => void }[] = [];
    if (isOwner) list.push({ label: "EDIT ROOM", onSelect: onEditRoom });
    list.push({ label: "RESUME", color: "#9adf8f", onSelect: onClose });
    list.push({ label: "EXIT VR", color: "#e5777a", onSelect: onExitVR });
    return list;
  }, [isOwner, onEditRoom, onClose, onExitVR]);

  const startY = PANEL_H / 2 - 0.22;
  const step = 0.16;

  return (
    <group ref={groupRef} renderOrder={1000}>
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial color="#0d0b09" transparent opacity={0.95} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments position={[0, 0, -0.011]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(PANEL_W, PANEL_H)]} />
        <lineBasicMaterial color="#f5c060" transparent opacity={0.5} />
      </lineSegments>

      <Text
        position={[0, PANEL_H / 2 - 0.08, 0.002]}
        fontSize={0.05}
        color="#f5c060"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        outlineWidth={0.002}
        outlineColor="#000000"
      >
        MENU
      </Text>

      {buttons.map((b, i) => (
        <VRPanelButton
          key={b.label}
          position={[0, startY - i * step, 0.002]}
          width={0.56}
          label={b.label}
          color={b.color}
          onSelect={b.onSelect}
        />
      ))}
    </group>
  );
}
