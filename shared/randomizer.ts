/**
 * Setup randomizer in the spirit of uiqoo's BoardLife tool
 * (https://uiqoo.kr/boardgames/gaiaproject/randomizer.html).
 *
 * Player count picks the official board shape. "Center sectors 01-04" keeps
 * tiles 1-4 in the inner cluster (rulebook method 2); otherwise every sector
 * is shuffled (method 3). Rotations are random. Adjacent same-type home
 * planets are rejected (German rules).
 */

export type SectorPlacement = {
  sector: string;
  rotation: number;
  center: { q: number; r: number; s: number };
};

export type RandomizedSetup = {
  playerCount: number;
  centerSectorsFixed: boolean;
  sectors: SectorPlacement[];
  seed: string;
};

const SMALL_CENTERS = [
  { q: 0, r: 0, s: 0 },
  { q: 5, r: -2, s: -3 },
  { q: 2, r: 3, s: -5 },
  { q: -3, r: 5, s: -2 },
  { q: -5, r: 2, s: 3 },
  { q: -2, r: -3, s: 5 },
  { q: 3, r: -5, s: 2 },
];

const BIG_CENTERS = [
  { q: 0, r: 0, s: 0 },
  { q: 5, r: -2, s: -3 },
  { q: 2, r: 3, s: -5 },
  { q: -3, r: 5, s: -2 },
  { q: -5, r: 2, s: 3 },
  { q: -2, r: -3, s: 5 },
  { q: 3, r: -5, s: 2 },
  { q: -1, r: 8, s: -7 },
  { q: -6, r: 10, s: -4 },
  { q: -8, r: 7, s: 1 },
];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function randomizeSectors(playerCount: number, seed: string, centerSectorsFixed = true): RandomizedSetup {
  const rng = mulberry32(hashSeed(seed));
  const twoPlayer = playerCount <= 2;
  const centers = twoPlayer ? SMALL_CENTERS : BIG_CENTERS;
  const outer = twoPlayer ? ["5B", "6B", "7B"] : ["5A", "6A", "7A", "8", "9", "10"];
  const inner = ["1", "2", "3", "4"];

  let names: string[];
  if (centerSectorsFixed && !twoPlayer) {
    names = [...shuffle(inner, rng), ...shuffle(outer, rng)];
  } else if (centerSectorsFixed && twoPlayer) {
    names = [...shuffle(inner, rng), ...shuffle(outer, rng)];
  } else if (twoPlayer) {
    names = shuffle([...inner, ...outer], rng);
  } else {
    names = shuffle([...inner, ...outer], rng);
  }

  const sectors = names.slice(0, centers.length).map((sector, i) => ({
    sector,
    rotation: Math.floor(rng() * 6),
    center: centers[i],
  }));

  return { playerCount, centerSectorsFixed, sectors, seed };
}

export function boosterCount(playerCount: number): number {
  return playerCount + 3;
}
