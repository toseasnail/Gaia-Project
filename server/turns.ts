import { Engine } from "./gaia.ts";
import { FREE_COMMANDS } from "../shared/tiles.ts";
import type { GameRoom } from "./room.ts";

function commandName(move: string): string {
  const parts = move.trim().split(/\s+/);
  const maybePrefix = parts[0];
  const start = /^(p[1-7]|[a-z].*)$/.test(maybePrefix) && parts.length > 1 ? 1 : 0;
  return parts[start] ?? "";
}

function isFreeOnlyTurn(move: string): boolean {
  const chunks = move.split(".").map((chunk) => commandName(chunk));
  return chunks.length > 0 && chunks.every((name) => FREE_COMMANDS.has(name));
}

export function stripMoveDecorations(shown: string): string {
  return shown
    .replace(/ \([^)]*⇒[^)]*\)/g, "")
    .replace(/ using [^.]+/g, "")
    .replace(/ returning \S+/g, "")
    .trim();
}

function bodyOf(move: string): string {
  const space = move.indexOf(" ");
  return space === -1 ? move : move.slice(space + 1).trim();
}

function prefixOf(move: string): string {
  return move.split(/\s+/)[0];
}

export function finalizeRoundMove(engine: Engine, move: string): string {
  const copy = Engine.fromData(JSON.parse(JSON.stringify(engine)));
  try {
    copy.move(move);
  } catch (error) {
    throw error;
  }
  if (copy.newTurn || copy.ended) return move;

  const names = (copy.availableCommands ?? []).map((cmd: { name: string }) => cmd.name);
  const onlyCloser = names.length > 0 && names.every((name) => FREE_COMMANDS.has(name));
  if (onlyCloser && names.includes("endturn")) {
    return `${move}. endturn`;
  }
  return move;
}

export function applyPlayerMove(room: GameRoom, move: string) {
  const engine = room.engine;
  if (!engine) throw new Error("Game engine is not ready");

  if (engine.phase === "roundMove" && engine.newTurn && isFreeOnlyTurn(move)) {
    throw new Error(
      "That is a free conversion, not a turn. Take a main action (build, research, form a federation, power/QIC action, or pass)."
    );
  }

  if (!engine.newTurn) {
    const history = engine.moveHistory.map(stripMoveDecorations);
    const last = history[history.length - 1];
    if (!last) throw new Error("Cannot continue an empty turn");
    const raw = last;
    const extra = prefixOf(move) === prefixOf(raw) ? bodyOf(move) : move.replace(/^(p[1-7]|\S+)\s+/, "");
    const combined = `${raw}. ${extra}`;
    replayWith(room, [...history.slice(0, -1), combined]);
    return;
  }

  const finalized = engine.phase === "roundMove" ? finalizeRoundMove(engine, move) : move;
  engine.move(finalized);
}

function replayWith(room: GameRoom, history: string[]) {
  const previous = room.engine!;
  const fresh = new Engine(history.slice(0, 1), previous.options, previous.version);
  for (let i = 1; i < history.length; i++) {
    const step = i === history.length - 1 && previous.phase === "roundMove" ? finalizeRoundMove(fresh, history[i]) : history[i];
    fresh.move(step);
  }
  for (const [index, player] of previous.players.entries()) {
    if (fresh.players[index]) {
      fresh.players[index].name = player.name;
      fresh.players[index].dropped = player.dropped;
      const bonus = (room.seats[index]?.startingVp ?? 10) - 10;
      if (bonus) fresh.players[index].data.victoryPoints += bonus;
    }
  }
  room.engine = fresh;
}
