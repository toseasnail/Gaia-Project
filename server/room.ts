import { randomBytes } from "node:crypto";
import { Engine } from "./gaia.ts";
import { nanoid } from "nanoid";
import { aiMaxBids, emptyBids, resolveBgaAuction, type AuctionBids, type AuctionResult } from "../shared/auction.ts";
import { remainingFactions, type FactionId } from "../shared/factions.ts";
import { randomizeSectors } from "../shared/randomizer.ts";
import type { CreateRoomRequest, GameMode, RoomStatus } from "../shared/types.ts";
import { playHeuristicTurn } from "./heuristic-ai.ts";
import { applyPlayerMove } from "./turns.ts";

export type Seat = {
  id: string;
  secret: string;
  name: string;
  isAi: boolean;
  socketId?: string;
  bids?: AuctionBids;
  faction?: FactionId;
  paidBid: number;
  startingVp: number;
};

export type GameRoom = {
  id: string;
  code: string;
  mode: GameMode;
  status: RoomStatus;
  honorFederation: boolean;
  centerSectorsFixed: boolean;
  seed: string;
  hostId: string;
  targetPlayers: number;
  seats: Seat[];
  auction: { factions: FactionId[]; result: AuctionResult | null } | null;
  engine: Engine | null;
};

const rooms = new Map<string, GameRoom>();
const byCode = new Map<string, string>();
const bySecret = new Map<string, { roomId: string; seatId: string }>();

function codeFor(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return byCode.has(code) ? codeFor() : code;
}

function rngFrom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

function draftFactions(count: number, seed: string): FactionId[] {
  const rng = rngFrom(`${seed}:factions`);
  const taken: FactionId[] = [];
  while (taken.length < count) {
    const left = remainingFactions(taken);
    taken.push(left[Math.floor(rng() * left.length)]);
  }
  return taken;
}

function makeSeat(name: string, isAi: boolean): Seat {
  const id = nanoid(10);
  const secret = randomBytes(12).toString("hex");
  return { id, secret, name, isAi, paidBid: 0, startingVp: 10 };
}

export function createRoom(req: CreateRoomRequest): { room: GameRoom; secret: string } {
  const playerCount = req.playerCount;
  const mode = req.mode;
  const aiCount = mode === "ai" ? (req.aiCount ?? Math.min(3, (playerCount - 1) as 1 | 2 | 3)) : 0;
  if (mode === "ai" && (aiCount < 1 || aiCount > 3 || aiCount >= playerCount)) {
    throw new Error("AI games need 1–3 AI seats and at least one human");
  }
  if (mode === "online" && aiCount > 0) {
    throw new Error("Online tables are people-only — AI and humans do not sit together");
  }

  const host = makeSeat(req.name.trim() || "Host", false);
  const seats = [host];
  if (mode === "ai") {
    for (let i = 0; i < aiCount; i++) seats.push(makeSeat(`AI ${i + 1}`, true));
  }

  const room: GameRoom = {
    id: nanoid(12),
    code: codeFor(),
    mode,
    status: mode === "ai" ? "auction" : "lobby",
    honorFederation: mode === "online" ? true : Boolean(req.honorFederation),
    centerSectorsFixed: req.centerSectorsFixed ?? true,
    seed: nanoid(8),
    hostId: host.id,
    targetPlayers: playerCount,
    seats,
    auction: null,
    engine: null,
  };

  if (mode === "ai") beginAuction(room);

  rooms.set(room.id, room);
  byCode.set(room.code, room.id);
  bySecret.set(host.secret, { roomId: room.id, seatId: host.id });
  return { room, secret: host.secret };
}

export function joinRoom(code: string, name: string): { room: GameRoom; secret: string } {
  const room = rooms.get(byCode.get(code.toUpperCase()) ?? "");
  if (!room) throw new Error("Table not found");
  if (room.mode !== "online") throw new Error("That table is an AI game");
  if (room.status !== "lobby") throw new Error("That table already started");
  if (room.seats.length >= room.targetPlayers) throw new Error("Table is full");
  const seat = makeSeat(name.trim() || `Player ${room.seats.length + 1}`, false);
  room.seats.push(seat);
  bySecret.set(seat.secret, { roomId: room.id, seatId: seat.id });
  if (room.seats.length === room.targetPlayers) beginAuction(room);
  return { room, secret: seat.secret };
}

export function getRoom(id: string): GameRoom | undefined {
  return rooms.get(id);
}

export function getRoomByCode(code: string): GameRoom | undefined {
  const id = byCode.get(code.toUpperCase());
  return id ? rooms.get(id) : undefined;
}

export function seatBySecret(secret: string): { room: GameRoom; seat: Seat } | null {
  const ref = bySecret.get(secret);
  if (!ref) return null;
  const room = rooms.get(ref.roomId);
  const seat = room?.seats.find((s) => s.id === ref.seatId);
  if (!room || !seat) return null;
  return { room, seat };
}

