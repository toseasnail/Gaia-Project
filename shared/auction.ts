import { FACTION_STRENGTH, type FactionId } from "./factions.ts";

export type AuctionBids = Record<FactionId, number>;

export type AuctionSeat = {
  playerIndex: number;
  name: string;
  isAi: boolean;
  maxBids: AuctionBids;
};

export type AuctionStep = {
  playerIndex: number;
  faction: FactionId;
  amount: number;
  switched: boolean;
  gap: number;
};

export type AuctionResult = {
  assignments: Array<{
    playerIndex: number;
    faction: FactionId;
    bid: number;
  }>;
  highestBid: number;
  startingVp: number[];
  log: AuctionStep[];
};

type Slot = { holder: number | null; amount: number };

/**
 * Board Game Arena Gaia Project auction.
 *
 * Each seat secretly submits a max VP bid per drafted faction. A round-robin
 * then bids automatically on the faction with the greatest gap between that
 * max and the current bid (unclaimed current = -1). Unclaimed factions open
 * at 0; occupied factions rise by 1. After the highest bid is known, every
 * player receives that many VP so the winner still starts with 10 to spend.
 */
export function resolveBgaAuction(factions: FactionId[], seats: AuctionSeat[]): AuctionResult {
  if (factions.length !== seats.length) {
    throw new Error("BGA auction needs exactly one drafted faction per player");
  }

  const current = new Map<FactionId, Slot>();
  for (const faction of factions) {
    current.set(faction, { holder: null, amount: -1 });
  }

  const log: AuctionStep[] = [];
  const order = seats.map((seat) => seat.playerIndex);

  const heldBy = (playerIndex: number): FactionId | null => {
    for (const [faction, slot] of current) {
      if (slot.holder === playerIndex) return faction;
    }
    return null;
  };

  const uniqueHolders = () => {
    const holders = [...current.values()].map((slot) => slot.holder).filter((h): h is number => h !== null);
    return holders.length === seats.length && new Set(holders).size === seats.length;
  };

  let guard = 0;
  let cursor = 0;

  while (!uniqueHolders()) {
    if (guard++ > 8000) {
      throw new Error("BGA auction did not converge");
    }

    const playerIndex = order[cursor % order.length];
    cursor += 1;
    const seat = seats.find((item) => item.playerIndex === playerIndex);
    if (!seat) continue;

    const mine = heldBy(playerIndex);
    type Choice = {
      faction: FactionId;
      gap: number;
      next: number;
      unclaimed: boolean;
      stay: boolean;
    };

    const choices: Choice[] = [];

    if (mine) {
      const slot = current.get(mine)!;
      choices.push({
        faction: mine,
        gap: (seat.maxBids[mine] ?? 0) - slot.amount,
        next: slot.amount,
        unclaimed: false,
        stay: true,
      });
    }

    for (const faction of factions) {
      const slot = current.get(faction)!;
      if (slot.holder === playerIndex) continue;
      const maxBid = seat.maxBids[faction] ?? 0;
      const unclaimed = slot.holder === null;
      const next = unclaimed ? 0 : slot.amount + 1;
      if (next > maxBid) continue;
      choices.push({
        faction,
        gap: maxBid - slot.amount,
        next,
        unclaimed,
        stay: false,
      });
    }

    if (choices.length === 0) continue;

    choices.sort((a, b) => {
      if (b.gap !== a.gap) return b.gap - a.gap;
      if (a.stay !== b.stay) return a.stay ? -1 : 1;
      return factions.indexOf(a.faction) - factions.indexOf(b.faction);
    });

    const best = choices[0];
    if (best.stay) continue;

    if (mine && mine !== best.faction) {
      current.set(mine, { holder: null, amount: -1 });
    }

    current.set(best.faction, { holder: playerIndex, amount: best.next });
    log.push({
      playerIndex,
      faction: best.faction,
      amount: best.next,
      switched: Boolean(mine && mine !== best.faction),
      gap: best.gap,
    });
  }

  const assignments = factions
    .map((faction) => {
      const slot = current.get(faction)!;
      if (slot.holder === null) return null;
      return { playerIndex: slot.holder, faction, bid: Math.max(0, slot.amount) };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.playerIndex - b.playerIndex);

  const highestBid = assignments.reduce((max, row) => Math.max(max, row.bid), 0);
  const startingVp = seats.map((seat) => {
    const won = assignments.find((row) => row.playerIndex === seat.playerIndex);
    return 10 + highestBid - (won?.bid ?? 0);
  });

  return { assignments, highestBid, startingVp, log };
}

/** AI max bids express relative faction strength, plus a little jitter. */
export function aiMaxBids(factions: FactionId[], rng: () => number = Math.random): AuctionBids {
  const strengths = factions.map((faction) => FACTION_STRENGTH[faction]);
  const min = Math.min(...strengths);
  const bids = {} as AuctionBids;
  for (const faction of factions) {
    const relative = Math.round((FACTION_STRENGTH[faction] - min) * 10);
    const jitter = Math.floor(rng() * 3) - 1;
    bids[faction] = Math.max(0, relative + jitter);
  }
  return bids;
}

export function emptyBids(factions: FactionId[]): AuctionBids {
  const bids = {} as AuctionBids;
  for (const faction of factions) bids[faction] = 0;
  return bids;
}
