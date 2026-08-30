import {
  BOARD_ACTIONS,
  BOOSTER_TILES,
  FEDERATION_TILES,
  FINAL_SCORING_TILES,
  ROUND_SCORING_TILES,
  TECH_TILES,
  TRACK_LABELS,
  tileText,
} from "../../../shared/tiles.ts";
import { FACTION_INFO, type FactionId } from "../../../shared/factions.ts";
import type { GameView } from "../../../shared/types.ts";

const TRACKS = ["terra", "nav", "int", "gaia", "eco", "sci"] as const;

export function CentralBoard({
  view,
  onTrack,
  onBoardAction,
}: {
  view: GameView;
  onTrack: (field: string) => void;
  onBoardAction: (name: string) => void;
}) {
  return (
    <section className="panel central-board">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>Research board</strong>
        <span className="muted">
          Round {view.round || "–"} · {phaseLabel(view.phase)}
        </span>
      </div>

      <div className="round-strip">
        {view.roundScoring.map((id, i) => (
          <article key={id} className={`tile-card ${view.round === i + 1 ? "current-round" : ""}`}>
            <div className="tile-kicker">Round {i + 1} scoring</div>
            <div>{ROUND_SCORING_TILES[id] ?? id}</div>
          </article>
        ))}
        {view.finalScoring.map((id) => (
          <article key={id} className="tile-card final">
            <div className="tile-kicker">Final scoring</div>
            <div>{FINAL_SCORING_TILES[id] ?? id}</div>
          </article>
        ))}
      </div>

      <div className="research-grid">
        {TRACKS.map((id) => {
          const std = view.techTiles[id];
          const adv = view.techTiles[`adv-${id}`];
          return (
            <button key={id} className="track-col" onClick={() => onTrack(id)}>
              <div className="tile-card adv">
                <div className="tile-kicker">Advanced · {TRACK_LABELS[id]}</div>
                <div>{adv?.tile ? TECH_TILES[adv.tile] ?? adv.tile : "—"}</div>
              </div>
              <div className="levels">
                {[5, 4, 3, 2, 1, 0].map((level) => (
                  <div key={level} className="level-row">
                    <span className="muted">{level}</span>
                    {view.players.map((player) =>
                      (player.research?.[id] ?? 0) === level ? (
                        <b key={player.index} style={{ color: FACTION_INFO[player.faction as FactionId]?.color }}>
                          ●
                        </b>
                      ) : null
                    )}
                  </div>
                ))}
              </div>
              <div className="tile-card">
                <div className="tile-kicker">Standard tech · {TRACK_LABELS[id]}</div>
                <div>
                  {std?.tile ? TECH_TILES[std.tile] ?? std.tile : "—"}
                  {std && std.count === 0 ? " (taken)" : ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="free-techs">
        {["free1", "free2", "free3"].map((pos) => {
          const std = view.techTiles[pos];
          return (
            <article key={pos} className="tile-card">
              <div className="tile-kicker">Standard tech (any track)</div>
              <div>{std?.tile ? TECH_TILES[std.tile] ?? std.tile : "—"}</div>
            </article>
          );
        })}
      </div>

      <h3>Power & QIC actions</h3>
      <div className="action-grid">
        {Object.entries(BOARD_ACTIONS).map(([id, act]) => {
          const taken = view.boardActions[id];
          const takenBy = taken === null || taken === undefined ? null : view.players[taken];
          return (
            <button
              key={id}
              className={`tile-card action-tile ${takenBy ? "used" : ""}`}
              disabled={takenBy !== null}
              onClick={() => onBoardAction(id)}
            >
              <div className="tile-kicker">{id.startsWith("qic") ? "QIC action" : "Power action"}</div>
              <div>
                {act.cost} → {act.effect}
              </div>
              {takenBy ? <div className="muted">Taken by {takenBy.faction ?? takenBy.name}</div> : null}
            </button>
          );
        })}
      </div>

      <h3>Round boosters in play</h3>
      <div className="booster-grid">
        {view.boosters.map((id) => {
          const tile = BOOSTER_TILES[id];
          return (
            <article key={id} className="tile-card booster">
              <div className="tile-kicker">{tile?.title ?? id}</div>
              <div>{tileText("booster", id)}</div>
              <div className="muted">Available to draft</div>
            </article>
          );
        })}
        {view.players
          .filter((player) => player.booster)
          .map((player) => (
            <article key={player.index} className="tile-card booster held">
              <div className="tile-kicker">
                {BOOSTER_TILES[player.booster!]?.title ?? player.booster} · {player.name}
              </div>
              <div>{tileText("booster", player.booster!)}</div>
            </article>
          ))}
      </div>

      <h3>Federation tokens</h3>
      <div className="chips">
        {Object.entries(view.federations)
          .filter(([, count]) => count > 0)
          .map(([id, count]) => (
            <span className="chip" key={id}>
              {FEDERATION_TILES[id] ?? id} ×{count}
            </span>
          ))}
      </div>
    </section>
  );
}

function phaseLabel(phase: string) {
  const names: Record<string, string> = {
    setupBuilding: "Place starting structures",
    setupBooster: "Draft a round booster",
    roundMove: "Actions",
    roundIncome: "Income",
    roundGaia: "Gaia phase",
    roundLeech: "Charge power",
  };
  return names[phase] ?? phase;
}
