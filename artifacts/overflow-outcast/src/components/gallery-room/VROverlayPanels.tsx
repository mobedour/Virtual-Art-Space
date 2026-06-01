import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { ArtworkData } from "./ArtworkFrame";

// ─── Shared head-anchor hook ───────────────────────────────────────────────────
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
  const baseRO = 1002;
  return (
    <group position={position} userData={enabled ? { onVRSelect: onSelect } : {}}>
      <mesh renderOrder={baseRO}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={enabled ? 0.28 : 0.05}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <lineSegments renderOrder={baseRO + 1}>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
        <lineBasicMaterial
          color={color}
          transparent
          opacity={enabled ? 0.8 : 0.2}
          depthTest={false}
        />
      </lineSegments>
      <Text
        position={[0, 0, 0.003]}
        fontSize={0.042}
        color={color}
        fillOpacity={enabled ? 1 : 0.3}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.0022}
        outlineColor="#000000"
        renderOrder={baseRO + 2}
      >
        {label}
      </Text>
    </group>
  );
}

// ─── Artwork image texture loader ────────────────────────────────────────────────
function useArtworkTexture(imageUrl?: string): { texture: THREE.Texture | null; loading: boolean; failed: boolean } {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      setLoading(false);
      setFailed(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setTexture(null);
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      imageUrl,
      (tex) => {
        if (cancelled) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        setTexture(tex);
        setLoading(false);
      },
      undefined,
      () => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return { texture, loading, failed };
}

// ─── VR Artwork Detail Panel ────────────────────────────────────────────────────
interface VRDetailPanelProps {
  artwork: ArtworkData;
  onClose: () => void;
}

export function VRDetailPanel({ artwork, onClose }: VRDetailPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  useHeadAnchor(groupRef, { distance: 1.4, yOffset: 0 });
  const { texture, loading, failed } = useArtworkTexture(artwork.imageUrl);

  const PANEL_W = 1.15;
  const PANEL_H = 1.6;
  const IMG_W = 0.82;
  const IMG_H = 0.82 * 1.25;

  const imgCenterY = PANEL_H / 2 - 0.14 - IMG_H / 2;
  const textTop = imgCenterY - IMG_H / 2 - 0.06;

  const meta = [artwork.year, artwork.medium].filter(Boolean).join("   ·   ");
  const desc = artwork.description
    ? (artwork.description.length > 260 ? artwork.description.slice(0, 257) + "…" : artwork.description)
    : "";

  // Z-layers (panel faces +Z toward camera after billboarding):
  //   backing  = -0.015  (furthest back)
  //   border   = -0.013
  //   image    = +0.005  (clearly in front of backing)
  //   text     = +0.008
  //   button   = +0.010

  const BACK_Z = -0.015;
  const IMG_Z  =  0.005;
  const TEXT_Z =  0.008;
  const BTN_Z  =  0.010;

  return (
    <group ref={groupRef} renderOrder={1000}>
      {/* Backing panel */}
      <mesh position={[0, 0, BACK_Z]} renderOrder={1000}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial
          color="#0d0b09"
          transparent
          opacity={0.97}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {/* Border */}
      <lineSegments position={[0, 0, BACK_Z + 0.002]} renderOrder={1001}>
        <edgesGeometry args={[new THREE.PlaneGeometry(PANEL_W, PANEL_H)]} />
        <lineBasicMaterial color="#f5c060" transparent opacity={0.6} depthTest={false} />
      </lineSegments>

      {/* Image area */}
      <mesh position={[0, imgCenterY, IMG_Z]} renderOrder={1001}>
        <planeGeometry args={[IMG_W, IMG_H]} />
        {texture ? (
          <meshBasicMaterial
            map={texture}
            toneMapped={false}
            depthTest={false}
            depthWrite={false}
          />
        ) : (
          <meshBasicMaterial
            color={loading ? "#1e1a14" : failed ? "#0f0c09" : "#1e1a14"}
            transparent
            opacity={1}
            depthTest={false}
            depthWrite={false}
          />
        )}
      </mesh>

      {/* Loading / no-image label */}
      {(loading || (!texture && failed)) && (
        <Text
          position={[0, imgCenterY, IMG_Z + 0.002]}
          fontSize={0.032}
          color={loading ? "#f5c060" : "#4a4035"}
          fillOpacity={0.7}
          anchorX="center"
          anchorY="middle"
          renderOrder={1002}
          depthOffset={-1}
        >
          {loading ? "Loading image…" : "Image unavailable"}
        </Text>
      )}

      {/* Title */}
      <Text
        position={[0, textTop, TEXT_Z]}
        fontSize={0.056}
        color="#ffffff"
        anchorX="center"
        anchorY="top"
        maxWidth={PANEL_W - 0.12}
        textAlign="center"
        outlineWidth={0.0022}
        outlineColor="#000000"
        renderOrder={1002}
        depthOffset={-1}
      >
        {artwork.title}
      </Text>

      {artwork.artistName && (
        <Text
          position={[0, textTop - 0.1, TEXT_Z]}
          fontSize={0.038}
          color="#f5c060"
          anchorX="center"
          anchorY="top"
          maxWidth={PANEL_W - 0.12}
          textAlign="center"
          renderOrder={1002}
          depthOffset={-1}
        >
          {artwork.artistName}
        </Text>
      )}

      {meta && (
        <Text
          position={[0, textTop - 0.17, TEXT_Z]}
          fontSize={0.030}
          color="#ffffff"
          fillOpacity={0.65}
          anchorX="center"
          anchorY="top"
          maxWidth={PANEL_W - 0.12}
          textAlign="center"
          renderOrder={1002}
          depthOffset={-1}
        >
          {meta}
        </Text>
      )}

      {desc && (
        <Text
          position={[0, textTop - 0.24, TEXT_Z]}
          fontSize={0.028}
          color="#ffffff"
          fillOpacity={0.75}
          anchorX="center"
          anchorY="top"
          lineHeight={1.45}
          maxWidth={PANEL_W - 0.16}
          textAlign="center"
          renderOrder={1002}
          depthOffset={-1}
        >
          {desc}
        </Text>
      )}

      {/* Close button */}
      <VRPanelButton
        position={[0, -PANEL_H / 2 + 0.13, BTN_Z]}
        width={0.52}
        label="✕  CLOSE"
        color="#e5777a"
        onSelect={onClose}
      />
    </group>
  );
}

// ─── VR Menu Panel ──────────────────────────────────────────────────────────────
interface VRMenuPanelProps {
  isOwner?: boolean;
  onEditRoom: () => void;
  onExitVR: () => void;
  onClose: () => void;
}

export function VRMenuPanel({ isOwner, onEditRoom, onExitVR, onClose }: VRMenuPanelProps) {
  const groupRef = useRef<THREE.Group>(null);
  useHeadAnchor(groupRef, { distance: 1.3, yOffset: -0.05 });

  const PANEL_W = 0.72;
  const PANEL_H = isOwner ? 0.82 : 0.64;

  const buttons = useMemo(() => {
    const list: { label: string; color?: string; onSelect: () => void }[] = [];
    if (isOwner) list.push({ label: "EDIT ROOM", onSelect: onEditRoom });
    list.push({ label: "RESUME", color: "#9adf8f", onSelect: onClose });
    list.push({ label: "EXIT VR", color: "#e5777a", onSelect: onExitVR });
    return list;
  }, [isOwner, onEditRoom, onClose, onExitVR]);

  const startY = PANEL_H / 2 - 0.22;
  const step = 0.18;

  const BACK_Z = -0.015;
  const TEXT_Z =  0.005;
  const BTN_Z  =  0.008;

  return (
    <group ref={groupRef} renderOrder={1000}>
      {/* Backing */}
      <mesh position={[0, 0, BACK_Z]} renderOrder={1000}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial
          color="#0d0b09"
          transparent
          opacity={0.97}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {/* Border */}
      <lineSegments position={[0, 0, BACK_Z + 0.002]} renderOrder={1001}>
        <edgesGeometry args={[new THREE.PlaneGeometry(PANEL_W, PANEL_H)]} />
        <lineBasicMaterial color="#f5c060" transparent opacity={0.6} depthTest={false} />
      </lineSegments>

      {/* Header */}
      <Text
        position={[0, PANEL_H / 2 - 0.09, TEXT_Z]}
        fontSize={0.052}
        color="#f5c060"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.18}
        outlineWidth={0.002}
        outlineColor="#000000"
        renderOrder={1002}
        depthOffset={-1}
      >
        MENU
      </Text>

      {/* Hint */}
      <Text
        position={[0, PANEL_H / 2 - 0.15, TEXT_Z]}
        fontSize={0.022}
        color="#ffffff"
        fillOpacity={0.35}
        anchorX="center"
        anchorY="middle"
        renderOrder={1002}
        depthOffset={-1}
      >
        Point &amp; pull trigger to select
      </Text>

      {buttons.map((b, i) => (
        <VRPanelButton
          key={b.label}
          position={[0, startY - i * step, BTN_Z]}
          width={0.58}
          height={0.13}
          label={b.label}
          color={b.color}
          onSelect={b.onSelect}
        />
      ))}
    </group>
  );
}
