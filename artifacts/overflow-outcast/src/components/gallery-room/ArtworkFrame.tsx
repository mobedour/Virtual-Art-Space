import { useEffect, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";

const IMAGE_W = 1.5;
const IMAGE_H = 1.9;
const FRAME_W = IMAGE_W + 0.2;
const FRAME_H = IMAGE_H + 0.2;
const FRAME_D = 0.06;

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

export function ArtworkFrame({
  artwork,
  position,
  rotationY,
  frameColor,
  labelColor,
  onSelect,
}: ArtworkFrameProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!artwork.imageUrl) return;
    cancelRef.current = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      artwork.imageUrl,
      (tex) => {
        if (!cancelRef.current) setTexture(tex);
      },
      undefined,
      () => {}
    );
    return () => {
      cancelRef.current = true;
    };
  }, [artwork.imageUrl]);

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
      {/* Outer frame border */}
      <mesh position={[0, 0, -0.03]} castShadow>
        <boxGeometry args={[FRAME_W, FRAME_H, FRAME_D]} />
        <meshStandardMaterial
          color={frameColor}
          metalness={0.35}
          roughness={0.55}
        />
      </mesh>

      {/* Mat (cream backing, slightly inset from frame) */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[FRAME_W - 0.04, FRAME_H - 0.04]} />
        <meshBasicMaterial color="#f5f0e8" />
      </mesh>

      {/* Artwork image */}
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[IMAGE_W, IMAGE_H]} />
        {texture ? (
          <meshBasicMaterial map={texture} />
        ) : (
          <meshBasicMaterial color="#2a2426" />
        )}
      </mesh>

      {/* Title label beneath frame */}
      <Text
        position={[0, -(FRAME_H / 2 + 0.22), 0.02]}
        fontSize={0.11}
        color={labelColor}
        anchorX="center"
        anchorY="top"
        maxWidth={FRAME_W + 0.6}
        outlineWidth={0.005}
        outlineColor="#000000"
      >
        {artwork.title}
      </Text>
    </group>
  );
}
