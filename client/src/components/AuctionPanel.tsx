import { useMemo, useState } from "react";
import { factionArt } from "../../../shared/art.ts";
import { FACTION_INFO, type FactionId } from "../../../shared/factions.ts";
import type { AuctionBids } from "../../../shared/auction.ts";
import type { GameView } from "../../../shared/types.ts";
import { emptyBids } from "../../../shared/auction.ts";

export function AuctionPanel({
  view,
  onSubmit,
}: {
  view: GameView;
  onSubmit: (bids: AuctionBids) => void;
}) {
  const factions = view.auction?.factions ?? [];
  const [bids, setBids] = useState<AuctionBids>(() => view.auction?.yourBids ?? emptyBids(factions));
  const submitted = view.you !== null && Boolean(view.auction?.submitted[view.you]);

  const preview = useMemo(
    () =>
      factions.map((faction) => ({
        faction,
        info: FACTION_INFO[faction as FactionId],
      })),
    [factions]
  );

  return (
    <section className="panel">
      <h2>Board Game Arena auction</h2>
      <p className="muted">
        Enter the maximum VP you would pay for each drafted faction. When every human has locked bids, a
        round-robin resolves automatically. Everyone then receives the highest bid in VP so the winner still
        starts with 10 to spend.
      </p>
      <div className="auction-grid">
        {preview.map(({ faction, info }) => (
          <article key={faction} className="auction-card">
            <img src={factionArt(faction)} alt={info.name} />
            <strong style={{ color: info.color }}>{info.name}</strong>
            <span className="muted">{info.summary}</span>
            <input
              type="number"
              min={0}
              max={40}
              disabled={submitted}
              value={bids[faction] ?? 0}
              onChange={(e) => setBids({ ...bids, [faction]: Number(e.target.value) })}
            />
          </article>
        ))}
      </div>
      <div className="row" style={{ marginTop: "0.8rem" }}>
        <button className="primary" disabled={submitted} onClick={() => onSubmit(bids)}>
          {submitted ? "Bids locked" : "Lock max bids"}
        </button>
        <span className="muted">
          {view.auction?.submitted.filter(Boolean).length}/{view.players.length} locked
        </span>
      </div>
    </section>
  );
}
