import { Command, Engine, PlayerEnum } from "./gaia.ts";
import type { AvailableCommand } from "@gaia-project/engine";

type Named = AvailableCommand & { name: string; player: number; data?: any };

/** Steam DIGIDICED notes: play faction strengths, chase current-round and final VP. */
const FACTION_TRACKS: Record<string, Partial<Record<string, number>>> = {
  terrans: { gaia: 3, terra: 2, eco: 1 },
  lantids: { terra: 2, nav: 2, int: 1 },
  xenos: { int: 3, nav: 2, terra: 1 },
  gleens: { gaia: 3, nav: 2 },
  taklons: { eco: 2, terra: 2, sci: 1 },
  ambas: { nav: 3, eco: 1 },
  "hadsch-hallas": { eco: 3, terra: 1 },
  ivits: { terra: 2, nav: 2, int: 2 },
  geodens: { terra: 3, sci: 2 },
  baltaks: { gaia: 3, sci: 1 },
  firaks: { sci: 3, eco: 1 },
  bescods: { terra: 1, nav: 1, int: 1, gaia: 1, eco: 1, sci: 1 },
  nevlas: { sci: 2, eco: 2 },
  itars: { gaia: 2, sci: 2, eco: 1 },
};

const TRACKS = ["terra", "nav", "int", "gaia", "eco", "sci"] as const;
const ROUND_HINT: Record<string, { build?: string; research?: boolean; federation?: boolean; gaiaMine?: boolean }> = {
  score1: {},
  score2: { research: true },
  score3: { build: "m" },
  score4: { federation: true },
  score5: { build: "ts" },
  score6: { gaiaMine: true },
  score7: { build: "PA" },
  score8: { build: "ts" },
  score9: { gaiaMine: true },
  score10: { build: "PA" },
};

function prefix(engine: Engine, player: PlayerEnum): string {
  return engine.player(player)?.faction ?? `p${player + 1}`;
}

function pick<T>(items: T[], score: (item: T) => number): T {
  let best = items[0];
  let bestScore = -Infinity;
  for (const item of items) {
    const value = score(item);
    if (value > bestScore) {
      best = item;
      bestScore = value;
    }
  }
  return best;
}

function commandOf<C extends Command>(commands: Named[], name: C): Named | undefined {
  return commands.find((cmd) => cmd.name === name);
}

function cloneEngine(engine: Engine): Engine {
  return Engine.fromData(JSON.parse(JSON.stringify(engine)));
}

function brainstoneMove(cmd: Named): string {
  const choices = cmd.data?.choices ?? [];
  const prefer = ["area3", "area2", "area1", "gaia", "discard"];
  const ranked = [...choices].sort((a: { area: string; warning?: string }, b: { area: string; warning?: string }) => {
    const wasteA = a.warning ? 10 : 0;
    const wasteB = b.warning ? 10 : 0;
    if (wasteA !== wasteB) return wasteA - wasteB;
    return prefer.indexOf(a.area) - prefer.indexOf(b.area);
  });
  return `${Command.BrainStone} ${ranked[0]?.area ?? "area2"}`;
}

function chargeMove(cmd: Named): string {
  const offers = cmd.data?.offers ?? [];
  const offer = pick(offers, (row: { offer: string; cost: string }) => {
    const vp = Number(/(\d+)vp/.exec(row.cost)?.[1] ?? 0);
    const charge = Number(/(\d+)/.exec(row.offer)?.[1] ?? 1);
    return charge * 3.2 - vp * 4.5;
  });
  return `${Command.ChargePower} ${offer.offer}`;
}

function currentRoundHint(engine: Engine) {
  const id = engine.tiles?.scorings?.round?.[(engine.round ?? 1) - 1];
  return ROUND_HINT[id ?? ""] ?? {};
}

function boosterValue(id: string | null | undefined, data: any, roundsLeft: number): number {
  if (!id) return 0;
  const mines = data.buildings?.m ?? 0;
  const ts = data.buildings?.ts ?? 0;
  const lab = data.buildings?.lab ?? 0;
  const pa = (data.buildings?.PI ?? 0) + (data.buildings?.ac1 ?? 0) + (data.buildings?.ac2 ?? 0);
  const gaia = (data.occupied ?? []).filter((hex: { data?: { planet?: string } }) => hex.data?.planet === "g").length;
  const income: Record<string, number> = {
    booster1: 6,
    booster2: 5,
    booster3: 6,
    booster4: 7,
    booster5: 6,
    booster6: 3 + mines * roundsLeft,
    booster7: 3 + ts * 2 * roundsLeft,
    booster8: 4 + lab * 3 * roundsLeft,
    booster9: 4 + pa * 4 * roundsLeft,
    booster10: 3 + gaia * roundsLeft,
  };
  return income[id] ?? 3;
}

