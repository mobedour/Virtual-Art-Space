import { useMemo } from "react";
import { createRng, rngFloat } from "./seeded-rng";
import type { RoomDims } from "./room-dimensions";
import type { ThemeConfig } from "./theme-config";

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

function isClear(x: number, z: number, occupied: Occupied[], r: number): boolean {
  for (const p of occupied) {
    const dx = x - p.x;
    const dz = z - p.z;
    if (Math.sqrt(dx * dx + dz * dz) < r + p.r) return false;
  }
  return true;
}

function tryPlace(
  rng: () => number,
  occupied: Occupied[],
  r: number,
  xMin: number, xMax: number,
  zMin: number, zMax: number,
  tries = 30
): [number, number] | null {
  for (let i = 0; i < tries; i++) {
    const x = rngFloat(rng, xMin, xMax);
    const z = rngFloat(rng, zMin, zMax);
    if (isClear(x, z, occupied, r)) {
      occupied.push({ x, z, r });
      return [x, z];
    }
  }
  return null;
}

type BenchData     = { x: number; z: number; rotY: number };
type PlinthData    = { x: number; z: number };
type PlantData     = { x: number; z: number };
type PlacardData   = { x: number; z: number; rotY: number };
type SpotRigData   = { x: number; z: number; rotY: number };

