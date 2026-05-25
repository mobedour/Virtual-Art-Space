import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import { ArtworkFrame, type ArtworkData } from "./ArtworkFrame";
import { getTheme } from "./theme-config";
import { TouchControls } from "./TouchControls";
import type { JoystickState } from "./VirtualJoystick";

// Room half-dimensions (room spans -HALF to +HALF on each axis)
const HALF_W = 9;
const HALF_H = 4.5;
const HALF_D = 9;
const EYE_Y = 0;
const WALL_INSET = 0.12; // frames sit this far in front of wall surface
const HANG_Y = 0.8;

type PlacedArtwork = {
  artwork: ArtworkData;
  position: [number, number, number];
  rotationY: number;
};

const WALLS = [
  {
    // back wall (-z), frame faces +z
    getPos: (along: number): [number, number, number] => [
      along,
      HANG_Y,
      -(HALF_D - WALL_INSET),
    ],
    rotY: 0,
  },
  {
    // right wall (+x), frame faces -x
    getPos: (along: number): [number, number, number] => [
      HALF_W - WALL_INSET,
      HANG_Y,
      along,
    ],
    rotY: -Math.PI / 2,
  },
  {
    // front wall (+z), frame faces -z
    getPos: (along: number): [number, number, number] => [
      along,
      HANG_Y,
      HALF_D - WALL_INSET,
    ],
    rotY: Math.PI,
  },
  {
    // left wall (-x), frame faces +x
    getPos: (along: number): [number, number, number] => [
      -(HALF_W - WALL_INSET),
      HANG_Y,
      along,
    ],
    rotY: Math.PI / 2,
  },
];

function placeArtworks(artworks: ArtworkData[]): PlacedArtwork[] {
  if (artworks.length === 0) return [];

  const result: PlacedArtwork[] = [];

  // Separate manually placed artworks from auto-distributed ones
  const manual = artworks.filter((a) => a.isManuallyPlaced);
  const auto = artworks.filter((a) => !a.isManuallyPlaced);

  // Manually placed artworks use their stored 3D positions directly
  for (const artwork of manual) {
    result.push({
      artwork,
      position: [
        artwork.xPosition ?? 0,
        artwork.yPosition ?? HANG_Y,
        artwork.zPosition ?? -(HALF_D - WALL_INSET),
      ],
      rotationY: artwork.rotation ?? 0,
    });
  }

  // Auto-distribute remaining artworks round-robin across 4 walls
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
        result.push({
          artwork,
          position: wall.getPos(start + i * spacing),
          rotationY: wall.rotY,
        });
      });
    });
  }

  return result;
}

