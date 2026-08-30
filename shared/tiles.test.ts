import { describe, expect, it } from "vitest";
import { factionArt, sectorArt, tileArt } from "./art.ts";
import { tileText } from "./tiles.ts";

describe("tile labels", () => {
  it("does not show raw booster9 / score6 ids", () => {
    expect(tileText("booster", "booster9")).toMatch(/4 Power/i);
    expect(tileText("booster", "booster9")).toMatch(/PI or academy/i);
    expect(tileText("round", "score6")).toMatch(/Gaia planet/i);
    expect(tileText("round", "score10")).toMatch(/institute or academy/i);
    expect(tileText("final", "planetType")).toMatch(/planet types/i);
    expect(tileText("tech", "tech4")).toMatch(/7 VP/i);
    expect(tileText("fed", "fed1")).toMatch(/12 VP/i);
    expect(tileText("action", "power3")).toMatch(/2 Ore/i);
  });

  it("maps every printed tile to an artwork path", () => {
    expect(factionArt("terrans")).toBe("/art/factions/terrans.jpg");
    expect(sectorArt("5B")).toBe("/sectors/sector-05.png");
    expect(tileArt("round", "score6")).toBe("/art/tiles/score6.png");
    expect(tileArt("final", "planetType")).toBe("/art/tiles/final-planetType.png");
    expect(tileArt("booster", "booster9")).toBe("/art/tiles/booster9.png");
    expect(tileArt("fed", "fed1")).toBe("/art/tiles/fed1.png");
  });
});