export function RoomDecorations({ seed, decorationLevel, dims, theme, artworkPositions }: RoomDecorationsProps) {
  const { halfW, halfH, halfD } = dims;

  const { benches, plinths, plants, placards, spotRigs } = useMemo(() => {
    const rng = createRng(seed === 0 ? 42 : seed);
    const occupied: Occupied[] = artworkPositions.map(p => ({ x: p.x, z: p.z, r: 1.2 }));

    const numBenches  = decoCount(decorationLevel, 0, 4);
    const numPlinths  = decoCount(decorationLevel, 0, 8);
    const numPlants   = Math.min(4, decoCount(decorationLevel, 0, 4));
    const numPlacards = decoCount(decorationLevel, 0, 6);
    const numSpots    = decoCount(decorationLevel, 0, 8);

    // ── Benches (centre floor) ────────────────────────────────────────────────
    const benches: BenchData[] = [];
    for (let i = 0; i < numBenches; i++) {
      const pos = tryPlace(rng, occupied, 1.5,
        -(halfW * 0.35), halfW * 0.35,
        -(halfD * 0.45), halfD * 0.45);
      if (pos) benches.push({ x: pos[0], z: pos[1], rotY: rngFloat(rng, 0, Math.PI) });
    }

    // ── Plinths / pedestals (near walls) ─────────────────────────────────────
    const plinths: PlinthData[] = [];
    const minDist = 0.5, maxDist = 2.0;
    for (let i = 0; i < numPlinths; i++) {
      const side = Math.floor(rng() * 4);
      let xMin: number, xMax: number, zMin: number, zMax: number;
      if (side === 0) {
        xMin = -(halfW - 1.5); xMax = halfW - 1.5;
        zMin = -(halfD - minDist); zMax = -(halfD - maxDist);
        if (zMin > zMax) { const t = zMin; zMin = zMax; zMax = t; }
      } else if (side === 1) {
        xMin = halfW - maxDist; xMax = halfW - minDist;
        zMin = -(halfD - 1.5); zMax = halfD - 1.5;
      } else if (side === 2) {
        xMin = -(halfW - 1.5); xMax = halfW - 1.5;
        zMin = halfD - maxDist; zMax = halfD - minDist;
      } else {
        xMin = -(halfW - minDist); xMax = -(halfW - maxDist);
        if (xMin > xMax) { const t = xMin; xMin = xMax; xMax = t; }
        zMin = -(halfD - 1.5); zMax = halfD - 1.5;
      }
      const pos = tryPlace(rng, occupied, 0.8, xMin, xMax, zMin, zMax);
      if (pos) plinths.push({ x: pos[0], z: pos[1] });
    }

    // ── Potted plants (corners) ───────────────────────────────────────────────
    const cornerCandidates = [
      { x: -(halfW - 1.2), z: -(halfD - 1.2) },
      { x:  (halfW - 1.2), z: -(halfD - 1.2) },
      { x: -(halfW - 1.2), z:  (halfD - 1.2) },
      { x:  (halfW - 1.2), z:  (halfD - 1.2) },
    ].sort(() => rng() - 0.5);
    const plants: PlantData[] = [];
    for (const corner of cornerCandidates.slice(0, numPlants)) {
      if (isClear(corner.x, corner.z, occupied, 0.8)) {
        occupied.push({ x: corner.x, z: corner.z, r: 0.8 });
        plants.push(corner);
      }
    }

    // ── Placard stands (near artwork positions) ───────────────────────────────
    const placards: PlacardData[] = [];
    const artworkPool = [...artworkPositions];
    for (let i = 0; i < Math.min(numPlacards, artworkPool.length); i++) {
      const idx = Math.floor(rng() * artworkPool.length);
      const art = artworkPool.splice(idx, 1)[0];
      const px = art.x + rngFloat(rng, -0.9, 0.9);
      const pz = art.z + rngFloat(rng, -0.3, 0.3);
      if (isClear(px, pz, occupied, 0.4)) {
        occupied.push({ x: px, z: pz, r: 0.4 });
        placards.push({ x: px, z: pz, rotY: rngFloat(rng, -0.4, 0.4) });
      }
    }

    // ── Floor spotlight rigs (near walls) ────────────────────────────────────
    const spotRigs: SpotRigData[] = [];
    for (let i = 0; i < numSpots; i++) {
      const side = Math.floor(rng() * 4);
      let xMin: number, xMax: number, zMin: number, zMax: number, rotY: number;
      const band = 1.0;
      if (side === 0) {
        xMin = -(halfW * 0.8); xMax = halfW * 0.8;
        zMin = -(halfD - band); zMax = -(halfD - band * 0.3);
        if (zMin > zMax) { const t = zMin; zMin = zMax; zMax = t; }
        rotY = Math.PI;
      } else if (side === 1) {
        xMin = halfW - band; xMax = halfW - band * 0.3;
        zMin = -(halfD * 0.8); zMax = halfD * 0.8;
        rotY = -Math.PI / 2;
      } else if (side === 2) {
        xMin = -(halfW * 0.8); xMax = halfW * 0.8;
        zMin = halfD - band * 0.3; zMax = halfD - band * 0.3 + 0.5;
        rotY = 0;
      } else {
        xMin = -(halfW - band * 0.3); xMax = -(halfW - band);
        if (xMin > xMax) { const t = xMin; xMin = xMax; xMax = t; }
        zMin = -(halfD * 0.8); zMax = halfD * 0.8;
        rotY = Math.PI / 2;
      }
      const pos = tryPlace(rng, occupied, 0.6, xMin, xMax, zMin, zMax);
      if (pos) spotRigs.push({ x: pos[0], z: pos[1], rotY: rotY + rngFloat(rng, -0.25, 0.25) });
    }

    return { benches, plinths, plants, placards, spotRigs };
  }, [seed, decorationLevel, halfW, halfD, artworkPositions]);

  const isLight  = theme.floorPattern === "marble";
  const benchCol = isLight ? "#7a7265" : "#1a1510";
  const plinthCol = isLight ? "#d4d0c8" : "#e2ddd0";
  const metalCol  = isLight ? "#909090" : "#888680";
  const potCol    = isLight ? "#8a7460" : "#3a2e24";
  const floorY    = -halfH;

  return (
    <>
      {/* ── Gallery benches ── */}
      {benches.map((b, i) => (
        <group key={`bench-${i}`} position={[b.x, floorY, b.z]} rotation={[0, b.rotY, 0]} userData={{ decorProp: true }}>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[2.4, 0.07, 0.52]} />
            <meshStandardMaterial color={benchCol} roughness={0.72} metalness={0.04} />
          </mesh>
          {([-0.95, 0.95] as const).map((lx, li) => (
            <mesh key={li} position={[lx, 0.2, 0]}>
              <boxGeometry args={[0.07, 0.4, 0.46]} />
              <meshStandardMaterial color={benchCol} roughness={0.72} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── Plinths / pedestals ── */}
      {plinths.map((p, i) => (
        <group key={`plinth-${i}`} position={[p.x, floorY, p.z]} userData={{ decorProp: true }}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.21, 0.24, 1.0, 16]} />
            <meshStandardMaterial color={plinthCol} roughness={0.42} metalness={0.04} />
          </mesh>
          <mesh position={[0, 1.03, 0]}>
            <boxGeometry args={[0.5, 0.035, 0.5]} />
            <meshStandardMaterial color={plinthCol} roughness={0.38} metalness={0.05} />
          </mesh>
        </group>
      ))}

      {/* ── Potted plants ── */}
      {plants.map((p, i) => (
        <group key={`plant-${i}`} position={[p.x, floorY, p.z]} userData={{ decorProp: true }}>
          <mesh position={[0, 0.19, 0]}>
            <cylinderGeometry args={[0.17, 0.13, 0.38, 12]} />
            <meshStandardMaterial color={potCol} roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.64, 0]}>
            <sphereGeometry args={[0.42, 10, 8]} />
            <meshStandardMaterial color="#2a4428" roughness={0.92} />
          </mesh>
        </group>
      ))}

      {/* ── Placard stands ── */}
      {placards.map((p, i) => (
        <group key={`placard-${i}`} position={[p.x, floorY, p.z]} rotation={[0, p.rotY, 0]} userData={{ decorProp: true }}>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 1.44, 8]} />
            <meshStandardMaterial color={metalCol} roughness={0.38} metalness={0.65} />
          </mesh>
          <mesh position={[0, 1.28, 0.04]} rotation={[-0.18, 0, 0]}>
            <boxGeometry args={[0.38, 0.25, 0.014]} />
            <meshStandardMaterial color={isLight ? "#f0eee8" : "#1e1a14"} roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* ── Floor spotlight rigs ── */}
      {spotRigs.map((s, i) => (
        <group key={`spot-${i}`} position={[s.x, floorY, s.z]} rotation={[0, s.rotY, 0]} userData={{ decorProp: true }}>
          {/* Three legs */}
          {([[-0.17, 0.14, 0.16], [0.17, 0.14, 0.16], [0, 0.14, -0.22]] as [number,number,number][]).map(([lx, ly, lz], li) => (
            <mesh key={li} position={[lx, ly, lz]}>
              <cylinderGeometry args={[0.018, 0.018, 0.88, 6]} />
              <meshStandardMaterial color={metalCol} roughness={0.32} metalness={0.72} />
            </mesh>
          ))}
          {/* Lamp cone */}
          <mesh position={[0, 0.94, 0]} rotation={[0.55, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.13, 0.22, 10]} />
            <meshStandardMaterial color={metalCol} roughness={0.22} metalness={0.82} />
          </mesh>
          {/* Emissive bulb */}
          <mesh position={[0, 0.9, 0]}>
            <sphereGeometry args={[0.038, 6, 6]} />
            <meshStandardMaterial
              color={theme.accentLight}
              emissive={theme.accentLight}
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}
