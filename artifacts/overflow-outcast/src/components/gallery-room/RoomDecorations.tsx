import { useMemo } from "react";
import * as THREE from "three";
import { createRng, rngFloat, rngInt } from "./seeded-rng";
import type { RoomDims } from "./room-dimensions";
import type { ThemeConfig } from "./theme-config";

/**
 * Scale reference:
 *   Camera eye at y=0, floor at y=-halfH (default -4.5).
 *   Eye-to-floor = 4.5u ≈ 1.65m  →  1 real metre ≈ 2.73 units.
 *
 *   Bench seat:     0.45m → 1.23u  (top of seat)
 *   Plinth top:     1.10m → 3.00u
 *   Floor lamp tip: 1.80m → 4.91u  (shade at roughly eye level)
 *   Tall plant:     1.50m → 4.09u
 *   Placard top:    1.40m → 3.82u
 */

interface RoomDecorationsProps {
  seed: number;
  decorationLevel: number;
  dims: RoomDims;
  theme: ThemeConfig;
  artworkPositions: Array<{ x: number; z: number }>;
}

function decoCount(level: number, min: number, max: number): number {
  return Math.round(min + ((level - 1) / 9) * (max - min));
}

type Occupied = { x: number; z: number; r: number };

function snap(v: number, grid = 0.5): number {
  return Math.round(v / grid) * grid;
}

function isClear(x: number, z: number, occupied: Occupied[], r: number): boolean {
  for (const p of occupied) {
    const dx = x - p.x;
    const dz = z - p.z;
    if (dx * dx + dz * dz < (r + p.r) * (r + p.r)) return false;
  }
  return true;
}

function tryPlace(
  rng: () => number,
  occupied: Occupied[],
  r: number,
  xMin: number, xMax: number,
  zMin: number, zMax: number,
  tries = 40,
  gridSize = 0.5,
): [number, number] | null {
  for (let i = 0; i < tries; i++) {
    const x = snap(rngFloat(rng, xMin, xMax), gridSize);
    const z = snap(rngFloat(rng, zMin, zMax), gridSize);
    if (isClear(x, z, occupied, r)) {
      occupied.push({ x, z, r });
      return [x, z];
    }
  }
  return null;
}

// ─── Bench ────────────────────────────────────────────────────────────────────
function GalleryBench({ x, z, rotY, color }: { x: number; z: number; rotY: number; color: string }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]} userData={{ decorProp: true }}>
      {/* Seat */}
      <mesh position={[0, 1.22, 0]} castShadow>
        <boxGeometry args={[3.4, 0.12, 0.75]} />
        <meshStandardMaterial color={color} roughness={0.68} metalness={0.04} />
      </mesh>
      {/* Seat front bevel strip */}
      <mesh position={[0, 1.16, 0.34]}>
        <boxGeometry args={[3.4, 0.07, 0.04]} />
        <meshStandardMaterial color={color} roughness={0.60} />
      </mesh>
      {/* Four legs */}
      {([-1.4, 1.4] as const).map((lx) =>
        ([-0.29, 0.29] as const).map((lz, li) => (
          <mesh key={`${lx}-${li}`} position={[lx, 0.61, lz]} castShadow>
            <boxGeometry args={[0.10, 1.22, 0.10]} />
            <meshStandardMaterial color={color} roughness={0.68} />
          </mesh>
        ))
      )}
      {/* Cross stretcher */}
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[2.95, 0.07, 0.07]} />
        <meshStandardMaterial color={color} roughness={0.68} />
      </mesh>
    </group>
  );
}

// ─── Plinth / Pedestal ────────────────────────────────────────────────────────
function Plinth({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]} userData={{ decorProp: true }}>
      {/* Column body */}
      <mesh position={[0, 1.52, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 3.04, 20]} />
        <meshStandardMaterial color={color} roughness={0.38} metalness={0.05} />
      </mesh>
      {/* Base slab */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.82, 0.10, 0.82]} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.04} />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, 3.08, 0]}>
        <boxGeometry args={[0.72, 0.09, 0.72]} />
        <meshStandardMaterial color={color} roughness={0.32} metalness={0.06} />
      </mesh>
    </group>
  );
}

