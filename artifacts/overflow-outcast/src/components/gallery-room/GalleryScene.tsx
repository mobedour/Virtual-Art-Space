import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { ArtworkFrame, type ArtworkData } from "./ArtworkFrame";
import { getTheme } from "./theme-config";
import { TouchControls } from "./TouchControls";
import type { JoystickState } from "./VirtualJoystick";
import { getRoomDims } from "./room-dimensions";
import { RoomDecorations } from "./RoomDecorations";

const EYE_Y = 0;
const WALL_INSET = 0.12;
const HANG_Y = 0.8;

type PlacedArtwork = {
  artwork: ArtworkData;
  position: [number, number, number];
  rotationY: number;
};

function getWallInfo(x: number, z: number, halfW: number, halfD: number): { wallIdx: number; along: number } | null {
  const THRESH = 0.6;
  if (Math.abs(z - (-(halfD - WALL_INSET))) < THRESH) return { wallIdx: 0, along: x };
  if (Math.abs(x - (halfW - WALL_INSET)) < THRESH)    return { wallIdx: 1, along: z };
  if (Math.abs(z - (halfD - WALL_INSET)) < THRESH)     return { wallIdx: 2, along: x };
  if (Math.abs(x - (-(halfW - WALL_INSET))) < THRESH)  return { wallIdx: 3, along: z };
  return null;
}

function resolveConflict(along: number, blocked: number[], minGap: number): number {
  let result = along;
  let attempts = 0;
  while (attempts < 20 && blocked.some((b) => Math.abs(result - b) < minGap)) {
    result += minGap;
    attempts++;
  }
  return result;
}

function placeArtworks(artworks: ArtworkData[], halfW: number, halfD: number): PlacedArtwork[] {
  if (artworks.length === 0) return [];

  const walls = [
    { getPos: (along: number): [number, number, number] => [along, HANG_Y, -(halfD - WALL_INSET)], rotY: 0 },
    { getPos: (along: number): [number, number, number] => [halfW - WALL_INSET, HANG_Y, along], rotY: -Math.PI / 2 },
    { getPos: (along: number): [number, number, number] => [along, HANG_Y, halfD - WALL_INSET], rotY: Math.PI },
    { getPos: (along: number): [number, number, number] => [-(halfW - WALL_INSET), HANG_Y, along], rotY: Math.PI / 2 },
  ];

  const result: PlacedArtwork[] = [];
  const manual = artworks.filter((a) => a.isManuallyPlaced);
  const auto   = artworks.filter((a) => !a.isManuallyPlaced);
  const blockedPerWall: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [] };

  for (const artwork of manual) {
    const pos: [number, number, number] = [artwork.xPosition ?? 0, artwork.yPosition ?? HANG_Y, artwork.zPosition ?? -(halfD - WALL_INSET)];
    result.push({ artwork, position: pos, rotationY: artwork.rotation ?? 0 });
    const info = getWallInfo(pos[0], pos[2], halfW, halfD);
    if (info) blockedPerWall[info.wallIdx].push(info.along);
  }

  if (auto.length > 0) {
    const wallGroups: ArtworkData[][] = [[], [], [], []];
    auto.forEach((art, i) => wallGroups[i % 4].push(art));
    const USABLE_SPAN = (halfW - 1) * 2;
    const MIN_GAP = 1.8;
    wallGroups.forEach((group, w) => {
      if (group.length === 0) return;
      const wall = walls[w];
      const spacing = Math.min(3.2, USABLE_SPAN / group.length);
      const totalWidth = (group.length - 1) * spacing;
      const start = -totalWidth / 2;
      const occupiedOnWall = [...blockedPerWall[w]];
      group.forEach((artwork, i) => {
        const rawAlong  = start + i * spacing;
        const safeAlong = resolveConflict(rawAlong, occupiedOnWall, MIN_GAP);
        occupiedOnWall.push(safeAlong);
        result.push({ artwork, position: wall.getPos(safeAlong), rotationY: wall.rotY });
      });
    });
  }
  return result;
}