// WASD movement — lives inside Canvas so useFrame works
function MovementController({ enabled }: { enabled: boolean }) {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (["ArrowUp", "ArrowDown", "Space"].includes(e.code))
        e.preventDefault();
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

    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    const move = new THREE.Vector3();
    if (keys.current.has("KeyW") || keys.current.has("ArrowUp"))
      move.addScaledVector(forward, 1);
    if (keys.current.has("KeyS") || keys.current.has("ArrowDown"))
      move.addScaledVector(forward, -1);
    if (keys.current.has("KeyA") || keys.current.has("ArrowLeft"))
      move.addScaledVector(right, -1);
    if (keys.current.has("KeyD") || keys.current.has("ArrowRight"))
      move.addScaledVector(right, 1);

    if (move.lengthSq() > 0.001) {
      const SPEED = 7;
      move.normalize().multiplyScalar(SPEED * delta);
      camera.position.add(move);
      camera.position.x = Math.max(
        -(HALF_W - 0.6),
        Math.min(HALF_W - 0.6, camera.position.x)
      );
      camera.position.z = Math.max(
        -(HALF_D - 0.6),
        Math.min(HALF_D - 0.6, camera.position.z)
      );
      camera.position.y = EYE_Y;
    }
  });

  return null;
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

  // Keep latest refs to avoid stale closures
  const artworksRef = useRef(artworks);
  artworksRef.current = artworks;
  const onSelectRef = useRef(onArtworkSelect);
  onSelectRef.current = onArtworkSelect;
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  // Set initial camera position
  useEffect(() => {
    camera.position.set(0, EYE_Y, HALF_D - 1.5);
  }, [camera]);

  // Attach lock/unlock events to PointerLockControls (desktop only)
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

  // Center-raycast: fires on desktop click (when pointer locked) or mobile tap
  const fireCenterRaycast = useCallback(() => {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.artworkId !== undefined) {
          const artwork = artworksRef.current.find(
            (a) => a.id === obj!.userData.artworkId
          );
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

  // Desktop: canvas click fires center raycast when pointer is locked
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

  return (
    <>
      <color attach="background" args={[theme.fogColor]} />
      <fog attach="fog" args={[fogColor, theme.fogNear, theme.fogFar]} />

      {/* Lighting */}
      <ambientLight intensity={theme.ambientIntensity} />
      <pointLight
        position={[0, HALF_H - 0.5, 0]}
        intensity={theme.spotIntensity * 0.6}
        castShadow
        shadow-mapSize={[512, 512]}
      />
      {/* Spotlights aimed at the back and side walls for artwork illumination */}
      <spotLight
        position={[0, HALF_H - 0.8, -3]}
        target-position={[0, HANG_Y, -(HALF_D - 0.5)]}
        intensity={theme.spotIntensity}
        angle={0.55}
        penumbra={0.4}
        castShadow
      />
      <spotLight
        position={[3, HALF_H - 0.8, 0]}
        target-position={[HALF_W - 0.5, HANG_Y, 0]}
        intensity={theme.spotIntensity * 0.8}
        angle={0.55}
        penumbra={0.4}
      />
      <spotLight
        position={[-3, HALF_H - 0.8, 0]}
        target-position={[-(HALF_W - 0.5), HANG_Y, 0]}
        intensity={theme.spotIntensity * 0.8}
        angle={0.55}
        penumbra={0.4}
      />
      <spotLight
        position={[0, HALF_H - 0.8, 3]}
        target-position={[0, HANG_Y, HALF_D - 0.5]}
        intensity={theme.spotIntensity * 0.8}
        angle={0.55}
        penumbra={0.4}
      />

      {/* Floor */}
      <mesh
        position={[0, -HALF_H, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[HALF_W * 2, HALF_D * 2]} />
        <meshStandardMaterial color={theme.floorColor} roughness={0.95} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, HALF_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALF_W * 2, HALF_D * 2]} />
        <meshStandardMaterial color={theme.ceilingColor} roughness={1} />
      </mesh>

      {/* Back wall (-z) */}
      <mesh position={[0, 0, -HALF_D]} receiveShadow>
        <planeGeometry args={[HALF_W * 2, HALF_H * 2]} />
        <meshStandardMaterial color={theme.wallColor} roughness={0.9} />
      </mesh>

      {/* Front wall (+z, faces inward) */}
      <mesh
        position={[0, 0, HALF_D]}
        rotation={[0, Math.PI, 0]}
        receiveShadow
      >
        <planeGeometry args={[HALF_W * 2, HALF_H * 2]} />
        <meshStandardMaterial color={theme.wallColor} roughness={0.9} />
      </mesh>

      {/* Left wall (-x, faces +x inward) */}
      <mesh
        position={[-HALF_W, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[HALF_D * 2, HALF_H * 2]} />
        <meshStandardMaterial color={theme.wallColor} roughness={0.9} />
      </mesh>

      {/* Right wall (+x, faces -x inward) */}
      <mesh
        position={[HALF_W, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[HALF_D * 2, HALF_H * 2]} />
        <meshStandardMaterial color={theme.wallColor} roughness={0.9} />
      </mesh>

      {/* Artwork frames */}
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
