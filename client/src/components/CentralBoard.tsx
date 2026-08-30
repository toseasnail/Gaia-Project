import { RESEARCH_BOARD_ART, SCORING_BOARD_ART } from "../../../shared/art.ts";
import { FACTION_INFO, type FactionId } from "../../../shared/factions.ts";
import { TRACK_LABELS } from "../../../shared/tiles.ts";
import type { GameView } from "../../../shared/types.ts";
import { TileFace } from "./TileFace";

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
        <strong>Scoring board</strong>
        <span className="muted">
          Round {view.round || "–"} · {phaseLabel(view.phase)}
        </span>
      </div>

      <div className="scoring-board" style={{ backgroundImage: `url(${SCORING_BOARD_ART})` }}>
        <div className="round-strip on-art">
          {view.roundScoring.map((id, i) => (
            <TileFace
              key={id}
              kind="round"
              id={id}
              kicker={`Round ${i + 1}`}
              current={view.round === i + 1}
            />
          ))}
          {view.finalScoring.map((id) => (
            <TileFace key={id} kind="final" id={id} kicker="Final scoring" />
          ))}
        </div>
      </div>

      <h3>Research board</h3>
      <div className="research-shell" style={{ backgroundImage: `url(${RESEARCH_BOARD_ART})` }}>
        <div className="research-grid">
          {TRACKS.map((id) => {
            const std = view.techTiles[id];
            const adv = view.techTiles[`adv-${id}`];
            return (
              <button key={id} className="track-col" onClick={() => onTrack(id)}>
                {adv?.tile ? (
                  <TileFace kind="tech" id={adv.tile} kicker={`Advanced · ${TRACK_LABELS[id]}`} />
                ) : (
                  <article className="tile-face empty-slot">
                    <div className="tile-caption">
                      <div className="tile-kicker">Advanced · {TRACK_LABELS[id]}</div>
                      <div>Empty</div>
                    </div>
                  </article>
                )}
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
                {std?.tile ? (
                  <TileFace
                    kind="tech"
                    id={std.tile}
                    kicker={`Standard · ${TRACK_LABELS[id]}`}
                    taken={std.count === 0}
                  />
                ) : (
                  <article className="tile-face empty-slot">
                    <div className="tile-caption">Taken</div>
                  </article>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="free-techs">
        {["free1", "free2", "free3"].map((pos) => {
          const std = view.techTiles[pos];
          return std?.tile ? (
            <TileFace key={pos} kind="tech" id={std.tile} kicker="Standard tech (any track)" />
          ) : (
            <article key={pos} className="tile-face empty-slot">
              <div className="tile-caption">Open tech slot</div>
            </article>
          );
        })}
      </div>

      <h3>Power & QIC actions</h3>
      <div className="action-grid">
        {["power1", "power2", "power3", "power4", "power5", "power6", "power7", "qic1", "qic2", "qic3"].map((id) => {
          const taken = view.boardActions[id];
          const takenBy = taken === null || taken === undefined ? null : view.players[taken];
          return (
            <TileFace
              key={id}
              kind="action"
              id={id}
              kicker={id.startsWith("qic") ? "QIC action" : "Power action"}
              caption={
                takenBy ? `Taken by ${takenBy.faction ?? takenBy.name}` : undefined
              }
              taken={takenBy !== null}
              onClick={() => onBoardAction(id)}
            />
          );
        })}
      </div>

      <h3>Round boosters</h3>
      <div className="booster-grid">
        {view.boosters.map((id) => (
          <TileFace key={id} kind="booster" id={id} kicker="Available" />
        ))}
        {view.players
          .filter((player) => player.booster)
          .map((player) => (
            <TileFace
              key={player.index}
              kind="booster"
              id={player.booster!}
              kicker={player.name}
              held
            />
          ))}
      </div>

      <h3>Federation tokens</h3>
      <div className="fed-grid">
        {Object.entries(view.federations)
          .filter(([, count]) => count > 0)
          .map(([id, count]) => (
            <TileFace key={id} kind="fed" id={id} kicker={`${count} left`} />
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
