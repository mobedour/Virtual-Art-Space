import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import { ArtworkFrame, type ArtworkData } from "./ArtworkFrame";
import { getTheme } from "./theme-config";
import { TouchControls } from "./TouchControls";
import type { JoystickState } from "./VirtualJoystick";

// Room half-dimensions
const HALF_W = 9;
const HALF_H = 4.5;
const HALF_D = 9;
const EYE_Y = 0;
const WALL_INSET = 0.12;
const HANG_Y = 0.8;

type PlacedArtwork = {
  artwork: ArtworkData;
  position: [number, number, number];
  rotationY: number;
};

const WALLS = [
  {
    getPos: (along: number): [number, number, number] => [along, HANG_Y, -(HALF_D - WALL_INSET)],
    rotY: 0,
  },
  {
    getPos: (along: number): [number, number, number] => [HALF_W - WALL_INSET, HANG_Y, along],
    rotY: -Math.PI / 2,
  },
  {
    getPos: (along: number): [number, number, number] => [along, HANG_Y, HALF_D - WALL_INSET],
    rotY: Math.PI,
  },
  {
    getPos: (along: number): [number, number, number] => [-(HALF_W - WALL_INSET), HANG_Y, along],
    rotY: Math.PI / 2,
  },
];

function placeArtworks(artworks: ArtworkData[]): PlacedArtwork[] {
  if (artworks.length === 0) return [];
  const result: PlacedArtwork[] = [];
  const manual = artworks.filter((a) => a.isManuallyPlaced);
  const auto = artworks.filter((a) => !a.isManuallyPlaced);

  for (const artwork of manual) {
    result.push({
      artwork,
      position: [artwork.xPosition ?? 0, artwork.yPosition ?? HANG_Y, artwork.zPosition ?? -(HALF_D - WALL_INSET)],
      rotationY: artwork.rotation ?? 0,
    });
  }

  if (auto.length > 0) {
    const wallGroups: ArtworkData[][] = [[], [], [], []];
    auto.forEach((art, i) => wallGroups[i % 4].push(art));
    const USABLE_SPAN = (HALF_W - 1) * 2;
    wallGroups.forEach((group, w) => {
      if (group.length === 0) return;
      const wall = WALLS[w];
      const spacing = Math.min(3.2, USABLE_SPAN / group.length);
      const totalWidth = (group.length - 1) * spacing;
      const start = -totalWidth / 2;
      group.forEach((artwork, i) => {
        result.push({ artwork, position: wall.getPos(start + i * spacing), rotationY: wall.rotY });
      });
    });
  }
  return result;
}

