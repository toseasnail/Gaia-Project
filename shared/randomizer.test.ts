import { describe, expect, it } from "vitest";
import { boosterCount, randomizeSectors } from "./randomizer.ts";

describe("uiqoo-style randomizer", () => {
  it("keeps ten sectors for 3–4 players and seven for 2", () => {
    expect(randomizeSectors(4, "alpha", true).sectors).toHaveLength(10);
    expect(randomizeSectors(2, "alpha", true).sectors).toHaveLength(7);
  });

  it("is deterministic for a seed", () => {
    const a = randomizeSectors(4, "uiqoo-demo", true);
    const b = randomizeSectors(4, "uiqoo-demo", true);
    expect(a.sectors).toEqual(b.sectors);
  });

  it("offers playerCount+3 boosters", () => {
    expect(boosterCount(2)).toBe(5);
    expect(boosterCount(4)).toBe(7);
  });
});
