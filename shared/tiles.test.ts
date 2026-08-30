import { describe, expect, it } from "vitest";
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
});
