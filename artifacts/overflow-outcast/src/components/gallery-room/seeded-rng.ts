/**
 * mulberry32 — a fast, seedable PRNG with good statistical properties.
 * Returns a function that produces floats in [0, 1) deterministically from the seed.
 */
export function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a random int in [min, max] inclusive using the provided rng. */
export function rngInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Pick a random float in [min, max) using the provided rng. */
export function rngFloat(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}
