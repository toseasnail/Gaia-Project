import Engine, { Command, Player as PlayerEnum } from "@gaia-project/engine";
import type { AvailableCommand } from "@gaia-project/engine";

type Named = AvailableCommand & { name: string; player: number; data?: any };

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
    return charge * 3 - vp * 4;
  });
  return `${Command.ChargePower} ${offer.offer}`;
}

function buildMove(cmd: Named): string {
  const buildings = cmd.data?.buildings ?? [];
  const building = pick(buildings, (row: { building: string; steps?: number; upgrade?: boolean; cost?: string }) => {
    const steps = row.steps ?? 0;
    if (row.building === "m") return 24 - steps * 5;
    if (row.building === "ts") return 18 + (row.upgrade ? 2 : 0);
    if (row.building === "PI") return 22;
    if (row.building === "lab") return 16;
    if (row.building === "ac1" || row.building === "ac2") return 20;
    if (row.building === "gf") return 12;
    return 8;
  });
  return `${Command.Build} ${building.building} ${building.coordinates}`;
}

function federationMove(cmd: Named): string | null {
  const feds = cmd.data?.federations ?? [];
  const tiles = cmd.data?.tiles ?? [];
  if (feds.length === 0 || tiles.length === 0) return null;
  const fed = pick(feds, (row: { hexes: string; warnings?: string[] }) => 30 - (row.warnings?.length ?? 0) * 6);
  return `${Command.FormFederation} ${fed.hexes} ${tiles[0]}`;
}

function researchMove(cmd: Named): string {
  const tracks = cmd.data?.tracks ?? [];
  const order = ["terra", "nav", "gaia", "eco", "sci", "int"];
  const track = pick(tracks, (row: { field: string; to: number }) => 10 + row.to * 2 - order.indexOf(row.field));
  return `${Command.UpgradeResearch} ${track.field}`;
}

function actionMove(cmd: Named): string {
  const acts = cmd.data?.poweracts ?? [];
  const act = pick(acts, (row: { name: string; income: string[] }) => {
    const income = (row.income ?? []).join(",");
    if (income.includes("k")) return 16;
    if (income.includes("o")) return 14;
    if (income.includes("q")) return 13;
    return 8;
  });
  return `${Command.Action} ${act.name}`;
}

function boosterMove(command: Command.Pass | Command.ChooseRoundBooster, cmd: Named): string {
  const boosters = cmd.data?.boosters ?? [];
  return `${command} ${boosters[0]}`;
}

function completeTurn(engine: Engine, player: PlayerEnum, opening: string): string | null {
  let full = opening;
  for (let i = 0; i < 16; i++) {
    const copy = Engine.fromData(JSON.parse(JSON.stringify(engine)));
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

function followUp(engine: Engine, player: PlayerEnum): string | null {
  const commands = engine.generateAvailableCommandsIfNeeded().filter((cmd) => cmd.player === player) as Named[];
  const brain = commandOf(commands, Command.BrainStone);
  if (brain) return brainstoneMove(brain);
  const tech = commandOf(commands, Command.ChooseTechTile);
  if (tech) return `${Command.ChooseTechTile} ${(tech.data?.tiles ?? [])[0]?.pos}`;
  const cover = commandOf(commands, Command.ChooseCoverTechTile);
  if (cover) return `${Command.ChooseCoverTechTile} ${(cover.data?.tiles ?? [])[0]?.pos}`;
  const up = commandOf(commands, Command.UpgradeResearch);
  if (up) return researchMove(up);
  const fedTile = commandOf(commands, Command.ChooseFederationTile);
  if (fedTile) return `${Command.ChooseFederationTile} ${(fedTile.data?.tiles ?? [])[0]}`;
  const build = commandOf(commands, Command.Build);
  if (build) return buildMove(build);
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

function openingMove(engine: Engine, player: PlayerEnum): string | null {
  const commands = engine.generateAvailableCommandsIfNeeded().filter((cmd) => cmd.player === player) as Named[];

  const handlers: Array<[Command, (cmd: Named) => string | null]> = [
    [Command.BrainStone, brainstoneMove],
    [Command.ChargePower, chargeMove],
    [Command.Decline, (cmd) => `${Command.Decline} ${cmd.data?.offers?.[0]?.offer ?? ""}`],
    [Command.ChooseIncome, (cmd) => `${Command.ChooseIncome} ${(cmd.data ?? [])[0]}`],
    [Command.ChooseFaction, (cmd) => `${Command.ChooseFaction} ${(cmd.data ?? [])[0]}`],
    [Command.RotateSectors, () => Command.RotateSectors],
    [Command.Build, buildMove],
    [Command.FormFederation, federationMove],
    [Command.UpgradeResearch, researchMove],
    [Command.Action, actionMove],
    [Command.Special, (cmd) => `${Command.Special} ${(cmd.data?.specialacts ?? [])[0]?.income}`],
    [Command.ChooseTechTile, (cmd) => `${Command.ChooseTechTile} ${(cmd.data?.tiles ?? [])[0]?.pos}`],
    [Command.ChooseRoundBooster, (cmd) => boosterMove(Command.ChooseRoundBooster, cmd)],
    [Command.Pass, (cmd) => boosterMove(Command.Pass, cmd)],
    [Command.PISwap, (cmd) => `${Command.PISwap} ${(cmd.data?.buildings ?? [])[0]?.building} ${(cmd.data?.buildings ?? [])[0]?.coordinates}`],
  ];

  const scored: Array<{ move: string; score: number }> = [];
  for (const [name, handler] of handlers) {
    const cmd = commandOf(commands, name);
    if (!cmd) continue;
    const body = handler(cmd);
    if (!body) continue;
    const weight =
      name === Command.FormFederation
        ? 40
        : name === Command.Build
          ? 28
          : name === Command.UpgradeResearch
            ? 18
            : name === Command.Action
              ? 14
              : name === Command.Pass
                ? 1
                : 20;
    scored.push({ move: `${prefix(engine, player)} ${body}`, score: weight });
  }

  if (scored.length === 0) return null;

  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}

/** Legal heuristic turn for one AI seat. Falls back to the engine's random bot. */
export function playHeuristicTurn(engine: Engine): boolean {
  if (engine.ended || engine.playerToMove === undefined) return false;
  const player = engine.playerToMove;
  const opening = openingMove(engine, player);
  if (opening) {
    const full = completeTurn(engine, player, opening);
    if (full) {
      engine.move(full);
      return true;
    }
  }
  return engine.moveAI();
}
