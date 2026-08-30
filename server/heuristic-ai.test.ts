import { describe, expect, it } from "vitest";
import { Engine } from "./gaia.ts";
import { evaluateState, playHeuristicTurn } from "./heuristic-ai.ts";

function boot(): Engine {
  const engine = new Engine(["init 2 heuristic-ai-seed"], { advancedRules: false, noFedCheck: false });
  if (engine.availableCommands?.some((cmd) => cmd.name === "rotate")) {
    const who = engine.playerToMove;
    engine.move(`${engine.player(who)?.faction ?? `p${who + 1}`} rotate`);
  }
  return engine;
}

describe("Steam-style heuristic AI", () => {
  it("scores extra victory points higher, like the digital app chasing VP", () => {
    const engine = boot();
    engine.move("p1 faction terrans");
    engine.move("p2 faction xenos");
    const before = evaluateState(engine, 0);
    engine.players[0].data.victoryPoints += 18;
    const after = evaluateState(engine, 0);
    expect(after).toBeGreaterThan(before + 100);
  });

  it("values faction research strengths (Terrans on Gaia over Intelligence)", () => {
    const engine = boot();
    engine.move("p1 faction terrans");
    engine.move("p2 faction xenos");
    const base = evaluateState(engine, 0);
    engine.players[0].data.research.gaia = 3;
    const gaia = evaluateState(engine, 0);
    engine.players[0].data.research.gaia = 0;
    engine.players[0].data.research.int = 3;
    const intel = evaluateState(engine, 0);
    expect(gaia).toBeGreaterThan(base);
    expect(gaia).toBeGreaterThan(intel);
  });

  it("plays a long stretch of legal turns without crashing", () => {
    const engine = boot();
    engine.move("p1 faction ivits");
    engine.move("p2 faction taklons");
    let turns = 0;
    for (let i = 0; i < 28; i++) {
      if (engine.ended || engine.playerToMove === undefined) break;
      if (!playHeuristicTurn(engine)) break;
      turns += 1;
    }
    expect(turns).toBeGreaterThan(6);
    expect(engine.moveHistory.length).toBeGreaterThan(8);
  });
});
