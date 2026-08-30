import Engine from "@gaia-project/engine";
import type { GameRoom } from "./room.ts";
import type { GameView, HexView, PlayerView, PowerView } from "../shared/types.ts";
import type { FactionId, PlanetType } from "../shared/factions.ts";

const PLANET_MAP: Record<string, PlanetType> = {
  e: "empty",
  r: "terra",
  d: "desert",
  s: "swamp",
  o: "oxide",
  v: "volcanic",
  t: "titanium",
  i: "ice",
  g: "gaia",
  m: "transdim",
  l: "lost",
};

function planetOf(value: string | undefined): PlanetType {
  if (!value) return "empty";
  if (PLANET_MAP[value]) return PLANET_MAP[value];
  if ((PLANET_MAP as Record<string, PlanetType>)[value[0]]) return PLANET_MAP[value[0]];
  const named = value.toLowerCase() as PlanetType;
  return named;
}

function powerView(data: {
  power: { area1: number; area2: number; area3: number; gaia: number };
  brainstone: string | null;
}): PowerView {
  const area = data.brainstone as PowerView["brainstone"];
  return {
    area1: data.power.area1,
    area2: data.power.area2,
    area3: data.power.area3,
    gaia: data.power.gaia,
    brainstone: area ?? null,
  };
}

export function toGameView(room: GameRoom, viewerId: string | null): GameView {
  const you = viewerId ? room.seats.findIndex((seat) => seat.id === viewerId) : null;
  const engine = room.engine;
  const map: HexView[] = [];

  if (engine?.map?.grid) {
    for (const hex of engine.map.grid.values()) {
      map.push({
        id: `${hex.q}x${hex.r}`,
        coord: String(hex.toString?.() ?? `${hex.q}x${hex.r}`),
        q: hex.q,
        r: hex.r,
        sector: String(hex.data.sector ?? ""),
        planet: planetOf(hex.data.planet),
        building: hex.data.building,
        player: hex.data.player,
        additionalMine: hex.data.additionalMine,
        federations: hex.data.federations ?? [],
        gaiaformer: hex.data.building === "gf",
      });
    }
  }

  const players: PlayerView[] = room.seats.map((seat, index) => {
    const pl = engine?.players[index];
    const data = pl?.data;
    return {
      index,
      name: seat.name,
      isAi: seat.isAi,
      connected: seat.isAi || Boolean(seat.socketId),
      faction: (pl?.faction as FactionId | undefined) ?? seat.faction ?? null,
      bid: seat.paidBid,
      startingVp: seat.startingVp,
      victoryPoints: data?.victoryPoints ?? 10,
      credits: data?.credits ?? 15,
      ore: data?.ores ?? 4,
      knowledge: data?.knowledge ?? 3,
      qic: data?.qics ?? 1,
      power: data
        ? powerView(data)
        : { area1: 2, area2: 4, area3: 0, gaia: 0, brainstone: seat.faction === "taklons" ? "area1" : null },
      research: data?.research ?? {},
      buildings: data?.buildings ?? {},
      passed: Boolean(engine?.passedPlayers?.includes(index)),
      dropped: Boolean(pl?.dropped),
    };
  });

  const available = (engine?.availableCommands ?? engine?.generateAvailableCommandsIfNeeded?.() ?? []).map(
    (cmd: { name: string; player: number; data?: unknown }) => ({
      name: cmd.name,
      player: cmd.player,
      data: cmd.data,
    })
  );

  return {
    roomId: room.id,
    code: room.code,
    mode: room.mode,
    status: room.status,
    honorFederation: room.honorFederation,
    playerCount: room.seats.length,
    round: engine?.round ?? 0,
    phase: engine?.phase ?? "setup",
    ended: Boolean(engine?.ended),
    currentPlayer: engine?.playerToMove ?? null,
    you: you === -1 ? null : you,
    map,
    players,
    available,
    log: engine?.moveHistory ?? [],
    auction: room.auction
      ? {
          factions: room.auction.factions,
          submitted: room.seats.map((seat) => seat.isAi || Boolean(seat.bids)),
          yourBids: you !== null && you >= 0 ? room.seats[you]?.bids ?? null : null,
          result: room.auction.result,
        }
      : null,
    boosters: Object.entries(engine?.tiles?.boosters ?? {})
      .filter(([, open]) => open)
      .map(([name]) => name),
    roundScoring: engine?.tiles?.scorings?.round ?? [],
    finalScoring: engine?.tiles?.scorings?.final ?? [],
    techTiles: engine?.tiles?.techs ?? {},
    federations: engine?.tiles?.federations ?? {},
    boardActions: engine?.boardActions ?? {},
  };
}

export function assertEngine(engine: Engine | null): Engine {
  if (!engine) throw new Error("Game engine is not ready");
  return engine;
}
