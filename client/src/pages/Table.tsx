import { useMemo } from "react";
import type { AuctionBids } from "../../../shared/auction.ts";
import type { GameView, HexView } from "../../../shared/types.ts";
import { playMove, submitBids } from "../api";
import { ActionDock } from "../components/ActionDock";
import { AuctionPanel } from "../components/AuctionPanel";
import { FactionPanel } from "../components/FactionPanel";
import { HexMap } from "../components/HexMap";
import { ResearchBoard } from "../components/ResearchBoard";

export function Table({
  view,
  setView,
  onError,
}: {
  view: GameView;
  setView: (view: GameView) => void;
  onError: (message: string) => void;
}) {
  const highlighted = useMemo(() => {
    const set = new Set<string>();
    for (const cmd of view.available) {
      if (cmd.player !== view.you) continue;
      const buildings = (cmd.data as { buildings?: Array<{ coordinates: string }> })?.buildings ?? [];
      for (const b of buildings) {
        set.add(b.coordinates);
        const hex = view.map.find((h) => h.coord === b.coordinates);
        if (hex) set.add(hex.id);
      }
    }
    return set;
  }, [view]);

  async function move(text: string) {
    onError("");
    try {
      setView(await playMove(view.roomId, text));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Illegal move");
    }
  }

  async function bids(next: AuctionBids) {
    onError("");
    try {
      setView(await submitBids(view.roomId, next));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Bid failed");
    }
  }

  function onHex(hex: HexView) {
    const build = view.available.find((cmd) => cmd.name === "build" && cmd.player === view.you);
    const buildings = (build?.data as { buildings?: Array<{ building: string; coordinates: string }> })?.buildings ?? [];
    const match = buildings.find((b) => b.coordinates === hex.coord);
    if (match) {
      const prefix = view.players[view.you ?? 0]?.faction ?? `p${(view.you ?? 0) + 1}`;
      void move(`${prefix} build ${match.building} ${match.coordinates}`);
    }
  }

  function onTrack(field: string) {
    const up = view.available.find((cmd) => cmd.name === "up" && cmd.player === view.you);
    const tracks = (up?.data as { tracks?: Array<{ field: string }> })?.tracks ?? [];
    if (!tracks.some((t) => t.field === field)) return;
    const prefix = view.players[view.you ?? 0]?.faction ?? `p${(view.you ?? 0) + 1}`;
    void move(`${prefix} up ${field}`);
  }

  if (view.status === "lobby") {
    return (
      <section className="panel">
        <h2>Waiting for pilots</h2>
        <p>
          Share code <strong>{view.code}</strong>. {view.players.length} seated.
        </p>
      </section>
    );
  }

  if (view.status === "auction") {
    return <AuctionPanel view={view} onSubmit={bids} />;
  }

  return (
    <div className="game-layout">
      <FactionPanel players={view.players} current={view.currentPlayer} you={view.you} />
      <div>
        <ResearchBoard view={view} onTrack={onTrack} />
        <HexMap
          view={view}
          highlighted={highlighted}
          onHex={onHex}
        />
      </div>
      <ActionDock view={view} onMove={move} />
    </div>
  );
}
