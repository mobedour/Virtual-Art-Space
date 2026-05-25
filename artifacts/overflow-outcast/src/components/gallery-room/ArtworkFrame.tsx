import { useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";

const IMAGE_W = 1.6;
const IMAGE_H = 2.0;
const FRAME_W = IMAGE_W + 0.24;
const FRAME_H = IMAGE_H + 0.24;
const FRAME_D = 0.08;
const MAT_INSET = 0.06;

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
  isManuallyPlaced?: boolean;
};

interface ArtworkFrameProps {
  artwork: ArtworkData;
  position: [number, number, number];
  rotationY: number;
  frameColor: string;
  labelColor: string;
  onSelect: (artwork: ArtworkData) => void;
}

// Generate a placeholder canvas texture with initials + title when image fails
function makePlaceholderTexture(title: string, frameColor: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;

  // Dark background
  ctx.fillStyle = "#1a1510";
  ctx.fillRect(0, 0, 512, 640);

  // Subtle border
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 472, 600);

  // Decorative corner marks
  const markLen = 28;
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 2;
  [[20, 20], [492, 20], [20, 620], [492, 620]].forEach(([cx, cy]) => {
    ctx.beginPath(); ctx.moveTo(cx, cy + markLen * (cy < 300 ? 1 : -1)); ctx.lineTo(cx, cy); ctx.lineTo(cx + markLen * (cx < 300 ? 1 : -1), cy); ctx.stroke();
  });

  // Initials in centre
  const words = title.trim().split(/\s+/);
  const initials = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  ctx.font = "bold 110px serif";
  ctx.fillStyle = frameColor + "55";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials || "?", 256, 280);

  // Title text below
  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#c8b89a";
  ctx.fillText(title.slice(0, 28), 256, 430);

  ctx.font = "16px monospace";
  ctx.fillStyle = "#6a5c4a";
  ctx.fillText("IMAGE UNAVAILABLE", 256, 480);

  return new THREE.CanvasTexture(canvas);
}

export function ArtworkFrame({
  artwork,
  position,
  rotationY,
  frameColor,
  labelColor,
  onSelect,
}: ArtworkFrameProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const cancelRef = useRef(false);

  const placeholderTexture = useMemo(
    () => makePlaceholderTexture(artwork.title, frameColor),
    [artwork.title, frameColor]
  );

  useEffect(() => {
    if (!artwork.imageUrl) {
      setLoadFailed(true);
      return;
    }
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
      () => {
        if (!cancelRef.current) setLoadFailed(true);
      }
    );
    return () => {
      cancelRef.current = true;
    };
  }, [artwork.imageUrl]);

  const displayTexture = texture ?? (loadFailed ? placeholderTexture : null);

  const frameColorObj = useMemo(() => new THREE.Color(frameColor), [frameColor]);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      userData={{ artworkId: artwork.id }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(artwork);
      }}
    >
      {/* Outer frame — gold moulding */}
      <mesh position={[0, 0, -FRAME_D / 2]} castShadow receiveShadow>
        <boxGeometry args={[FRAME_W, FRAME_H, FRAME_D]} />
        <meshStandardMaterial
          color={frameColorObj}
          metalness={0.6}
          roughness={0.35}
          envMapIntensity={0.8}
        />
      </mesh>

      {/* Inner frame lip (darker inset to add depth) */}
      <mesh position={[0, 0, -0.005]}>
        <boxGeometry args={[IMAGE_W + MAT_INSET * 2, IMAGE_H + MAT_INSET * 2, 0.025]} />
        <meshStandardMaterial color="#0d0b09" roughness={0.9} />
      </mesh>

      {/* Mat / mount board */}
      <mesh position={[0, 0, 0.008]}>
        <planeGeometry args={[IMAGE_W + MAT_INSET * 2 - 0.02, IMAGE_H + MAT_INSET * 2 - 0.02]} />
        <meshStandardMaterial color="#f2ede4" roughness={0.95} />
      </mesh>

      {/* Artwork image (or placeholder) */}
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[IMAGE_W, IMAGE_H]} />
        {displayTexture ? (
          <meshBasicMaterial map={displayTexture} toneMapped={false} />
        ) : (
          /* Loading state — subtle pulsing dark panel */
          <meshStandardMaterial color="#1a1510" roughness={0.9} emissive="#0d0b08" emissiveIntensity={0.4} />
        )}
      </mesh>

      {/* Hanging wire (thin line at top) */}
      <mesh position={[0, FRAME_H / 2 + 0.05, -0.02]}>
        <cylinderGeometry args={[0.008, 0.008, 0.18, 6]} />
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Title label */}
      <Text
        position={[0, -(FRAME_H / 2 + 0.18), 0.02]}
        fontSize={0.1}
        color={labelColor}
        anchorX="center"
        anchorY="top"
        maxWidth={FRAME_W + 0.8}
        outlineWidth={0.004}
        outlineColor="#000000"
      >
        {artwork.title}
      </Text>

      {/* Artist name (smaller, below title) */}
      {artwork.artistName && (
        <Text
          position={[0, -(FRAME_H / 2 + 0.33), 0.02]}
          fontSize={0.075}
          color={labelColor + "aa"}
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