export function attachSocket(secret: string, socketId: string): { room: GameRoom; seat: Seat } | null {
  const found = seatBySecret(secret);
  if (!found) return null;
  found.seat.socketId = socketId;
  return found;
}

export function detachSocket(socketId: string) {
  for (const room of rooms.values()) {
    for (const seat of room.seats) {
      if (seat.socketId === socketId) seat.socketId = undefined;
    }
  }
}

function beginAuction(room: GameRoom) {
  if (room.seats.length < 2) return;
  const factions = draftFactions(room.seats.length, room.seed);
  room.auction = { factions, result: null };
  room.status = "auction";
  for (const seat of room.seats) {
    if (seat.isAi) seat.bids = aiMaxBids(factions, rngFrom(`${room.seed}:${seat.id}`));
  }
  maybeResolveAuction(room);
}

export function submitBids(room: GameRoom, seatId: string, bids: AuctionBids) {
  if (room.status !== "auction" || !room.auction) throw new Error("Auction is not open");
  const seat = room.seats.find((s) => s.id === seatId);
  if (!seat || seat.isAi) throw new Error("Seat cannot bid");
  const clean = emptyBids(room.auction.factions);
  for (const faction of room.auction.factions) {
    const value = Math.max(0, Math.min(40, Math.round(Number(bids[faction] ?? 0))));
    clean[faction] = value;
  }
  seat.bids = clean;
  maybeResolveAuction(room);
}

function maybeResolveAuction(room: GameRoom) {
  if (!room.auction) return;
  if (room.seats.some((seat) => !seat.bids)) return;
  const result = resolveBgaAuction(
    room.auction.factions,
    room.seats.map((seat, playerIndex) => ({
      playerIndex,
      name: seat.name,
      isAi: seat.isAi,
      maxBids: seat.bids ?? emptyBids(room.auction!.factions),
    }))
  );
  room.auction.result = result;
  for (const row of result.assignments) {
    const seat = room.seats[row.playerIndex];
    seat.faction = row.faction;
    seat.paidBid = row.bid;
    seat.startingVp = result.startingVp[row.playerIndex];
  }
  try {
    startEngine(room);
  } catch (error) {
    console.error("Failed to start engine after auction", error);
    throw error;
  }
}

function startEngine(room: GameRoom) {
  const placement = randomizeSectors(room.seats.length, room.seed, room.centerSectorsFixed);
  const engine = new Engine([`init ${room.seats.length} ${room.seed}`], {
    advancedRules: false,
    layout: "standard",
    noFedCheck: room.honorFederation,
    map: { sectors: placement.sectors, mirror: false },
  });

  const rotate = engine.availableCommands?.find((cmd) => cmd.name === "rotate");
  if (rotate) {
    engine.move(`${prefix(engine, rotate.player)} rotate`);
  }

  for (const seat of room.seats) {
    if (!seat.faction) continue;
    const mover = engine.playerToMove;
    engine.move(`${prefix(engine, mover)} faction ${seat.faction}`);
  }

  for (const [index, seat] of room.seats.entries()) {
    if (engine.players[index]) {
      engine.players[index].name = seat.name;
      engine.players[index].data.victoryPoints = seat.startingVp;
      engine.players[index].data.bid = 0;
    }
  }

  room.engine = engine;
  room.status = engine.ended ? "finished" : "playing";
  playAiUntilHuman(room);
}

function prefix(engine: Engine, player: number): string {
  return engine.player(player)?.faction ?? `p${player + 1}`;
}

export function playMove(room: GameRoom, seatId: string, move: string) {
  if (!room.engine) throw new Error("Game has not started");
  const seatIndex = room.seats.findIndex((s) => s.id === seatId);
  if (seatIndex < 0) throw new Error("Seat not found");
  if (room.seats[seatIndex].isAi) throw new Error("AI seats play themselves");
  if (room.engine.playerToMove !== seatIndex) throw new Error("It is not your turn");
  const trimmed = move.trim();
  if (!trimmed) throw new Error("Empty move");
  applyPlayerMove(room, trimmed);
  if (room.engine.ended) room.status = "finished";
  playAiUntilHuman(room);
}

export function playAiUntilHuman(room: GameRoom) {
  if (!room.engine) return;
  let guard = 0;
  while (!room.engine.ended && guard++ < 80) {
    const current = room.engine.playerToMove;
    if (current === undefined) break;
    const seat = room.seats[current];
    if (!seat?.isAi) break;
    const moved = playHeuristicTurn(room.engine);
    if (!moved) break;
  }
  if (room.engine.ended) room.status = "finished";
}

export function listPublicRooms(): Array<{ code: string; seats: number; needed: number; status: RoomStatus }> {
  return [...rooms.values()]
    .filter((room) => room.mode === "online" && room.status === "lobby")
    .map((room) => ({
      code: room.code,
      seats: room.seats.length,
      needed: room.targetPlayers,
      status: room.status,
    }));
}