function expectedFinalVp(engine: Engine, player: PlayerEnum, tile: string): number {
  const rows = engine.players.map((pl) => {
    try {
      return { player: pl.player, count: pl.finalCount(tile as never) };
    } catch {
      return { player: pl.player, count: 0 };
    }
  });
  if (engine.players.length === 2) {
    const dummy: Record<string, number> = {
      structure: 11,
      structureFed: 10,
      planetType: 5,
      gaia: 4,
      sector: 6,
      satellite: 8,
    };
    rows.push({ player: -1, count: dummy[tile] ?? 6 });
  }
  rows.sort((a, b) => b.count - a.count);
  const mine = rows.find((row) => row.player === player);
  if (!mine || mine.count <= 0) return 0;
  const first = rows.findIndex((row) => row.count === mine.count);
  const ties = rows.filter((row) => row.count === mine.count).length;
  const table = [18, 12, 6, 0, 0];
  const slice = table.slice(first, first + ties);
  return slice.reduce((a, b) => a + b, 0) / ties;
}

/** Steam-style evaluation: VP now, research endgame, faction tracks, expansion, finals. */
export function evaluateState(engine: Engine, player: PlayerEnum): number {
  const pl = engine.player(player);
  if (!pl?.data) return -999;
  const data = pl.data;
  const round = engine.round ?? 0;
  const late = round >= 5 ? 1.45 : round >= 3 ? 1.15 : 1;
  const faction = String(pl.faction ?? "");
  let score = (data.victoryPoints ?? 0) * 12 * late;
  score += (data.ores ?? 0) * (round >= 5 ? 1.4 : 3.1);
  score += (data.knowledge ?? 0) * (round >= 5 ? 1.8 : 3.7);
  score += (data.qics ?? 0) * (round >= 5 ? 2 : 4.1);
  score += (data.credits ?? 0) * 0.32;
  score += (data.power?.area3 ?? 0) * 1.5 + (data.power?.area2 ?? 0) * 0.7 + (data.power?.area1 ?? 0) * 0.22;
  if (data.brainstone === "area3") score += 9;
  else if (data.brainstone === "area2") score += 3;

  const weights = FACTION_TRACKS[faction] ?? {};
  for (const field of TRACKS) {
    const level = data.research?.[field] ?? 0;
    score += level * 3.4;
    if (level >= 3) score += (level - 2) * 4 * late;
    score += (weights[field] ?? 0) * level * 2.3;
    if (level >= 4) score += 7;
    if (level >= 5) score += 9;
  }

  const buildings = data.buildings ?? {};
  score += (buildings.m ?? 0) * 2.3;
  score += (buildings.ts ?? 0) * 3.6;
  score += (buildings.lab ?? 0) * 3.1;
  score += (buildings.PI ?? 0) * 7.5;
  score += ((buildings.ac1 ?? 0) + (buildings.ac2 ?? 0)) * 6.2;
  score += (buildings.gf ?? 0) * 2.4;
  score += (data.tiles?.federations?.length ?? 0) * 11 * late;
  score += (data.occupied?.length ?? 0) * 2.5;
  score += (data.gaiaformers ?? 0) * 1.5;

  try {
    const planets = pl.ownedPlanets ?? [];
    const types = new Set(planets.map((hex: { data?: { planet?: string } }) => hex.data?.planet));
    score += types.size * 3.6 * late;
    score += planets.filter((hex: { data?: { planet?: string } }) => hex.data?.planet === "g").length * 4.2;
  } catch {
    /* older engine snapshots */
  }

  for (const tile of engine.tiles?.scorings?.final ?? []) {
    score += expectedFinalVp(engine, player, tile) * late;
  }
  score += boosterValue(data.tiles?.booster, data, Math.max(1, 7 - round));

  const hint = currentRoundHint(engine);
  if (hint.build === "m") score += (buildings.m ?? 0) * 1.2;
  if (hint.build === "ts") score += (buildings.ts ?? 0) * 1.6;
  if (hint.build === "PA") score += ((buildings.PI ?? 0) + (buildings.ac1 ?? 0) + (buildings.ac2 ?? 0)) * 2;
  if (hint.federation) score += (data.tiles?.federations?.length ?? 0) * 3;

  let bestOpp = 0;
  for (const other of engine.players) {
    if (other.player === player || !other.data) continue;
    let opp = (other.data.victoryPoints ?? 0) * late;
    for (const field of TRACKS) opp += (other.data.research?.[field] ?? 0) * 2;
    opp += (other.data.occupied?.length ?? 0) * 1.2;
    bestOpp = Math.max(bestOpp, opp);
  }
  score -= bestOpp * 0.42;
  return score;
}

