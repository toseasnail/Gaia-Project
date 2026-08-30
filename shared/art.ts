/** Public artwork paths. Portraits and tile faces are original painted assets. */

export function factionArt(id: string): string {
  return `/art/factions/${id}.jpg`;
}

export function sectorArt(id: string): string {
  const n = id.replace(/[ABab]/g, "").padStart(2, "0");
  return `/sectors/sector-${n}.png`;
}

export function tileArt(kind: "booster" | "round" | "final" | "tech" | "fed" | "action", id: string): string {
  if (kind === "final") return `/art/tiles/final-${id}.png`;
  return `/art/tiles/${id}.png`;
}

export const RESEARCH_BOARD_ART = "/art/boards/research-board.jpg";
export const SCORING_BOARD_ART = "/art/boards/scoring-board.jpg";