// ─── Floor Lamp ───────────────────────────────────────────────────────────────
function FloorLamp({ x, z, accentColor, metalColor }: {
  x: number; z: number; accentColor: string; metalColor: string;
}) {
  return (
    <group position={[x, 0, z]} userData={{ decorProp: true }}>
      {/* Weighted base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.30, 0.34, 0.10, 20]} />
        <meshStandardMaterial color={metalColor} roughness={0.28} metalness={0.78} />
      </mesh>
      {/* Pole — 4.75u tall, reaching just above eye height */}
      <mesh position={[0, 2.43, 0]}>
        <cylinderGeometry args={[0.040, 0.044, 4.75, 10]} />
        <meshStandardMaterial color={metalColor} roughness={0.22} metalness={0.82} />
      </mesh>
      {/* Arm jutting out */}
      <mesh position={[0.28, 4.76, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.034, 0.034, 0.56, 10]} />
        <meshStandardMaterial color={metalColor} roughness={0.22} metalness={0.82} />
      </mesh>
      {/* Shade (cone, open end down) */}
      <mesh position={[0.56, 4.60, 0]} rotation={[Math.PI, 0, 0]}>
        <cylinderGeometry args={[0.0, 0.52, 0.40, 20, 1, true]} />
        <meshStandardMaterial color={metalColor} roughness={0.30} metalness={0.75} side={THREE.DoubleSide} />
      </mesh>
      {/* Inner emissive disc */}
      <mesh position={[0.56, 4.41, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.38, 20]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={1.8}
          roughness={0.1}
        />
      </mesh>
      {/* Point light spilling down from shade */}
      <pointLight
        position={[0.56, 4.35, 0]}
        color={accentColor}
        intensity={60}
        distance={10}
        decay={2}
      />
    </group>
  );
}

// ─── Potted Plant ─────────────────────────────────────────────────────────────
function PottedPlant({ x, z, potColor }: { x: number; z: number; potColor: string }) {
  return (
    <group position={[x, 0, z]} userData={{ decorProp: true }}>
      {/* Pot */}
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.40, 0.28, 0.92, 16]} />
        <meshStandardMaterial color={potColor} roughness={0.80} metalness={0.02} />
      </mesh>
      {/* Soil top */}
      <mesh position={[0, 0.93, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.38, 16]} />
        <meshStandardMaterial color="#2a1f14" roughness={0.95} />
      </mesh>
      {/* Main stem */}
      <mesh position={[0, 1.90, 0]}>
        <cylinderGeometry args={[0.042, 0.055, 1.94, 8]} />
        <meshStandardMaterial color="#3a5030" roughness={0.88} />
      </mesh>
      {/* Foliage cluster (3 overlapping spheres) */}
      <mesh position={[0, 3.30, 0]}>
        <sphereGeometry args={[0.82, 12, 10]} />
        <meshStandardMaterial color="#2d4a28" roughness={0.92} />
      </mesh>
      <mesh position={[0.44, 2.95, 0.18]}>
        <sphereGeometry args={[0.54, 10, 8]} />
        <meshStandardMaterial color="#345530" roughness={0.92} />
      </mesh>
      <mesh position={[-0.36, 3.00, -0.22]}>
        <sphereGeometry args={[0.50, 10, 8]} />
        <meshStandardMaterial color="#2a4226" roughness={0.92} />
      </mesh>
    </group>
  );
}

