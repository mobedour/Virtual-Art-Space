import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

export type LiveDragRef = React.MutableRefObject<{
  draggingId: number | null;
  x: number; y: number; z: number; rotation: number;
}>;

const IMAGE_W = 1.6;
const IMAGE_H = 2.0;
const BORDER = 0.14;           // moulding border width
const FRAME_W = IMAGE_W + BORDER * 2;
const FRAME_H = IMAGE_H + BORDER * 2;
const FRAME_D = 0.13;          // moulding depth (thicker = more presence)
const MAT_INSET = 0.055;       // mat board extends inside frame edge
const BEVEL_W = 0.022;         // front raised inner rim width
const BEVEL_D = 0.016;         // how far it protrudes

export type ArtworkData = {
  id: number;
  title: string;
  imageUrl: string;
  artistName?: string | null;
  year?: string | null;
  medium?: string | null;
  dimensions?: string | null;
  description?: string | null;
  xPosition?: number;
  yPosition?: number;
  zPosition?: number;
  rotation?: number;
  scale?: number;
  isManuallyPlaced?: boolean;
};

const GLOW_DISTANCE = 3.5;
const GLOW_MAX = 0.18;

interface ArtworkFrameProps {
  artwork: ArtworkData;
  position: [number, number, number];
  rotationY: number;
  frameColor: string;
  labelColor: string;
  onSelect: (artwork: ArtworkData) => void;
  liveDragRef?: LiveDragRef;
}

function makePlaceholderTexture(title: string, frameColor: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#16120e";
  ctx.fillRect(0, 0, 512, 640);

  // Inner vignette
  const vg = ctx.createRadialGradient(256, 320, 60, 256, 320, 320);
  vg.addColorStop(0, "rgba(255,200,80,0.04)");
  vg.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, 512, 640);

  // Border
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 480, 608);
  ctx.strokeStyle = frameColor + "40";
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, 464, 592);

  // Corner marks
  const L = 32;
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 2;
  for (const [cx, cy] of [[20, 20], [492, 20], [20, 620], [492, 620]] as [number, number][]) {
    const sx = cx < 250 ? 1 : -1;
    const sy = cy < 350 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(cx + sx * L, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * L);
    ctx.stroke();
  }

  // Ghost initials
  const words = title.trim().split(/\s+/);
  const initials = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  ctx.font = "bold 140px serif";
  ctx.fillStyle = frameColor + "28";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials || "?", 256, 290);

  // Title
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#c8b89a";
  ctx.fillText(title.slice(0, 30), 256, 440);

  ctx.font = "13px monospace";
  ctx.fillStyle = "#5a4e40";
  ctx.fillText("IMAGE UNAVAILABLE", 256, 475);

  return new THREE.CanvasTexture(canvas);
}