// ─── Themed floor textures ────────────────────────────────────────────────────
function makeParquetFloor(c1: string, c2: string, size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const TILE = size / 6;
  const PLANK = TILE / 2;
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, size, size);
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 12; col++) {
      const isAlt = (Math.floor(col / 2) + Math.floor(row / 2)) % 2;
      for (let p = 0; p < 2; p++) {
        const x = col * PLANK;
        const y = row * PLANK;
        ctx.fillStyle = isAlt
          ? `hsl(${parseInt(c2.slice(1,3),16)*0.5 + 28},${25}%,${parseInt(c2.slice(1,3),16) / 5}%)`
          : c1;
        ctx.fillRect(x + 1, y + 1, PLANK - 2, PLANK - 2);
        ctx.strokeStyle = "rgba(0,0,0,0.07)";
        ctx.lineWidth = 0.5;
        for (let g = 4; g < PLANK - 2; g += 6) {
          ctx.beginPath(); ctx.moveTo(x + 1, y + g); ctx.lineTo(x + PLANK - 2, y + g + (Math.random()-0.5)*2); ctx.stroke();
        }
      }
    }
  }
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 12; i++) {
    ctx.beginPath(); ctx.moveTo(i*PLANK, 0); ctx.lineTo(i*PLANK, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*PLANK); ctx.lineTo(size, i*PLANK); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  return tex;
}

function makeNeonFloor(baseColor: string, gridColor: string, size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  const TILE = size / 8;
  ctx.shadowColor = gridColor;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(i*TILE, 0); ctx.lineTo(i*TILE, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*TILE); ctx.lineTo(size, i*TILE); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  ctx.strokeStyle = gridColor + "40"; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath(); ctx.moveTo(i*TILE/2, 0); ctx.lineTo(i*TILE/2, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*TILE/2); ctx.lineTo(size, i*TILE/2); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function makeMarbleFloor(baseColor: string, groutColor: string, size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const TILE = size / 4;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const tx = col * TILE; const ty = row * TILE;
      const grad = ctx.createLinearGradient(tx, ty, tx + TILE, ty + TILE);
      grad.addColorStop(0, baseColor);
      grad.addColorStop(0.4, groutColor + "88");
      grad.addColorStop(0.7, baseColor);
      grad.addColorStop(1, groutColor + "44");
      ctx.fillStyle = grad;
      ctx.fillRect(tx + 2, ty + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = "rgba(150,148,142,0.25)";
      ctx.lineWidth = 1;
      for (let v = 0; v < 3; v++) {
        const x0 = tx + Math.random() * TILE;
        const y0 = ty;
        const cx1 = tx + Math.random() * TILE;
        const cy1 = ty + TILE * 0.4;
        const x1 = tx + Math.random() * TILE;
        const y1 = ty + TILE;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx1, cy1, x1, y1); ctx.stroke();
      }
    }
  }
  ctx.strokeStyle = groutColor;
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i*TILE, 0); ctx.lineTo(i*TILE, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*TILE); ctx.lineTo(size, i*TILE); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function makeSlateTiles(baseColor: string, groutColor: string, size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  const W = size / 7; const H = W * 0.866;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 8; col++) {
      const ox = row % 2 === 0 ? 0 : W * 0.5;
      const x = col * W + ox; const y = row * H;
      const lum = 0.88 + Math.random() * 0.12;
      ctx.fillStyle = `rgba(${Math.random()*10+10},${Math.random()*5+5},${Math.random()*15+15},${lum * 0.15})`;
      ctx.fillRect(x + 2, y + 2, W - 4, H - 4);
    }
  }
  ctx.strokeStyle = groutColor + "aa";
  ctx.lineWidth = 2;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 8; col++) {
      const ox = row % 2 === 0 ? 0 : W * 0.5;
      const x = col * W + ox; const y = row * H;
      ctx.strokeRect(x + 1, y + 1, W - 2, H - 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.5, 2.5);
  return tex;
}

