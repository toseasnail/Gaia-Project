import { describe, expect, it } from "vitest";
import { createRoom, submitBids, playMove } from "./room.ts";

describe("turn actions", () => {
  it("rejects a lone conversion as a turn", () => {
    const { room } = createRoom({ name: "Pilot", mode: "ai", playerCount: 2, aiCount: 1 });
    submitBids(room, room.seats[0].id, Object.fromEntries((room.auction?.factions ?? []).map((f) => [f, 1])) as never);

    while (room.engine && room.engine.phase === "setupBuilding" && room.engine.playerToMove === 0) {
      const cmd = room.engine.generateAvailableCommandsIfNeeded().find((c: { name: string }) => c.name === "build");
      const building = (cmd as { data?: { buildings: Array<{ building: string; coordinates: string }> } })?.data
        ?.buildings[0];
      if (!building) break;
      const prefix = room.engine.player(0)?.faction ?? "p1";
      playMove(room, room.seats[0].id, `${prefix} build ${building.building} ${building.coordinates}`);
    }

    if (room.engine?.phase === "roundMove" && room.engine.playerToMove === 0) {
      const prefix = room.engine.player(0)?.faction ?? "p1";
      expect(() => playMove(room, room.seats[0].id, `${prefix} spend 1q for 1o`)).toThrow(/free conversion/i);
    }
  });
});