// Procedural checkerboard floor texture
function makeFloorTexture(color1: string, color2: string, size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const tileCount = 8;
  const tileSize = size / tileCount;
  for (let row = 0; row < tileCount; row++) {
    for (let col = 0; col < tileCount; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? color1 : color2;
      ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

// Procedural wall texture (subtle linen/plaster)
function makeWallTexture(baseColor: string, size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  // Subtle noise grain
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const brightness = (Math.random() - 0.5) * 25;
    const r = parseInt(baseColor.slice(1, 3), 16) + brightness;
    const g = parseInt(baseColor.slice(3, 5), 16) + brightness;
    const b = parseInt(baseColor.slice(5, 7), 16) + brightness;
    ctx.fillStyle = `rgba(${Math.max(0,Math.min(255,r))},${Math.max(0,Math.min(255,g))},${Math.max(0,Math.min(255,b))},0.25)`;
    ctx.fillRect(x, y, 2, 2);
  }
  // Subtle horizontal lines (plaster lines)
  ctx.strokeStyle = "rgba(0,0,0,0.06)";
  ctx.lineWidth = 1;
  for (let y = 40; y < size; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

// WASD movement controller
function MovementController({ enabled }: { enabled: boolean }) {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (["ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useFrame(({ camera }, delta) => {
    if (!enabled) return;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const move = new THREE.Vector3();
    if (keys.current.has("KeyW") || keys.current.has("ArrowUp")) move.addScaledVector(forward, 1);
    if (keys.current.has("KeyS") || keys.current.has("ArrowDown")) move.addScaledVector(forward, -1);
    if (keys.current.has("KeyA") || keys.current.has("ArrowLeft")) move.addScaledVector(right, -1);
    if (keys.current.has("KeyD") || keys.current.has("ArrowRight")) move.addScaledVector(right, 1);
    if (move.lengthSq() > 0.001) {
      const SPEED = 7;
      move.normalize().multiplyScalar(SPEED * delta);
      camera.position.add(move);
      camera.position.x = Math.max(-(HALF_W - 0.6), Math.min(HALF_W - 0.6, camera.position.x));
      camera.position.z = Math.max(-(HALF_D - 0.6), Math.min(HALF_D - 0.6, camera.position.z));
      camera.position.y = EYE_Y;
    }
  });

  return null;
}

// Gallery spot light above each artwork
function ArtworkSpotLight({
  position,
  targetPosition,
  color,
  intensity,
}: {
  position: [number, number, number];
  targetPosition: [number, number, number];
  color: string;
  intensity: number;
}) {
  const targetRef = useRef<THREE.Object3D>(null);
  const lightRef = useRef<THREE.SpotLight>(null);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);

  return (
    <>
      <object3D ref={targetRef} position={targetPosition} />
      <spotLight
        ref={lightRef}
        position={position}
        color={color}
        intensity={intensity}
        angle={0.4}
        penumbra={0.6}
        distance={12}
        castShadow={false}
      />
    </>
  );
}

interface GallerySceneProps {
  artworks: ArtworkData[];
  roomTheme: string;
  isLocked: boolean;
  isMobile: boolean;
  joystickRef: React.RefObject<JoystickState>;
  onLock: () => void;
  onUnlock: () => void;
  onArtworkSelect: (artwork: ArtworkData) => void;
}

export function GalleryScene({
  artworks,
  roomTheme,
  isLocked,
  isMobile,
  joystickRef,
  onLock,
  onUnlock,
  onArtworkSelect,
}: GallerySceneProps) {
  const theme = getTheme(roomTheme);
  const controlsRef = useRef<any>(null);
  const { camera, gl, scene } = useThree();

  const placedArtworks = placeArtworks(artworks);

  const artworksRef = useRef(artworks);
  artworksRef.current = artworks;
  const onSelectRef = useRef(onArtworkSelect);
  onSelectRef.current = onArtworkSelect;
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  // Procedural textures — memoized per theme
  const floorTexture = useMemo(() => makeFloorTexture(theme.floorGrid, theme.floorColor), [theme.floorGrid, theme.floorColor]);
  const wallTexture = useMemo(() => makeWallTexture(theme.wallColor), [theme.wallColor]);

  useEffect(() => {
    camera.position.set(0, EYE_Y, HALF_D - 1.5);
  }, [camera]);

  useEffect(() => {
    if (isMobile) return;
    const controls = controlsRef.current;
    if (!controls) return;
    const handleLock = () => onLockRef.current();
    const handleUnlock = () => onUnlockRef.current();
    controls.addEventListener("lock", handleLock);
    controls.addEventListener("unlock", handleUnlock);
    return () => {
      controls.removeEventListener("lock", handleLock);
      controls.removeEventListener("unlock", handleUnlock);
    };
  }, [isMobile]);

  const fireCenterRaycast = useCallback(() => {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.artworkId !== undefined) {
          const artwork = artworksRef.current.find((a) => a.id === obj!.userData.artworkId);
          if (artwork) {
            if (!isMobile) controlsRef.current?.unlock();
            onSelectRef.current(artwork);
          }
          return;
        }
        obj = obj.parent;
      }
    }
  }, [camera, scene, isMobile]);

  useEffect(() => {
    if (isMobile) return;
    const canvas = gl.domElement;
    const handleClick = () => {
      if (!document.pointerLockElement) return;
      fireCenterRaycast();
    };
    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [gl, isMobile, fireCenterRaycast]);

  const fogColor = new THREE.Color(theme.fogColor);
  const BASEBOARD_H = 0.18;
  const BASEBOARD_Y = -HALF_H + BASEBOARD_H / 2;
  const CORNICE_H = 0.14;
  const CORNICE_Y = HALF_H - CORNICE_H / 2;

  return (
    <>
      <color attach="background" args={[theme.fogColor]} />
      <fog attach="fog" args={[fogColor, theme.fogNear, theme.fogFar]} />

      {/* ── Lighting ── */}
      {/* Bright ambient for baseline room visibility */}
      <ambientLight intensity={theme.ambientIntensity} color="#fff8f0" />

      {/* Central overhead fill light */}
      <pointLight
        position={[0, HALF_H - 0.3, 0]}
        intensity={theme.spotIntensity * 80}
        color={theme.accentLight}
        distance={28}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Four corner fill lights for even wall illumination */}
      <pointLight position={[HALF_W * 0.6, HALF_H - 1, -HALF_D * 0.6]} intensity={theme.spotIntensity * 30} color="#fff5e8" distance={20} decay={2} />
      <pointLight position={[-HALF_W * 0.6, HALF_H - 1, -HALF_D * 0.6]} intensity={theme.spotIntensity * 30} color="#fff5e8" distance={20} decay={2} />
      <pointLight position={[HALF_W * 0.6, HALF_H - 1, HALF_D * 0.6]} intensity={theme.spotIntensity * 30} color="#fff5e8" distance={20} decay={2} />
      <pointLight position={[-HALF_W * 0.6, HALF_H - 1, HALF_D * 0.6]} intensity={theme.spotIntensity * 30} color="#fff5e8" distance={20} decay={2} />

      {/* Artwork-level accent spotlights along each wall */}
      {[-5, 0, 5].map((x) => (
        <ArtworkSpotLight
          key={`back-${x}`}
          position={[x, HALF_H - 0.5, -HALF_D + 3]}
          targetPosition={[x, HANG_Y, -(HALF_D - 0.5)]}
          color={theme.accentLight}
          intensity={theme.spotIntensity * 40}
        />
      ))}
      {[-5, 0, 5].map((z) => (
        <ArtworkSpotLight
          key={`right-${z}`}
          position={[HALF_W - 3, HALF_H - 0.5, z]}
          targetPosition={[HALF_W - 0.5, HANG_Y, z]}
          color={theme.accentLight}
          intensity={theme.spotIntensity * 35}
        />
      ))}
      {[-5, 0, 5].map((x) => (
        <ArtworkSpotLight
          key={`front-${x}`}
          position={[x, HALF_H - 0.5, HALF_D - 3]}
          targetPosition={[x, HANG_Y, HALF_D - 0.5]}
          color={theme.accentLight}
          intensity={theme.spotIntensity * 35}
        />
      ))}
      {[-5, 0, 5].map((z) => (
        <ArtworkSpotLight
          key={`left-${z}`}
          position={[-HALF_W + 3, HALF_H - 0.5, z]}
          targetPosition={[-(HALF_W - 0.5), HANG_Y, z]}
          color={theme.accentLight}
          intensity={theme.spotIntensity * 35}
        />
      ))}

      {/* ── Floor ── */}
      <mesh position={[0, -HALF_H, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[HALF_W * 2, HALF_D * 2]} />
        <meshStandardMaterial map={floorTexture} roughness={0.7} metalness={0.05} />
      </mesh>

      {/* ── Ceiling ── */}
      <mesh position={[0, HALF_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALF_W * 2, HALF_D * 2]} />
        <meshStandardMaterial color={theme.ceilingColor} roughness={0.95} />
      </mesh>

      {/* ── Ceiling light fixtures (decorative) ── */}
      {[[-4, 0], [4, 0], [0, -4], [0, 4]].map(([x, z], i) => (
        <mesh key={i} position={[x, HALF_H - 0.02, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.04, 16]} />
          <meshStandardMaterial color={theme.accentLight} emissive={theme.accentLight} emissiveIntensity={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* ── Walls ── */}
      {/* Back wall (-z) */}
      <mesh position={[0, 0, -HALF_D]} receiveShadow>
        <planeGeometry args={[HALF_W * 2, HALF_H * 2]} />
        <meshStandardMaterial map={wallTexture} roughness={0.85} />
      </mesh>
      {/* Front wall (+z) */}
      <mesh position={[0, 0, HALF_D]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[HALF_W * 2, HALF_H * 2]} />
        <meshStandardMaterial map={wallTexture} roughness={0.85} />
      </mesh>
      {/* Left wall (-x) */}
      <mesh position={[-HALF_W, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[HALF_D * 2, HALF_H * 2]} />
        <meshStandardMaterial map={wallTexture} roughness={0.85} />
      </mesh>
      {/* Right wall (+x) */}
      <mesh position={[HALF_W, 0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[HALF_D * 2, HALF_H * 2]} />
        <meshStandardMaterial map={wallTexture} roughness={0.85} />
      </mesh>

      {/* ── Baseboards (bottom of every wall) ── */}
      <mesh position={[0, BASEBOARD_Y, -HALF_D + 0.02]}>
        <boxGeometry args={[HALF_W * 2, BASEBOARD_H, 0.06]} />
        <meshStandardMaterial color={theme.baseboardColor} roughness={0.6} />
      </mesh>
      <mesh position={[0, BASEBOARD_Y, HALF_D - 0.02]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[HALF_W * 2, BASEBOARD_H, 0.06]} />
        <meshStandardMaterial color={theme.baseboardColor} roughness={0.6} />
      </mesh>
      <mesh position={[-HALF_W + 0.02, BASEBOARD_Y, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[HALF_D * 2, BASEBOARD_H, 0.06]} />
        <meshStandardMaterial color={theme.baseboardColor} roughness={0.6} />
      </mesh>
      <mesh position={[HALF_W - 0.02, BASEBOARD_Y, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[HALF_D * 2, BASEBOARD_H, 0.06]} />
        <meshStandardMaterial color={theme.baseboardColor} roughness={0.6} />
      </mesh>

      {/* ── Cornice strips (top of every wall) ── */}
      <mesh position={[0, CORNICE_Y, -HALF_D + 0.02]}>
        <boxGeometry args={[HALF_W * 2, CORNICE_H, 0.05]} />
        <meshStandardMaterial color={theme.baseboardColor} roughness={0.5} />
      </mesh>
      <mesh position={[0, CORNICE_Y, HALF_D - 0.02]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[HALF_W * 2, CORNICE_H, 0.05]} />
        <meshStandardMaterial color={theme.baseboardColor} roughness={0.5} />
      </mesh>
      <mesh position={[-HALF_W + 0.02, CORNICE_Y, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[HALF_D * 2, CORNICE_H, 0.05]} />
        <meshStandardMaterial color={theme.baseboardColor} roughness={0.5} />
      </mesh>
      <mesh position={[HALF_W - 0.02, CORNICE_Y, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[HALF_D * 2, CORNICE_H, 0.05]} />
        <meshStandardMaterial color={theme.baseboardColor} roughness={0.5} />
      </mesh>

      {/* ── Artwork frames ── */}
      {placedArtworks.map(({ artwork, position, rotationY }) => (
        <ArtworkFrame
          key={artwork.id}
          artwork={artwork}
          position={position}
          rotationY={rotationY}
          frameColor={theme.frameColor}
          labelColor={theme.labelColor}
          onSelect={(a) => {
            if (!isMobile) controlsRef.current?.unlock();
            onSelectRef.current(a);
          }}
        />
      ))}

      {/* Desktop controls */}
      {!isMobile && <PointerLockControls ref={controlsRef} makeDefault />}
      {!isMobile && <MovementController enabled={isLocked} />}

      {/* Mobile controls */}
      {isMobile && (
        <TouchControls
          enabled={isLocked}
          joystickRef={joystickRef}
          onArtworkTap={fireCenterRaycast}
        />
      )}
    </>
  );
}