function followUp(engine: Engine, player: PlayerEnum): string | null {
  const commands = engine.generateAvailableCommandsIfNeeded().filter((cmd) => cmd.player === player) as Named[];
  const brain = commandOf(commands, Command.BrainStone);
  if (brain) return brainstoneMove(brain);
  const tech = commandOf(commands, Command.ChooseTechTile);
  if (tech) return `${Command.ChooseTechTile} ${(tech.data?.tiles ?? [])[0]?.pos}`;
  const cover = commandOf(commands, Command.ChooseCoverTechTile);
  if (cover) return `${Command.ChooseCoverTechTile} ${(cover.data?.tiles ?? [])[0]?.pos}`;
  const up = commandOf(commands, Command.UpgradeResearch);
  if (up) {
    const tracks = up.data?.tracks ?? [];
    const faction = String(engine.player(player)?.faction ?? "");
    const weights = FACTION_TRACKS[faction] ?? {};
    const track = pick(tracks, (row: { field: string; to: number }) => 8 + row.to * 2 + (weights[row.field] ?? 0) * 4);
    return `${Command.UpgradeResearch} ${track.field}`;
  }
  const fedTile = commandOf(commands, Command.ChooseFederationTile);
  if (fedTile) return `${Command.ChooseFederationTile} ${(fedTile.data?.tiles ?? [])[0]}`;
  const build = commandOf(commands, Command.Build);
  if (build) {
    const buildings = build.data?.buildings ?? [];
    const hint = currentRoundHint(engine);
    const building = pick(buildings, (row: { building: string; steps?: number; upgrade?: boolean }) => {
      const steps = row.steps ?? 0;
      let value = 8 - steps * 4;
      if (row.building === "m") value = (hint.gaiaMine ? 20 : 22) - steps * 5;
      if (row.building === "ts") value = 18 + (hint.build === "ts" ? 8 : 0);
      if (row.building === "PI") value = 24 + (hint.build === "PA" ? 10 : 0);
      if (row.building === "lab") value = 16;
      if (row.building === "ac1" || row.building === "ac2") value = 21 + (hint.build === "PA" ? 8 : 0);
      if (row.building === "gf") value = 13;
      return value;
    });
    return `${Command.Build} ${building.building} ${building.coordinates}`;
  }
  const charge = commandOf(commands, Command.ChargePower);
  if (charge) return chargeMove(charge);
  const spend = commandOf(commands, Command.Spend);
  if (spend) {
    const act = (spend.data?.acts ?? []).find((row: { hide?: boolean }) => !row.hide);
    if (act) return `${Command.Spend} ${act.cost} for ${act.income}`;
  }
  if (commandOf(commands, Command.EndTurn)) return Command.EndTurn;
  return null;
}

function completeTurn(engine: Engine, player: PlayerEnum, opening: string): string | null {
  let full = opening;
  for (let i = 0; i < 16; i++) {
    const copy = cloneEngine(engine);
    try {
      copy.move(full);
    } catch {
      return null;
    }
    if (copy.newTurn || copy.ended) return full;
    const follow = followUp(copy, copy.playerToMove);
    if (!follow) return null;
    full = `${full}. ${follow}`;
  }
  return null;
}

