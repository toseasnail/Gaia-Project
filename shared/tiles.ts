/** Human-readable Gaia Project tile text — what is printed on the physical tiles. */

export const BOOSTER_TILES: Record<string, { title: string; income: string; extra: string }> = {
  booster1: { title: "Booster 1", income: "+1 Knowledge, +1 Ore", extra: "" },
  booster2: { title: "Booster 2", income: "+1 Ore, +2 Power tokens", extra: "" },
  booster3: { title: "Booster 3", income: "+1 QIC, +2 Credits", extra: "" },
  booster4: { title: "Booster 4", income: "+2 Credits", extra: "Special action: +1 terraform step" },
  booster5: { title: "Booster 5", income: "+2 Power charge", extra: "Special action: +3 range" },
  booster6: { title: "Booster 6", income: "+1 Ore", extra: "When you pass: 1 VP per mine" },
  booster7: { title: "Booster 7", income: "+1 Ore", extra: "When you pass: 2 VP per trading station" },
  booster8: { title: "Booster 8", income: "+1 Knowledge", extra: "When you pass: 3 VP per research lab" },
  booster9: { title: "Booster 9", income: "+4 Power charge", extra: "When you pass: 4 VP per PI or academy" },
  booster10: { title: "Booster 10", income: "+4 Credits", extra: "When you pass: 1 VP per Gaia planet" },
};

export const ROUND_SCORING_TILES: Record<string, string> = {
  score1: "2 VP per terraform step this round",
  score2: "2 VP per research advance this round",
  score3: "2 VP per mine built this round",
  score4: "5 VP per federation formed this round",
  score5: "4 VP per trading station built this round",
  score6: "4 VP per mine built on a Gaia planet this round",
  score7: "5 VP per planetary institute or academy built this round",
  score8: "3 VP per trading station built this round",
  score9: "3 VP per mine built on a Gaia planet this round",
  score10: "5 VP per planetary institute or academy built this round",
};

export const FINAL_SCORING_TILES: Record<string, string> = {
  structure: "Most structures (18 / 12 / 6 VP)",
  structureFed: "Most structures in federations (18 / 12 / 6 VP)",
  planetType: "Most different planet types (18 / 12 / 6 VP)",
  gaia: "Most Gaia planets (18 / 12 / 6 VP)",
  sector: "Most sectors with a structure (18 / 12 / 6 VP)",
  satellite: "Most satellites (18 / 12 / 6 VP)",
};

export const TECH_TILES: Record<string, string> = {
  tech1: "Immediately: 1 Ore and 1 QIC",
  tech2: "Immediately: 1 Knowledge per planet type you inhabit",
  tech3: "Your PI and academies are worth 4 power (for federations / charging)",
  tech4: "Immediately: 7 VP",
  tech5: "Income: +1 Ore, +1 Power charge",
  tech6: "Income: +1 Knowledge, +1 Credit",
  tech7: "3 VP each time you build a mine on a Gaia planet",
  tech8: "Income: +4 Credits",
  tech9: "Special action: charge 4 power",
  advtech1: "When you pass: 3 VP per federation",
  advtech2: "2 VP each time you advance research",
  advtech3: "Special action: 1 QIC and 5 Credits",
  advtech4: "Immediately: 2 VP per mine you have",
  advtech5: "When you pass: 3 VP per research lab",
  advtech6: "Immediately: 1 Ore per sector you occupy",
  advtech7: "When you pass: 1 VP per planet type",
  advtech8: "Immediately: 2 VP per Gaia planet you inhabit",
  advtech9: "Immediately: 4 VP per trading station you have",
  advtech10: "Immediately: 2 VP per sector you occupy",
  advtech11: "Special action: 3 Ore",
  advtech12: "Immediately: 5 VP per federation you have",
  advtech13: "Special action: 3 Knowledge",
  advtech14: "3 VP each time you build a mine",
  advtech15: "3 VP each time you build a trading station",
};

export const FEDERATION_TILES: Record<string, string> = {
  fed1: "12 VP",
  fed2: "8 VP and 1 QIC",
  fed3: "8 VP and 2 Power tokens",
  fed4: "7 VP and 2 Ore",
  fed5: "7 VP and 6 Credits",
  fed6: "6 VP and 2 Knowledge",
  gleens: "Gleens: 1 Ore, 1 Knowledge, 2 Credits",
};

export const BOARD_ACTIONS: Record<string, { cost: string; effect: string }> = {
  power1: { cost: "7 power", effect: "3 Knowledge" },
  power2: { cost: "5 power", effect: "2 terraform steps" },
  power3: { cost: "4 power", effect: "2 Ore" },
  power4: { cost: "4 power", effect: "7 Credits" },
  power5: { cost: "4 power", effect: "2 Knowledge" },
  power6: { cost: "3 power", effect: "1 terraform step" },
  power7: { cost: "3 power", effect: "2 Power tokens" },
  qic1: { cost: "4 QIC", effect: "Take a tech tile" },
  qic2: { cost: "3 QIC", effect: "Form a federation (no satellites)" },
  qic3: { cost: "2 QIC", effect: "3 VP, then 1 VP per planet type" },
};

export const BUILDING_LABELS: Record<string, string> = {
  m: "Mine",
  ts: "Trading station",
  lab: "Research lab",
  PI: "Planetary institute",
  ac1: "Academy (knowledge)",
  ac2: "Academy (QIC)",
  gf: "Gaiaformer",
  sp: "Space station",
};

export const TRACK_LABELS: Record<string, string> = {
  terra: "Terraforming",
  nav: "Navigation",
  int: "Artificial Intelligence",
  gaia: "Gaia Project",
  eco: "Economy",
  sci: "Science",
};

export function tileText(kind: "booster" | "round" | "final" | "tech" | "fed" | "action", id: string): string {
  if (kind === "booster") {
    const tile = BOOSTER_TILES[id];
    return tile ? [tile.income, tile.extra].filter(Boolean).join(" · ") : id;
  }
  if (kind === "round") return ROUND_SCORING_TILES[id] ?? id;
  if (kind === "final") return FINAL_SCORING_TILES[id] ?? id;
  if (kind === "tech") return TECH_TILES[id] ?? id;
  if (kind === "fed") return FEDERATION_TILES[id] ?? id;
  const act = BOARD_ACTIONS[id];
  return act ? `${act.cost} → ${act.effect}` : id;
}

export const FREE_COMMANDS = new Set(["spend", "burn", "endturn"]);
export const FOLLOW_UP_COMMANDS = new Set([
  "brainstone",
  "charge",
  "decline",
  "tech",
  "cover",
  "fedtile",
  "income",
  "lostPlanet",
]);
export const MAIN_COMMANDS = new Set([
  "build",
  "up",
  "federation",
  "action",
  "special",
  "pass",
  "booster",
  "faction",
  "rotate",
  "swap-PI",
]);

export function isFreeCommand(name: string): boolean {
  return FREE_COMMANDS.has(name);
}
