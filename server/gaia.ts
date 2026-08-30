import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const loaded = require("@gaia-project/engine");
const EngineCtor = (typeof loaded === "function" ? loaded : loaded.default) as typeof import("@gaia-project/engine").default;

if (typeof EngineCtor !== "function") {
  throw new Error("Failed to load @gaia-project/engine constructor");
}

export const Engine = EngineCtor;
export const Command = loaded.Command ?? loaded.default?.Command;
export const PlayerEnum = loaded.Player ?? loaded.PlayerEnum ?? loaded.default?.Player;