function makeConcreteFloor(baseColor: string, size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * size; const y = Math.random() * size;
    const b = (Math.random() - 0.5) * 20;
    ctx.fillStyle = `rgba(${128+b},${128+b},${128+b},0.12)`;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 2;
  const SLAB = size / 3;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath(); ctx.moveTo(i*SLAB, 0); ctx.lineTo(i*SLAB, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i*SLAB); ctx.lineTo(size, i*SLAB); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function makeWallTexture(baseColor: string, size = 512): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * size; const y = Math.random() * size;
    const b = (Math.random() - 0.5) * 22;
    const r = Math.max(0, Math.min(255, parseInt(baseColor.slice(1,3),16) + b));
    const g = Math.max(0, Math.min(255, parseInt(baseColor.slice(3,5),16) + b));
    const bv = Math.max(0, Math.min(255, parseInt(baseColor.slice(5,7),16) + b));
    ctx.fillStyle = `rgba(${r},${g},${bv},0.2)`;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.055)";
  ctx.lineWidth = 1;
  for (let y = 48; y < size; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

// ─── WASD movement ────────────────────────────────────────────────────────────
function MovementController({ enabled, halfW, halfD }: { enabled: boolean; halfW: number; halfD: number }) {
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { keys.current.add(e.code); if (["ArrowUp","ArrowDown","Space"].includes(e.code)) e.preventDefault(); };
    const onUp   = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);
  useFrame(({ camera }, delta) => {
    if (!enabled) return;
    const forward = new THREE.Vector3(); camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();
    const move = new THREE.Vector3();
    if (keys.current.has("KeyW") || keys.current.has("ArrowUp"))    move.addScaledVector(forward,  1);
    if (keys.current.has("KeyS") || keys.current.has("ArrowDown"))  move.addScaledVector(forward, -1);
    if (keys.current.has("KeyA") || keys.current.has("ArrowLeft"))  move.addScaledVector(right,   -1);
    if (keys.current.has("KeyD") || keys.current.has("ArrowRight")) move.addScaledVector(right,    1);
    if (move.lengthSq() > 0.001) {
      const SPEED = 7; move.normalize().multiplyScalar(SPEED * delta);
      camera.position.add(move);
      camera.position.x = Math.max(-(halfW - 0.6), Math.min(halfW - 0.6, camera.position.x));
      camera.position.z = Math.max(-(halfD - 0.6), Math.min(halfD - 0.6, camera.position.z));
      camera.position.y = EYE_Y;
    }
  });
  return null;
}

