import type { AuctionBids, AuctionResult } from "./auction.ts";
import type { FactionId, PlanetType } from "./factions.ts";

export type GameMode = "ai" | "online";

export type RoomStatus = "lobby" | "auction" | "playing" | "finished";

export type HexView = {
  id: string;
  coord: string;
  q: number;
  r: number;
  sector: string;
  planet: PlanetType;
  building?: string;
  player?: number;
  additionalMine?: number;
  federations: number[];
  gaiaformer?: boolean;
};

export type SectorView = {
  id: string;
  rotation: number;
  q: number;
  r: number;
};

export type PowerView = {
  area1: number;
  area2: number;
  area3: number;
  gaia: number;
  brainstone: "area1" | "area2" | "area3" | "gaia" | null;
};

export type PlayerView = {
  index: number;
  name: string;
  isAi: boolean;
  connected: boolean;
  faction: FactionId | null;
  bid: number;
  startingVp: number;
  victoryPoints: number;
  credits: number;
  ore: number;
  knowledge: number;
  qic: number;
  power: PowerView;
  research: Record<string, number>;
  buildings: Record<string, number>;
  booster: string | null;
  techs: string[];
  passed: boolean;
  dropped: boolean;
};

export type AvailableMoveView = {
  name: string;
  player: number;
  data?: unknown;
};

export type GameView = {
  roomId: string;
  code: string;
  mode: GameMode;
  status: RoomStatus;
  honorFederation: boolean;
  playerCount: number;
  round: number;
  phase: string;
  ended: boolean;
  currentPlayer: number | null;
  you: number | null;
  map: HexView[];
  sectors: SectorView[];
  players: PlayerView[];
  available: AvailableMoveView[];
  log: string[];
  auction: {
    factions: FactionId[];
    submitted: boolean[];
    yourBids: AuctionBids | null;
    result: AuctionResult | null;
  } | null;
  boosters: string[];
  roundScoring: string[];
  finalScoring: string[];
  techTiles: Record<string, { tile: string; count: number } | null>;
  federations: Record<string, number>;
  boardActions: Record<string, number | null>;
  error?: string;
};

export type CreateRoomRequest = {
  name: string;
  mode: GameMode;
  playerCount: 2 | 3 | 4;
  aiCount?: 1 | 2 | 3;
  honorFederation?: boolean;
  centerSectorsFixed?: boolean;
};

export type JoinRoomRequest = {
  code: string;
  name: string;
};

export type SubmitBidsRequest = {
  bids: AuctionBids;
};

export type PlayMoveRequest = {
  move: string;
};
