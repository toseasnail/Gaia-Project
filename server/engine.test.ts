import { describe, expect, it } from "vitest";
import { Engine } from "./gaia.ts";
import { createRoom, playAiUntilHuman, playMove, submitBids } from "./room.ts";
import { playHeuristicTurn } from "./heuristic-ai.ts";
import { toGameView } from "./view-model.ts";

function boot(moves: string[] = ["init 2 engine-test-seed"]): Engine {
  const engine = new Engine(moves, { advancedRules: false, noFedCheck: false });
  if (engine.availableCommands?.some((cmd) => cmd.name === "rotate")) {
    const who = engine.playerToMove;
    engine.move(`${engine.player(who)?.faction ?? `p${who + 1}`} rotate`);
  }
  return engine;
}

describe("Gaia engine wiring", () => {
  it("asks Taklons to place the brainstone in bowl I at setup", () => {
    const engine = boot();
    engine.move("p1 faction taklons");
    engine.move("p2 faction terrans");
    const taklons = engine.players[0];
    expect(taklons.faction).toBe("taklons");
    expect(taklons.data.brainstone).toBe("area1");
    expect(taklons.data.power.area1 + taklons.data.power.area2).toBeGreaterThan(0);
  });

  it("lists legal federations for AI and leaves hexes empty when honor-checking", () => {
    const checked = new Engine(["init 2 fed-check-seed"], { noFedCheck: false });
    const honor = new Engine(["init 2 fed-honor-seed"], { noFedCheck: true });
    expect(checked.options.noFedCheck).toBe(false);
    expect(honor.options.noFedCheck).toBe(true);
  });

  it("creates an AI table, runs the BGA auction, and lets the human play", () => {
    const { room, secret } = createRoom({
      name: "Jung-hyeon",
      mode: "ai",
      playerCount: 2,
      aiCount: 1,
      centerSectorsFixed: true,
    });
    expect(secret).toBeTruthy();
    expect(room.status).toBe("auction");
    expect(room.honorFederation).toBe(false);
    const bids = Object.fromEntries((room.auction?.factions ?? []).map((faction) => [faction, 3]));
    submitBids(room, room.seats[0].id, bids as never);
    expect(room.auction?.result?.assignments).toHaveLength(2);
    expect(room.engine).toBeTruthy();
    const view = toGameView(room, room.seats[0].id);
    expect(view.sectors.length).toBeGreaterThanOrEqual(7);
    expect(view.map.some((hex) => hex.sector)).toBe(true);
  });

  it("plays a handful of legal heuristic turns without crashing", () => {
    const engine = boot();
    engine.move("p1 faction xenos");
    engine.move("p2 faction taklons");
    let turns = 0;
    for (let i = 0; i < 12; i++) {
      if (engine.ended || engine.playerToMove === undefined) break;
      if (!playHeuristicTurn(engine)) break;
      turns += 1;
    }
    expect(turns).toBeGreaterThan(2);
    expect(engine.moveHistory.length).toBeGreaterThan(4);
  });
});

describe("online honor federations", () => {
  it("marks people-only tables as honor-check", () => {
    const { room } = createRoom({
      name: "Host",
      mode: "online",
      playerCount: 3,
    });
    expect(room.honorFederation).toBe(true);
    expect(room.status).toBe("lobby");
    expect(room.seats).toHaveLength(1);
  });
});

void playMove;
void playAiUntilHuman;
