import { useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArtworkData } from "./ArtworkFrame";

const PANEL_OFFSET = 1.25; // metres ahead of the headset (close = fills view)
const AUTO_DISMISS_MS = 120_000;
const PANEL_W = 1.5;
const PANEL_H = 1.9;

interface VRInfoPanelProps {
  artwork: ArtworkData | null;
  onClose: () => void;
}

/**
 * In-VR artwork detail panel.
 *
 * IMPORTANT: this used to use drei's <Html transform>. A DOM element is NOT
 * composited into the immersive WebXR framebuffer, so inside the headset the
 * panel was completely invisible — which is why "pressing to view a picture"
 * did nothing in VR. This version is built entirely from real 3D objects
 * (planes + drei <Text> + an image texture) so it actually renders in the
 * headset, and exposes a 3D close button the controller ray can press
 * (via userData.onVRSelect).
 */
export function VRInfoPanel({ artwork, onClose }: VRInfoPanelProps) {
  const { camera, gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const tmpPos = useRef(new THREE.Vector3());
  const tmpQuat = useRef(new THREE.Quaternion());
  const tmpFwd = useRef(new THREE.Vector3());
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [imgAspect, setImgAspect] = useState(1);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after a while so an abandoned panel doesn't stay forever.
  useEffect(() => {
    if (!artwork) return;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [artwork, onClose]);

  // Load the artwork image as a texture.
  useEffect(() => {
    setTexture(null);
    setImgAspect(1);
    if (!artwork?.imageUrl) return;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    loader.load(
      artwork.imageUrl,
      (tex) => {
        if (cancelled) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        const img = tex.image as { width?: number; height?: number };
        if (img?.width && img?.height) setImgAspect(img.width / img.height);
        setTexture(tex);
      },
      undefined,
      () => { /* keep placeholder */ },
    );
    return () => { cancelled = true; };
  }, [artwork?.imageUrl]);

  // Head-lock the panel: every frame, pin it a fixed distance directly in front
  // of the *live XR camera* and face it square-on. Reading the XR camera (not
  // useThree().camera, which isn't updated with the headset pose in
  // @react-three/xr v6) is what fixes the old bug where the panel appeared far
  // away in the middle of the gallery. Locking it to the head makes it fill the
  // view ("whole screen") regardless of stationary / room-scale mode.
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const cam = gl.xr.isPresenting ? (gl.xr.getCamera() as unknown as THREE.Camera) : camera;
    cam.getWorldPosition(tmpPos.current);
    cam.getWorldQuaternion(tmpQuat.current);
    tmpFwd.current.set(0, 0, -1).applyQuaternion(tmpQuat.current);
    g.position.copy(tmpPos.current).addScaledVector(tmpFwd.current, PANEL_OFFSET);
    g.quaternion.copy(tmpQuat.current);
  });

  // Image plane dimensions (contain within a fixed box, preserving aspect).
  const { imgW, imgH } = useMemo(() => {
    const maxW = 1.2;
    const maxH = 0.95;
    let w = maxW;
    let h = w / imgAspect;
    if (h > maxH) { h = maxH; w = h * imgAspect; }
    return { imgW: w, imgH: h };
  }, [imgAspect]);

  if (!artwork) return null;

  const imageTop = PANEL_H / 2 - 0.12;
  const imageCenterY = imageTop - imgH / 2;
  let textY = imageCenterY - imgH / 2 - 0.1;

  return (
    <group ref={groupRef} renderOrder={1000}>
      {/* Backing panel */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial color="#0d0b09" transparent opacity={0.94} side={THREE.DoubleSide} />
      </mesh>
      {/* Amber border frame */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(PANEL_W, PANEL_H)]} />
        <lineBasicMaterial color="#f5c060" transparent opacity={0.5} />
      </lineSegments>

      {/* Artwork image */}
      {texture && (
        <mesh position={[0, imageCenterY, 0.001]}>
          <planeGeometry args={[imgW, imgH]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}

      {/* Title */}
      <Text
        position={[0, textY, 0.002]}
        fontSize={0.075}
        color="#f5c060"
        anchorX="center"
        anchorY="top"
        maxWidth={PANEL_W - 0.16}
        textAlign="center"
        outlineWidth={0.003}
        outlineColor="#000000"
      >
        {artwork.title}
      </Text>

      {artwork.artistName && (
        <Text
          position={[0, (textY -= 0.13), 0.002]}
          fontSize={0.05}
          color="#ffffff"
          fillOpacity={0.75}
          anchorX="center"
          anchorY="top"
          maxWidth={PANEL_W - 0.16}
          textAlign="center"
        >
          {artwork.artistName}
        </Text>
      )}

      {(artwork.year || artwork.medium) && (
        <Text
          position={[0, (textY -= 0.09), 0.002]}
          fontSize={0.04}
          color="#ffffff"
          fillOpacity={0.5}
          anchorX="center"
          anchorY="top"
          maxWidth={PANEL_W - 0.16}
          textAlign="center"
        >
          {[artwork.year, artwork.medium].filter(Boolean).join("  ·  ")}
        </Text>
      )}

      {artwork.description && (
        <Text
          position={[0, (textY -= 0.09), 0.002]}
          fontSize={0.038}
          color="#ffffff"
          fillOpacity={0.6}
          anchorX="center"
          anchorY="top"
          lineHeight={1.4}
          maxWidth={PANEL_W - 0.18}
          textAlign="center"
        >
          {artwork.description.length > 220 ? artwork.description.slice(0, 217) + "…" : artwork.description}
        </Text>
      )}

      {/* Exit button — pressable by the controller ray (userData.onVRSelect).
          Closes the panel and returns to roaming the gallery. */}
      <group
        position={[0, -PANEL_H / 2 + 0.16, 0.002]}
        userData={{ onVRSelect: onClose }}
      >
        <mesh>
          <planeGeometry args={[0.62, 0.2]} />
          <meshBasicMaterial color="#f5c060" transparent opacity={0.22} side={THREE.DoubleSide} />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(0.62, 0.2)]} />
          <lineBasicMaterial color="#f5c060" transparent opacity={0.7} />
        </lineSegments>
        <Text position={[0, 0, 0.002]} fontSize={0.07} color="#f5c060" anchorX="center" anchorY="middle">
          EXIT
        </Text>
      </group>
    </group>
  );
}