// ─── Placard Stand ────────────────────────────────────────────────────────────
function PlacardStand({ x, z, rotY, metalColor, cardColor }: {
  x: number; z: number; rotY: number; metalColor: string; cardColor: string;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]} userData={{ decorProp: true }}>
      {/* Pole */}
      <mesh position={[0, 1.96, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 3.92, 10]} />
        <meshStandardMaterial color={metalColor} roughness={0.35} metalness={0.70} />
      </mesh>
      {/* Base weight */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.20, 0.22, 0.12, 16]} />
        <meshStandardMaterial color={metalColor} roughness={0.30} metalness={0.72} />
      </mesh>
      {/* Plaque card */}
      <mesh position={[0, 3.50, 0.04]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.95, 0.68, 0.022]} />
        <meshStandardMaterial color={cardColor} roughness={0.55} />
      </mesh>
      {/* Card text lines (decorative stripes) */}
      {[3.65, 3.52, 3.41].map((y, i) => (
        <mesh key={i} position={[0, y, 0.052]} rotation={[-0.18, 0, 0]}>
          <boxGeometry args={[0.60 - i * 0.10, 0.028, 0.002]} />
          <meshStandardMaterial color={metalColor} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Ceiling Pendant Installation ─────────────────────────────────────────────
function CeilingInstallation({ seed, halfW, halfH, halfD, theme }: {
  seed: number; halfW: number; halfH: number; halfD: number; theme: ThemeConfig;
}) {
  const pendants = useMemo(() => {
    const rng = createRng((seed ^ 0xc0ffee) >>> 0);
    const count = 5 + rngInt(rng, 0, 4); // 5-8 pendants
    const isLight = theme.floorPattern === "marble";
    const barColor = isLight ? "#c8c4bc" : "#1e1a16";

    const result: Array<{
      x: number; z: number;
      dropLen: number;
      barW: number;
      barColor: string;
    }> = [];

    // Distribute along two axes for a cross/grid feel
    const span = Math.min(halfW * 0.7, halfD * 0.7);
    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1) - 0.5) * span * 1.8;
      const x = snap(t, 0.5);
      const z = snap(rngFloat(rng, -halfD * 0.15, halfD * 0.15), 0.5);
      const dropLen = 0.9 + rngFloat(rng, 0, 1.8); // 0.9 – 2.7u drop
      const barW = 1.2 + rngFloat(rng, 0, 2.0);    // 1.2 – 3.2u wide bar
      result.push({ x, z, dropLen, barW, barColor });
    }
    return result;
  }, [seed, halfW, halfH, halfD, theme]);

  const isLight = theme.floorPattern === "marble";
  const metalCol = isLight ? "#b8b4ac" : "#2a2520";
  const ceilY = halfH;

  return (
    <group>
      {pendants.map((p, i) => {
        const barY = ceilY - p.dropLen - 0.06;
        return (
          <group key={i} position={[p.x, 0, p.z]} userData={{ decorProp: true }}>
            {/* Ceiling rose/mount */}
            <mesh position={[0, ceilY - 0.04, 0]}>
              <cylinderGeometry args={[0.10, 0.10, 0.08, 16]} />
              <meshStandardMaterial color={metalCol} roughness={0.30} metalness={0.70} />
            </mesh>
            {/* Suspension cable */}
            <mesh position={[0, ceilY - p.dropLen / 2, 0]}>
              <cylinderGeometry args={[0.012, 0.012, p.dropLen, 6]} />
              <meshStandardMaterial color={metalCol} roughness={0.40} metalness={0.65} />
            </mesh>
            {/* LED bar body */}
            <mesh position={[0, barY, 0]}>
              <boxGeometry args={[p.barW, 0.10, 0.18]} />
              <meshStandardMaterial color={metalCol} roughness={0.25} metalness={0.80} />
            </mesh>
            {/* Emissive diffuser strip */}
            <mesh position={[0, barY - 0.055, 0]}>
              <boxGeometry args={[p.barW - 0.06, 0.014, 0.12]} />
              <meshStandardMaterial
                color={theme.accentLight}
                emissive={theme.accentLight}
                emissiveIntensity={isLight ? 1.2 : 2.2}
                roughness={0.1}
              />
            </mesh>
            {/* Light cast downward */}
            <pointLight
              position={[0, barY - 0.15, 0]}
              color={theme.accentLight}
              intensity={55 + p.barW * 18}
              distance={halfH * 2.2}
              decay={2}
            />
          </group>
        );
      })}
    </group>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function RoomDecorations({ seed, decorationLevel, dims, theme, artworkPositions }: RoomDecorationsProps) {
  const { halfW, halfH, halfD } = dims;
  const floorY = -halfH;

  const { benches, plinths, plants, placards, lamps } = useMemo(() => {
    const rng = createRng(seed === 0 ? 42 : seed);
    const occupied: Occupied[] = artworkPositions.map(p => ({ x: p.x, z: p.z, r: 1.5 }));

    const numBenches  = decoCount(decorationLevel, 0, 3);
    const numPlinths  = decoCount(decorationLevel, 0, 6);
    const numPlants   = Math.min(4, decoCount(decorationLevel, 1, 4));
    const numPlacards = decoCount(decorationLevel, 0, 4);
    const numLamps    = decoCount(decorationLevel, 1, 5);

    // ── Benches — centre floor zone ──────────────────────────────────────────
    const benches: Array<{ x: number; z: number; rotY: number }> = [];
    for (let i = 0; i < numBenches; i++) {
      const pos = tryPlace(rng, occupied, 2.2,
        -(halfW * 0.38), halfW * 0.38,
        -(halfD * 0.48), halfD * 0.48);
      if (pos) {
        const rotY = (Math.round(rng() * 4) * Math.PI) / 2; // snap to 90° increments
        benches.push({ x: pos[0], z: pos[1], rotY });
      }
    }

    // ── Plinths — near walls ──────────────────────────────────────────────────
    const plinths: Array<{ x: number; z: number }> = [];
    const wallBand = 1.8;
    const wallSetback = 0.65;
    for (let i = 0; i < numPlinths; i++) {
      const side = Math.floor(rng() * 4);
      let xMin: number, xMax: number, zMin: number, zMax: number;
      if (side === 0) { // north wall
        xMin = -(halfW - 2.0); xMax = halfW - 2.0;
        zMin = -(halfD - wallBand); zMax = -(halfD - wallSetback);
      } else if (side === 1) { // east wall
        xMin = halfW - wallBand; xMax = halfW - wallSetback;
        zMin = -(halfD - 2.0); zMax = halfD - 2.0;
      } else if (side === 2) { // south wall
        xMin = -(halfW - 2.0); xMax = halfW - 2.0;
        zMin = halfD - wallBand; zMax = halfD - wallSetback;
      } else { // west wall
        xMin = -(halfW - wallSetback); xMax = -(halfW - wallBand);
        zMin = -(halfD - 2.0); zMax = halfD - 2.0;
      }
      if (xMin > xMax) [xMin, xMax] = [xMax, xMin];
      if (zMin > zMax) [zMin, zMax] = [zMax, zMin];
      const pos = tryPlace(rng, occupied, 0.9, xMin, xMax, zMin, zMax);
      if (pos) plinths.push({ x: pos[0], z: pos[1] });
    }

    // ── Plants — corners ──────────────────────────────────────────────────────
    const corners = [
      { x: -(halfW - 1.4), z: -(halfD - 1.4) },
      { x:  (halfW - 1.4), z: -(halfD - 1.4) },
      { x: -(halfW - 1.4), z:  (halfD - 1.4) },
      { x:  (halfW - 1.4), z:  (halfD - 1.4) },
    ].sort(() => rng() - 0.5);
    const plants: Array<{ x: number; z: number }> = [];
    for (const corner of corners.slice(0, numPlants)) {
      const sx = snap(corner.x, 0.5);
      const sz = snap(corner.z, 0.5);
      if (isClear(sx, sz, occupied, 1.0)) {
        occupied.push({ x: sx, z: sz, r: 1.0 });
        plants.push({ x: sx, z: sz });
      }
    }

    // ── Placard stands — beside artworks ─────────────────────────────────────
    const placards: Array<{ x: number; z: number; rotY: number }> = [];
    const artPool = [...artworkPositions];
    for (let i = 0; i < Math.min(numPlacards, artPool.length); i++) {
      const idx = Math.floor(rng() * artPool.length);
      const art = artPool.splice(idx, 1)[0];
      const offset = rngFloat(rng, 0.6, 1.0) * (rng() > 0.5 ? 1 : -1);
      const px = snap(art.x + offset, 0.5);
      const pz = snap(art.z + rngFloat(rng, -0.3, 0.3), 0.5);
      const rotY = rngFloat(rng, -0.5, 0.5);
      if (isClear(px, pz, occupied, 0.5)) {
        occupied.push({ x: px, z: pz, r: 0.5 });
        placards.push({ x: px, z: pz, rotY });
      }
    }

    // ── Floor lamps — near walls ──────────────────────────────────────────────
    const lamps: Array<{ x: number; z: number }> = [];
    for (let i = 0; i < numLamps; i++) {
      const side = Math.floor(rng() * 4);
      let xMin: number, xMax: number, zMin: number, zMax: number;
      const lampBand = 1.6;
      const lampSet = 0.50;
      if (side === 0) {
        xMin = -(halfW * 0.75); xMax = halfW * 0.75;
        zMin = -(halfD - lampBand); zMax = -(halfD - lampSet);
      } else if (side === 1) {
        xMin = halfW - lampBand; xMax = halfW - lampSet;
        zMin = -(halfD * 0.75); zMax = halfD * 0.75;
      } else if (side === 2) {
        xMin = -(halfW * 0.75); xMax = halfW * 0.75;
        zMin = halfD - lampBand; zMax = halfD - lampSet;
      } else {
        xMin = -(halfW - lampSet); xMax = -(halfW - lampBand);
        zMin = -(halfD * 0.75); zMax = halfD * 0.75;
      }
      if (xMin > xMax) [xMin, xMax] = [xMax, xMin];
      if (zMin > zMax) [zMin, zMax] = [zMax, zMin];
      const pos = tryPlace(rng, occupied, 0.8, xMin, xMax, zMin, zMax);
      if (pos) lamps.push({ x: pos[0], z: pos[1] });
    }

    return { benches, plinths, plants, placards, lamps };
  }, [seed, decorationLevel, halfW, halfD, artworkPositions]);

  const isLight  = theme.floorPattern === "marble";
  const benchCol  = isLight ? "#6a6055" : "#16120d";
  const plinthCol = isLight ? "#c8c4bc" : "#d8d4cc";
  const metalCol  = isLight ? "#909090" : "#888070";
  const potCol    = isLight ? "#7a6450" : "#3a2818";
  const cardCol   = isLight ? "#f0eee8" : "#181410";

  return (
    <>
      {/* ── Ceiling pendant installation ── */}
      <CeilingInstallation
        seed={seed}
        halfW={halfW}
        halfH={halfH}
        halfD={halfD}
        theme={theme}
      />

      {/* ── Benches ── */}
      {benches.map((b, i) => (
        <group key={`bench-${i}`} position={[b.x, floorY, b.z]}>
          <GalleryBench x={0} z={0} rotY={b.rotY} color={benchCol} />
        </group>
      ))}

      {/* ── Plinths ── */}
      {plinths.map((p, i) => (
        <group key={`plinth-${i}`} position={[p.x, floorY, p.z]}>
          <Plinth x={0} z={0} color={plinthCol} />
        </group>
      ))}

      {/* ── Plants ── */}
      {plants.map((p, i) => (
        <group key={`plant-${i}`} position={[p.x, floorY, p.z]}>
          <PottedPlant x={0} z={0} potColor={potCol} />
        </group>
      ))}

      {/* ── Placard stands ── */}
      {placards.map((p, i) => (
        <group key={`placard-${i}`} position={[p.x, floorY, p.z]}>
          <PlacardStand x={0} z={0} rotY={p.rotY} metalColor={metalCol} cardColor={cardCol} />
        </group>
      ))}

      {/* ── Floor lamps ── */}
      {lamps.map((l, i) => (
        <group key={`lamp-${i}`} position={[l.x, floorY, l.z]}>
          <FloorLamp x={0} z={0} accentColor={theme.accentLight} metalColor={metalCol} />
        </group>
      ))}
    </>
  );
}