// ─── Per-artwork museum spotlight ─────────────────────────────────────────────
function ArtworkSpot({ position, targetPos, color, intensity }: {
  position: [number,number,number]; targetPos: [number,number,number]; color: string; intensity: number;
}) {
  const targetRef = useRef<THREE.Object3D>(null);
  const lightRef  = useRef<THREE.SpotLight>(null);
  useEffect(() => { if (lightRef.current && targetRef.current) lightRef.current.target = targetRef.current; }, []);
  return (
    <>
      <object3D ref={targetRef} position={targetPos} />
      <spotLight ref={lightRef} position={position} color={color} intensity={intensity}
        angle={0.35} penumbra={0.7} distance={14} castShadow={false} />
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
  inspectCallbackRef?: React.MutableRefObject<(() => void) | null>;
  roomSize?: number;
  roomMode?: string;
  roomSeed?: number;
  decorationLevel?: number;
}

export function GalleryScene({
  artworks, roomTheme, isLocked, isMobile, joystickRef, onLock, onUnlock, onArtworkSelect, inspectCallbackRef,
  roomSize = 5, roomMode = "basic", roomSeed = 0, decorationLevel = 5,
}: GallerySceneProps) {
  const theme = getTheme(roomTheme);
  const controlsRef = useRef<any>(null);
  const { camera, gl, scene } = useThree();

  const { halfW, halfH, halfD } = getRoomDims(roomSize);
  const fogScale = halfW / 9;

  const placedArtworks = useMemo(
    () => placeArtworks(artworks, halfW, halfD),
    [artworks, halfW, halfD]
  );

  const artworkPositions = useMemo(
    () => placedArtworks.map(({ position }) => ({ x: position[0], z: position[2] })),
    [placedArtworks]
  );

  const artworksRef  = useRef(artworks); artworksRef.current = artworks;
  const onSelectRef  = useRef(onArtworkSelect); onSelectRef.current = onArtworkSelect;
  const onLockRef    = useRef(onLock); onLockRef.current = onLock;
  const onUnlockRef  = useRef(onUnlock); onUnlockRef.current = onUnlock;

  const floorTexture = useMemo(() => {
    switch (theme.floorPattern) {
      case 'neon':     return makeNeonFloor(theme.floorColor, theme.floorGrid);
      case 'marble':   return makeMarbleFloor(theme.floorColor, theme.floorGrid);
      case 'slate':    return makeSlateTiles(theme.floorColor, theme.floorGrid);
      case 'concrete': return makeConcreteFloor(theme.floorColor);
      default:         return makeParquetFloor(theme.floorColor, theme.floorGrid);
    }
  }, [theme]);

  const wallTexture = useMemo(() => makeWallTexture(theme.wallColor), [theme.wallColor]);

  useEffect(() => { camera.position.set(0, EYE_Y, halfD - 1.5); }, [camera, halfD]);

  useEffect(() => {
    if (isMobile) return;
    const controls = controlsRef.current; if (!controls) return;
    const handleLock   = () => onLockRef.current();
    const handleUnlock = () => onUnlockRef.current();
    controls.addEventListener("lock", handleLock);
    controls.addEventListener("unlock", handleUnlock);
    return () => { controls.removeEventListener("lock", handleLock); controls.removeEventListener("unlock", handleUnlock); };
  }, [isMobile]);

  const fireCenterRaycast = useCallback(() => {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData.decorProp) break;
        if (obj.userData.artworkId !== undefined) {
          const artwork = artworksRef.current.find((a) => a.id === obj!.userData.artworkId);
          if (artwork) { if (!isMobile) controlsRef.current?.unlock(); onSelectRef.current(artwork); }
          return;
        }
        obj = obj.parent;
      }
    }
  }, [camera, scene, isMobile]);

  useEffect(() => {
    if (inspectCallbackRef) inspectCallbackRef.current = fireCenterRaycast;
  }, [inspectCallbackRef, fireCenterRaycast]);

  useEffect(() => {
    if (isMobile) return;
    const canvas = gl.domElement;
    const handleClick = () => { if (!document.pointerLockElement) return; fireCenterRaycast(); };
    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [gl, isMobile, fireCenterRaycast]);

  const fogColor = new THREE.Color(theme.fogColor);
  const BASEBOARD_H = 0.22;
  const BASEBOARD_Y = -halfH + BASEBOARD_H / 2;
  const CORNICE_H   = 0.16;
  const CORNICE_Y   = halfH - CORNICE_H / 2;

  const artworkSpots = placedArtworks.slice(0, 10).map(({ position, rotationY }) => {
    const lx = position[0] + Math.sin(rotationY) * 3;
    const lz = position[2] + Math.cos(rotationY) * 3;
    return {
      lightPos: [lx, halfH - 0.8, lz] as [number,number,number],
      targetPos: position,
    };
  });

  const fp = halfW * 0.44;
  const fixturePositions: [number, number][] = [[-fp, -fp], [fp, -fp], [-fp, fp], [fp, fp], [0, 0]];

  const isNeon    = theme.floorPattern === 'neon';
  const isLight   = theme.floorPattern === 'marble';
  const fillColor = isNeon ? theme.accentLight : isLight ? "#ffffff" : "#fff5e8";

  const showDecorations = roomMode !== "basic";

  return (
    <>
      <color attach="background" args={[theme.fogColor]} />
      <fog attach="fog" args={[fogColor, theme.fogNear * fogScale, theme.fogFar * fogScale]} />

      {/* ── Ambient ── */}
      <ambientLight intensity={theme.ambientIntensity} color={isLight ? "#ffffff" : "#fff8f0"} />

      {/* ── Central overhead fill ── */}
      <pointLight position={[0, halfH - 0.3, 0]} intensity={theme.spotIntensity * 140}
        color={theme.accentLight} distance={35 * fogScale} decay={2} />

      {/* ── Corner fill lights ── */}
      {([[-1,-1],[-1,1],[1,-1],[1,1]] as [number,number][]).map(([sx,sz], i) => (
        <pointLight key={i}
          position={[sx * halfW * 0.55, halfH - 1.2, sz * halfD * 0.55]}
          intensity={theme.spotIntensity * 48} color={fillColor} distance={28 * fogScale} decay={2} />
      ))}

      {/* ── Mid-height wall-wash fills (one per wall face) ── */}
      {([
        [0,           0, -(halfD * 0.78)],
        [0,           0,  (halfD * 0.78)],
        [-(halfW * 0.78), 0, 0],
        [ (halfW * 0.78), 0, 0],
      ] as [number,number,number][]).map((pos, i) => (
        <pointLight key={`ww-${i}`}
          position={pos}
          intensity={theme.spotIntensity * 32} color={fillColor} distance={18 * fogScale} decay={2} />
      ))}

      {/* ── Per-artwork museum spotlights ── */}
      {artworkSpots.map(({ lightPos, targetPos }, i) => (
        <ArtworkSpot key={i} position={lightPos} targetPos={targetPos}
          color={theme.accentLight} intensity={theme.spotIntensity * 55} />
      ))}

      {/* ── Environment (IBL) — drives reflections on every PBR material in the scene ── */}
      <Environment
        preset={
          isLight ? "apartment"
            : isNeon ? "night"
            : theme.floorPattern === "concrete" ? "warehouse"
            : theme.floorPattern === "slate" ? "night"
            : "sunset"
        }
        environmentIntensity={isLight ? 0.55 : isNeon ? 0.4 : 0.35}
        background={false}
      />

      {/* ── Floor ── */}
      <mesh position={[0, -halfH, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[halfW * 2, halfD * 2]} />
        <meshStandardMaterial
          map={floorTexture}
          roughness={isLight ? 0.12 : isNeon ? 0.28 : 0.52}
          metalness={isLight ? 0.18 : isNeon ? 0.42 : 0.06}
          envMapIntensity={isLight ? 1.2 : isNeon ? 1.0 : 0.75}
        />
      </mesh>

      {/* ── Ceiling ── */}
      <mesh position={[0, halfH, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[halfW * 2, halfD * 2]} />
        <meshStandardMaterial color={theme.ceilingColor} roughness={0.95} />
      </mesh>

      {/* ── Ceiling fixtures ── */}
      {fixturePositions.map(([x, z], i) => (
        <group key={i} position={[x, halfH - 0.01, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 0.06, 20]} />
            <meshStandardMaterial color={isLight ? "#d8d6d0" : "#2a2520"} roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.02, 20]} />
            <meshStandardMaterial color={theme.accentLight} emissive={theme.accentLight}
              emissiveIntensity={isNeon ? 2.5 : isLight ? 1.0 : 1.4} roughness={0.1} />
          </mesh>
          {isNeon && (
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
              <torusGeometry args={[0.22, 0.025, 8, 24]} />
              <meshStandardMaterial color={theme.accentLight} emissive={theme.accentLight} emissiveIntensity={3} />
            </mesh>
          )}
        </group>
      ))}

      {/* ── Walls ── */}
      <mesh position={[0, 0, -halfD]} receiveShadow>
        <planeGeometry args={[halfW * 2, halfH * 2]} />
        <meshStandardMaterial map={wallTexture} roughness={0.88} />
      </mesh>
      <mesh position={[0, 0, halfD]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[halfW * 2, halfH * 2]} />
        <meshStandardMaterial map={wallTexture} roughness={0.88} />
      </mesh>
      <mesh position={[-halfW, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[halfD * 2, halfH * 2]} />
        <meshStandardMaterial map={wallTexture} roughness={0.88} />
      </mesh>
      <mesh position={[halfW, 0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[halfD * 2, halfH * 2]} />
        <meshStandardMaterial map={wallTexture} roughness={0.88} />
      </mesh>

      {/* ── Baseboards ── */}
      {([
        [0, BASEBOARD_Y, -halfD+0.02, 0],
        [0, BASEBOARD_Y,  halfD-0.02, Math.PI],
        [-halfW+0.02, BASEBOARD_Y, 0, Math.PI/2],
        [ halfW-0.02, BASEBOARD_Y, 0, -Math.PI/2],
      ] as [number,number,number,number][]).map(([x,y,z,ry], i) => (
        <mesh key={i} position={[x,y,z]} rotation={[0,ry,0]}>
          <boxGeometry args={[i < 2 ? halfW*2 : halfD*2, BASEBOARD_H, 0.055]} />
          <meshStandardMaterial color={theme.baseboardColor} roughness={0.55} metalness={0.1} />
        </mesh>
      ))}

      {/* ── Cornice strips ── */}
      {([
        [0, CORNICE_Y, -halfD+0.02, 0],
        [0, CORNICE_Y,  halfD-0.02, Math.PI],
        [-halfW+0.02, CORNICE_Y, 0, Math.PI/2],
        [ halfW-0.02, CORNICE_Y, 0, -Math.PI/2],
      ] as [number,number,number,number][]).map(([x,y,z,ry], i) => (
        <mesh key={i} position={[x,y,z]} rotation={[0,ry,0]}>
          <boxGeometry args={[i < 2 ? halfW*2 : halfD*2, CORNICE_H, 0.048]} />
          <meshStandardMaterial color={theme.baseboardColor} roughness={0.5} />
        </mesh>
      ))}

      {/* ── Room decorations (auto / custom modes only) ── */}
      {showDecorations && (
        <RoomDecorations
          seed={roomSeed}
          decorationLevel={decorationLevel}
          dims={{ halfW, halfH, halfD }}
          theme={theme}
          artworkPositions={artworkPositions}
        />
      )}

      {/* ── Artwork frames ── */}
      {placedArtworks.map(({ artwork, position, rotationY }) => (
        <ArtworkFrame key={artwork.id} artwork={artwork} position={position} rotationY={rotationY}
          frameColor={theme.frameColor} labelColor={theme.labelColor}
          onSelect={(a) => { if (!isMobile) controlsRef.current?.unlock(); onSelectRef.current(a); }} />
      ))}

      {!isMobile && <PointerLockControls ref={controlsRef} makeDefault />}
      {!isMobile && <MovementController enabled={isLocked} halfW={halfW} halfD={halfD} />}
      {isMobile && <TouchControls enabled={isLocked} joystickRef={joystickRef} onArtworkTap={fireCenterRaycast} halfW={halfW} halfD={halfD} />}

    </>
  );
}