function candidateBodies(engine: Engine, player: PlayerEnum): string[] {
  const commands = engine.generateAvailableCommandsIfNeeded().filter((cmd) => cmd.player === player) as Named[];
  const bodies: string[] = [];
  const hint = currentRoundHint(engine);

  const brain = commandOf(commands, Command.BrainStone);
  if (brain) return [brainstoneMove(brain)];
  const charge = commandOf(commands, Command.ChargePower);
  if (charge) {
    bodies.push(chargeMove(charge));
    const decline = commandOf(commands, Command.Decline);
    if (decline) bodies.push(`${Command.Decline} ${decline.data?.offers?.[0]?.offer ?? ""}`);
    return bodies;
  }
  const income = commandOf(commands, Command.ChooseIncome);
  if (income) return (income.data ?? []).map((row: string) => `${Command.ChooseIncome} ${row}`);
  const faction = commandOf(commands, Command.ChooseFaction);
  if (faction) return (faction.data ?? []).map((row: string) => `${Command.ChooseFaction} ${row}`);
  const rotate = commandOf(commands, Command.RotateSectors);
  if (rotate) return [Command.RotateSectors];

  const build = commandOf(commands, Command.Build);
  if (build) {
    const ranked = [...(build.data?.buildings ?? [])].sort(
      (a: { building: string; steps?: number }, b: { building: string; steps?: number }) => {
        const rank = (row: { building: string; steps?: number }) => {
          const steps = row.steps ?? 0;
          if (row.building === "m") return (hint.gaiaMine ? 26 : 24) - steps * 5;
          if (row.building === "ts") return 19 + (hint.build === "ts" ? 8 : 0);
          if (row.building === "PI") return 23 + (hint.build === "PA" ? 10 : 0);
          if (row.building === "lab") return 16;
          if (row.building === "ac1" || row.building === "ac2") return 20;
          if (row.building === "gf") return 12;
          return 8 - steps;
        };
        return rank(b) - rank(a);
      }
    );
    for (const row of ranked.slice(0, 8)) {
      bodies.push(`${Command.Build} ${row.building} ${row.coordinates}`);
    }
  }

  const fed = commandOf(commands, Command.FormFederation);
  if (fed) {
    const feds = (fed.data?.federations ?? []).slice(0, 4);
    const tiles = fed.data?.tiles ?? [];
    for (const row of feds) {
      for (const tile of tiles.slice(0, 3)) {
        bodies.push(`${Command.FormFederation} ${row.hexes} ${tile}`);
      }
    }
  }

  const research = commandOf(commands, Command.UpgradeResearch);
  if (research) {
    for (const row of research.data?.tracks ?? []) {
      bodies.push(`${Command.UpgradeResearch} ${row.field}`);
    }
  }

  const action = commandOf(commands, Command.Action);
  if (action) {
    for (const row of action.data?.poweracts ?? []) {
      bodies.push(`${Command.Action} ${row.name}`);
    }
  }

  const special = commandOf(commands, Command.Special);
  if (special) {
    for (const row of special.data?.specialacts ?? []) {
      bodies.push(`${Command.Special} ${row.income}`);
    }
  }

  const tech = commandOf(commands, Command.ChooseTechTile);
  if (tech) {
    for (const row of (tech.data?.tiles ?? []).slice(0, 4)) {
      bodies.push(`${Command.ChooseTechTile} ${row.pos}`);
    }
  }

  const booster = commandOf(commands, Command.ChooseRoundBooster);
  if (booster) {
    for (const id of booster.data?.boosters ?? []) bodies.push(`${Command.ChooseRoundBooster} ${id}`);
  }
  const pass = commandOf(commands, Command.Pass);
  if (pass) {
    for (const id of pass.data?.boosters ?? []) bodies.push(`${Command.Pass} ${id}`);
  }

  const swap = commandOf(commands, Command.PISwap);
  if (swap) {
    const row = swap.data?.buildings?.[0];
    if (row) bodies.push(`${Command.PISwap} ${row.building} ${row.coordinates}`);
  }

  return bodies;
}

function bestTurn(engine: Engine, player: PlayerEnum): string | null {
  const who = prefix(engine, player);
  const scored: Array<{ move: string; score: number }> = [];
  for (const body of candidateBodies(engine, player)) {
    const opening = `${who} ${body}`;
    const full = completeTurn(engine, player, opening);
    if (!full) continue;
    const copy = cloneEngine(engine);
    try {
      copy.move(full);
    } catch {
      continue;
    }
    scored.push({ move: full, score: evaluateState(copy, player) });
  }
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}

/** Legal 1-ply search for one AI seat. Falls back to the engine's random bot. */
export function playHeuristicTurn(engine: Engine): boolean {
  if (engine.ended || engine.playerToMove === undefined) return false;
  const player = engine.playerToMove;
  const move = bestTurn(engine, player);
  if (move) {
    engine.move(move);
    return true;
  }
  return engine.moveAI();
}
