import { FACTION_INFO, type FactionId } from "../../../shared/factions.ts";
import { TECH_TILES, tileText } from "../../../shared/tiles.ts";
import type { PlayerView } from "../../../shared/types.ts";

export function FactionPanel({ players, current, you }: { players: PlayerView[]; current: number | null; you: number | null }) {
  return (
    <aside>
      {players.map((player) => {
        const info = player.faction ? FACTION_INFO[player.faction as FactionId] : null;
        return (
          <article
            key={player.index}
            className={`player-card ${player.index === you ? "you" : ""} ${player.index === current ? "current" : ""}`}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong style={{ color: info?.color }}>{info?.name ?? "Unassigned"}</strong>
              <span className="muted">
                {player.name}
                {player.isAi ? " · AI" : ""}
                {player.passed ? " · passed" : ""}
              </span>
            </div>
            <div className="muted" style={{ fontSize: "0.78rem" }}>
              {player.victoryPoints} VP · bid {player.bid} · start {player.startingVp}
            </div>
            <div className="chips" style={{ marginTop: "0.35rem" }}>
              <span className="chip">{player.credits}c</span>
              <span className="chip">{player.ore}o</span>
              <span className="chip">{player.knowledge}k</span>
              <span className="chip">{player.qic}q</span>
            </div>
            <div className="power-bowls">
              <div className="bowl">
                <div>I</div>
                <div className="n">
                  {player.power.area1}
                  {player.power.brainstone === "area1" ? <span className="brain"> B</span> : null}
                </div>
              </div>
              <div className="bowl">
                <div>II</div>
                <div className="n">
                  {player.power.area2}
                  {player.power.brainstone === "area2" ? <span className="brain"> B</span> : null}
                </div>
              </div>
              <div className="bowl">
                <div>III</div>
                <div className="n">
                  {player.power.area3}
                  {player.power.brainstone === "area3" ? <span className="brain"> B</span> : null}
                </div>
              </div>
              <div className="bowl">
                <div>Gaia</div>
                <div className="n">
                  {player.power.gaia}
                  {player.power.brainstone === "gaia" ? <span className="brain"> B</span> : null}
                </div>
              </div>
            </div>
            {player.booster ? (
              <p className="muted" style={{ fontSize: "0.75rem", margin: "0.4rem 0 0" }}>
                Booster: {tileText("booster", player.booster)}
              </p>
            ) : null}
            {player.techs?.length ? (
              <p className="muted" style={{ fontSize: "0.75rem", margin: "0.25rem 0 0" }}>
                Tech: {player.techs.map((id) => TECH_TILES[id] ?? id).join(" · ")}
              </p>
            ) : null}
            {player.faction === "taklons" ? (
              <p className="muted" style={{ fontSize: "0.75rem", margin: "0.4rem 0 0" }}>
                Brainstone is purple <span className="brain">B</span>. When power charges, choose the stone or a
                normal token.
              </p>
            ) : null}
          </article>
        );
      })}
    </aside>
  );
}
