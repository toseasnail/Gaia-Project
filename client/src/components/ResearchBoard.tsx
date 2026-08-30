import type { GameView } from "../../../shared/types.ts";

const TRACKS = [
  ["terra", "Terraform"],
  ["nav", "Nav"],
  ["int", "AI"],
  ["gaia", "Gaia"],
  ["eco", "Eco"],
  ["sci", "Science"],
] as const;

export function ResearchBoard({
  view,
  onTrack,
}: {
  view: GameView;
  onTrack: (field: string) => void;
}) {
  return (
    <section className="panel" style={{ padding: "0.7rem" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>Research</strong>
        <span className="muted">
          R{view.round || "–"} · {view.phase}
        </span>
      </div>
      <div className="tracks" style={{ marginTop: "0.5rem" }}>
        {TRACKS.map(([id, label]) => (
          <button key={id} className="track" onClick={() => onTrack(id)}>
            <div>{label}</div>
            <div className="lv">
              {view.players
                .map((p) => p.research?.[id] ?? 0)
                .join(" ")}
            </div>
          </button>
        ))}
      </div>
      <div className="chips" style={{ marginTop: "0.55rem" }}>
        {view.roundScoring.map((tile, i) => (
          <span className="chip" key={tile}>
            R{i + 1} {tile}
          </span>
        ))}
        {view.finalScoring.map((tile) => (
          <span className="chip" key={tile}>
            End {tile}
          </span>
        ))}
      </div>
    </section>
  );
}
