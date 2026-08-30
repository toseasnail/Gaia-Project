import { describe, expect, it } from "vitest";
import { aiMaxBids, resolveBgaAuction } from "./auction.ts";
import type { FactionId } from "./factions.ts";

describe("BGA auction", () => {
  it("matches the published 3-player BGA log (Ivits / Ambas / Terrans)", () => {
    const factions: FactionId[] = ["ivits", "ambas", "terrans"];
    const result = resolveBgaAuction(factions, [
      { playerIndex: 0, name: "A", isAi: false, maxBids: { ivits: 27, ambas: 0, terrans: 0 } as never },
      { playerIndex: 1, name: "B", isAi: false, maxBids: { ivits: 10, ambas: 8, terrans: 0 } as never },
      { playerIndex: 2, name: "C", isAi: false, maxBids: { ivits: 16, ambas: 12, terrans: 6 } as never },
    ]);

    const byPlayer = Object.fromEntries(result.assignments.map((row) => [row.playerIndex, row]));
    expect(byPlayer[0]).toMatchObject({ faction: "ivits", bid: 11 });
    expect(byPlayer[1]).toMatchObject({ faction: "ambas", bid: 6 });
    expect(byPlayer[2]).toMatchObject({ faction: "terrans", bid: 0 });
    expect(result.highestBid).toBe(11);
    expect(result.startingVp).toEqual([10, 15, 21]);

    expect(result.log[0]).toMatchObject({ playerIndex: 0, faction: "ivits", amount: 0 });
    expect(result.log[1]).toMatchObject({ playerIndex: 1, faction: "ivits", amount: 1 });
    expect(result.log[2]).toMatchObject({ playerIndex: 2, faction: "ivits", amount: 2 });
  });

  it("gives a faction away at 0 when nobody contests it", () => {
    const factions: FactionId[] = ["taklons", "xenos"];
    const result = resolveBgaAuction(factions, [
      { playerIndex: 0, name: "A", isAi: false, maxBids: { taklons: 8, xenos: 0 } as never },
      { playerIndex: 1, name: "B", isAi: false, maxBids: { taklons: 1, xenos: 4 } as never },
    ]);
    const byPlayer = Object.fromEntries(result.assignments.map((row) => [row.playerIndex, row]));
    expect(byPlayer[0].faction).toBe("taklons");
    expect(byPlayer[1].faction).toBe("xenos");
    expect(byPlayer[1].bid).toBe(0);
  });

  it("builds non-negative AI max bids for every drafted faction", () => {
    const factions: FactionId[] = ["itars", "lantids", "gleens"];
    const bids = aiMaxBids(factions, () => 0.4);
    expect(Object.keys(bids).sort()).toEqual(["gleens", "itars", "lantids"]);
    expect(Object.values(bids).every((n) => n >= 0)).toBe(true);
    expect(bids.itars).toBeGreaterThan(bids.lantids);
  });
});
