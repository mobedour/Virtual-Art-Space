export type RoomDims = { halfW: number; halfH: number; halfD: number };

/**
 * Convert a room size (1–10) to actual half-extents.
 * Piecewise linear, anchored so size 5 = the original room {halfW:9, halfH:4.5, halfD:9}.
 *
 * Size 1  → halfW/D = 5,   halfH = 3   (intimate box)
 * Size 5  → halfW/D = 9,   halfH = 4.5 (original default)
 * Size 10 → halfW/D = 18,  halfH = 6.5 (grand hall)
 */
export function getRoomDims(size: number): RoomDims {
  const s = Math.max(1, Math.min(10, Math.round(size)));
  if (s <= 5) {
    const t = (s - 1) / 4; // 0 at size 1 → 1 at size 5
    return {
      halfW: 5 + t * 4,   // 5 → 9
      halfH: 3 + t * 1.5, // 3 → 4.5
      halfD: 5 + t * 4,   // 5 → 9
    };
  } else {
    const t = (s - 5) / 5; // 0 at size 5 → 1 at size 10
    return {
      halfW: 9 + t * 9,   // 9  → 18
      halfH: 4.5 + t * 2, // 4.5 → 6.5
      halfD: 9 + t * 9,   // 9  → 18
    };
  }
}

export const SIZE_LABELS: Record<number, string> = {
  1: "Intimate",
  2: "Small",
  3: "Cosy",
  4: "Compact",
  5: "Standard",
  6: "Spacious",
  7: "Large",
  8: "Grand",
  9: "Vast",
  10: "Monumental",
};

export const DECO_LABELS: Record<number, string> = {
  1: "Bare",
  2: "Minimal",
  3: "Sparse",
  4: "Light",
  5: "Balanced",
  6: "Furnished",
  7: "Rich",
  8: "Dense",
  9: "Lavish",
  10: "Immersive",
};
