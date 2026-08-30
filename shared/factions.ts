export const FACTIONS = [
  "terrans",
  "lantids",
  "xenos",
  "gleens",
  "taklons",
  "ambas",
  "hadsch-hallas",
  "ivits",
  "geodens",
  "baltaks",
  "firaks",
  "bescods",
  "nevlas",
  "itars",
] as const;

export type FactionId = (typeof FACTIONS)[number];

export const PLANET_TYPES = [
  "terra",
  "desert",
  "swamp",
  "oxide",
  "volcanic",
  "titanium",
  "ice",
  "gaia",
  "transdim",
  "empty",
  "lost",
] as const;

export type PlanetType = (typeof PLANET_TYPES)[number];

export const FACTION_INFO: Record<
  FactionId,
  {
    name: string;
    planet: Exclude<PlanetType, "gaia" | "transdim" | "empty" | "lost">;
    color: string;
    summary: string;
    pi: string;
  }
> = {
  terrans: {
    name: "Terrans",
    planet: "terra",
    color: "#3d8bfd",
    summary: "Gaia-area power returns to bowl II.",
    pi: "Spend returning Gaia power as free actions.",
  },
  lantids: {
    name: "Lantids",
    planet: "terra",
    color: "#5aa8ff",
    summary: "May mine on an opponent's colonized planet.",
    pi: "Gain 2 knowledge when sharing a planet.",
  },
  xenos: {
    name: "Xenos",
    planet: "desert",
    color: "#f5c542",
    summary: "Place a third starting mine. Start on AI research.",
    pi: "Federations need power 6. PI produces QIC.",
  },
  gleens: {
    name: "Gleens",
    planet: "desert",
    color: "#d4a017",
    summary: "QIC becomes ore until the QIC academy. Gaia mines cost 1 ore.",
    pi: "Gain the Gleens federation token immediately.",
  },
  taklons: {
    name: "Taklons",
    planet: "swamp",
    color: "#8a5a2b",
    summary: "Brainstone counts as 1 token, spends as 3 power.",
    pi: "Gain a power token whenever you charge power.",
  },
  ambas: {
    name: "Ambas",
    planet: "swamp",
    color: "#6b4423",
    summary: "+1 ore income. Start on Navigation.",
    pi: "Once per round, swap the PI with one of your mines.",
  },
  "hadsch-hallas": {
    name: "Hadsch Hallas",
    planet: "oxide",
    color: "#ff7a18",
    summary: "+3 credit income. Start on Economy.",
    pi: "Spend credits instead of power for resource conversions.",
  },
  ivits: {
    name: "Ivits",
    planet: "oxide",
    color: "#e85d04",
    summary: "Place a PI instead of starting mines. Satellites cost QIC.",
    pi: "Special action: place a space station.",
  },
  geodens: {
    name: "Geodens",
    planet: "volcanic",
    color: "#d62828",
    summary: "Start on Terraforming.",
    pi: "First mine on each planet type: +3 knowledge.",
  },
  baltaks: {
    name: "Bal T'aks",
    planet: "volcanic",
    color: "#9b2226",
    summary: "Cannot advance Navigation until the PI. Gaiaformer → QIC.",
    pi: "May advance Navigation.",
  },
  firaks: {
    name: "Firaks",
    planet: "titanium",
    color: "#8d99ae",
    summary: "+1 knowledge income.",
    pi: "Downgrade a lab to a trading station and research.",
  },
  bescods: {
    name: "Bescods",
    planet: "titanium",
    color: "#6c757d",
    summary: "Once per round, advance your lowest research for free.",
    pi: "+1 power value on titanium planets.",
  },
  nevlas: {
    name: "Nevlas",
    planet: "ice",
    color: "#e8f1ff",
    summary: "Bowl III token → Gaia area for 1 knowledge.",
    pi: "Improved conversions; power actions cost half (round up).",
  },
  itars: {
    name: "Itars",
    planet: "ice",
    color: "#cdd9e5",
    summary: "Burned bowl-II tokens go to the Gaia area.",
    pi: "Discard 4 Gaia tokens for a tech tile.",
  },
};

export const PLANET_COLORS: Record<PlanetType, string> = {
  terra: "#2f80ed",
  desert: "#f2c94c",
  swamp: "#7a4b2a",
  oxide: "#f2994a",
  volcanic: "#eb5757",
  titanium: "#bdbdbd",
  ice: "#f5f7fa",
  gaia: "#27ae60",
  transdim: "#9b51e0",
  empty: "transparent",
  lost: "#1a1a1a",
};

export const FACTION_STRENGTH: Record<FactionId, number> = {
  itars: 3.01,
  ivits: 3.01,
  terrans: 2.93,
  nevlas: 2.85,
  ambas: 2.51,
  taklons: 2.41,
  "hadsch-hallas": 2.33,
  xenos: 2.19,
  geodens: 2.16,
  baltaks: 2.16,
  firaks: 2.09,
  gleens: 1.86,
  bescods: 1.77,
  lantids: 1.55,
};

export function samePlanetPair(a: FactionId, b: FactionId): boolean {
  return FACTION_INFO[a].planet === FACTION_INFO[b].planet;
}

export function remainingFactions(taken: FactionId[]): FactionId[] {
  const blocked = new Set<PlanetType>();
  for (const id of taken) blocked.add(FACTION_INFO[id].planet);
  return FACTIONS.filter((id) => !blocked.has(FACTION_INFO[id].planet));
}