export function ArtworkFrame({
  artwork,
  position,
  rotationY,
  frameColor,
  labelColor,
  onSelect,
  liveDragRef,
}: ArtworkFrameProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const cancelRef = useRef(false);
  const matEdgeRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowRef = useRef(0);
  const groupRef = useRef<THREE.Group>(null);

  // Proximity glow on the mat edge — lerps emissiveIntensity toward GLOW_MAX
  // when camera is within GLOW_DISTANCE units of the artwork position.
  useFrame(({ camera }) => {
    if (!matEdgeRef.current) return;
    const dist = camera.position.distanceTo(new THREE.Vector3(...position));
    const target = dist < GLOW_DISTANCE ? GLOW_MAX * (1 - dist / GLOW_DISTANCE) : 0;
    glowRef.current = THREE.MathUtils.lerp(glowRef.current, target, 0.12);
    matEdgeRef.current.emissiveIntensity = glowRef.current;
  });

  // During desktop drag, update the Three.js group position directly from
  // the shared live ref — no React state change, no re-renders, no flashing.
  useFrame(() => {
    if (!groupRef.current || !liveDragRef) return;
    const live = liveDragRef.current;
    if (live.draggingId !== artwork.id) return;
    groupRef.current.position.set(live.x, live.y, live.z);
    groupRef.current.rotation.y = live.rotation;
  });

  const placeholderTexture = useMemo(
    () => makePlaceholderTexture(artwork.title, frameColor),
    [artwork.title, frameColor]
  );

  useEffect(() => {
    if (!artwork.imageUrl) { setLoadFailed(true); return; }
    cancelRef.current = false;
    setTexture(null);
    setLoadFailed(false);
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      artwork.imageUrl,
      (tex) => {
        if (cancelRef.current) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => { if (!cancelRef.current) setLoadFailed(true); }
    );
    return () => { cancelRef.current = true; };
  }, [artwork.imageUrl]);

  const displayTexture = texture ?? (loadFailed ? placeholderTexture : null);
  const frameColorObj = useMemo(() => new THREE.Color(frameColor), [frameColor]);
  const frameDarkObj  = useMemo(() => new THREE.Color(frameColor).multiplyScalar(0.55), [frameColor]);

  // Bevel geometry — four thin strips forming an inner raised rim
  const bevelPieces: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0,  (IMAGE_H / 2 + MAT_INSET + BEVEL_W / 2), FRAME_D / 2 - BEVEL_D / 2], size: [FRAME_W - BEVEL_W * 2, BEVEL_W, BEVEL_D] },
    { pos: [0, -(IMAGE_H / 2 + MAT_INSET + BEVEL_W / 2), FRAME_D / 2 - BEVEL_D / 2], size: [FRAME_W - BEVEL_W * 2, BEVEL_W, BEVEL_D] },
    { pos: [-(IMAGE_W / 2 + MAT_INSET + BEVEL_W / 2), 0,  FRAME_D / 2 - BEVEL_D / 2], size: [BEVEL_W, FRAME_H, BEVEL_D] },
    { pos: [ (IMAGE_W / 2 + MAT_INSET + BEVEL_W / 2), 0,  FRAME_D / 2 - BEVEL_D / 2], size: [BEVEL_W, FRAME_H, BEVEL_D] },
  ];

  const artworkScale = artwork.scale ?? 1;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotationY, 0]}
      scale={[artworkScale, artworkScale, artworkScale]}
      userData={{ artworkId: artwork.id }}
      onClick={(e) => { e.stopPropagation(); onSelect(artwork); }}
    >
      {/* Main moulding box */}
      <mesh position={[0, 0, -FRAME_D / 2]} castShadow receiveShadow>
        <boxGeometry args={[FRAME_W, FRAME_H, FRAME_D]} />
        <meshStandardMaterial
          color={frameColorObj}
          metalness={0.65}
          roughness={0.3}
          envMapIntensity={1.0}
        />
      </mesh>

      {/* Inner raised bevel rim at the front face */}
      {bevelPieces.map((p, i) => (
        <mesh key={i} position={p.pos} castShadow>
          <boxGeometry args={p.size} />
          <meshStandardMaterial
            color={frameColorObj}
            metalness={0.8}
            roughness={0.2}
            envMapIntensity={1.2}
          />
        </mesh>
      ))}

      {/* Dark rabbet recess behind mat */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[IMAGE_W + MAT_INSET * 2 + 0.01, IMAGE_H + MAT_INSET * 2 + 0.01, 0.03]} />
        <meshStandardMaterial color="#0a0806" roughness={1} />
      </mesh>

      {/* Mat board — cream with proximity glow */}
      <mesh position={[0, 0, 0.016]}>
        <planeGeometry args={[IMAGE_W + MAT_INSET * 2 - 0.01, IMAGE_H + MAT_INSET * 2 - 0.01]} />
        <meshStandardMaterial
          ref={matEdgeRef}
          color="#f0ebe0"
          roughness={0.98}
          emissive="#f5c060"
          emissiveIntensity={0}
        />
      </mesh>

      {/* Artwork canvas */}
      <mesh position={[0, 0, 0.032]}>
        <planeGeometry args={[IMAGE_W, IMAGE_H]} />
        {displayTexture ? (
          <meshBasicMaterial map={displayTexture} toneMapped={false} />
        ) : (
          <meshStandardMaterial color="#1a1510" roughness={0.9} emissive="#0d0b08" emissiveIntensity={0.5} />
        )}
      </mesh>

      {/* Label shelf — thin horizontal ledge below frame */}
      <mesh position={[0, -(FRAME_H / 2 + 0.025), -FRAME_D / 2 + 0.01]}>
        <boxGeometry args={[FRAME_W * 0.85, 0.03, 0.055]} />
        <meshStandardMaterial color={frameDarkObj} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Hanging wire */}
      <mesh position={[0, FRAME_H / 2 + 0.06, -FRAME_D + 0.02]}>
        <cylinderGeometry args={[0.006, 0.006, 0.22, 6]} />
        <meshStandardMaterial color="#999" metalness={0.95} roughness={0.15} />
      </mesh>

      {/* Nail / hook stub */}
      <mesh position={[0, FRAME_H / 2 + 0.17, -FRAME_D + 0.015]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Title label */}
      <Text
        position={[0, -(FRAME_H / 2 + 0.18), 0.02]}
        fontSize={0.095}
        color={labelColor}
        anchorX="center"
        anchorY="top"
        maxWidth={FRAME_W + 0.8}
        outlineWidth={0.005}
        outlineColor="#000000"
      >
        {artwork.title}
      </Text>

      {/* Artist name */}
      {artwork.artistName && (
        <Text
          position={[0, -(FRAME_H / 2 + 0.32), 0.02]}
          fontSize={0.07}
          color={labelColor}
          fillOpacity={0.73}
          anchorX="center"
          anchorY="top"
          maxWidth={FRAME_W + 0.8}
          outlineWidth={0.003}
          outlineColor="#000000"
        >
          {artwork.artistName}
        </Text>
      )}
    </group>
  );
}
