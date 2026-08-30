import { useState } from "react";
import type { GameView } from "../../../shared/types.ts";

export function ActionDock({
  view,
  onMove,
}: {
  view: GameView;
  onMove: (move: string) => void;
}) {
  const yours = view.available.filter((cmd) => cmd.player === view.you);
  const prefix = view.players[view.you ?? 0]?.faction ?? `p${(view.you ?? 0) + 1}`;
  const yourTurn = view.currentPlayer === view.you && view.status === "playing";

  function send(body: string) {
    onMove(`${prefix} ${body}`);
  }

  return (
    <aside className="panel actions">
      <strong>{yourTurn ? "Your action" : "Waiting"}</strong>
      <span className="muted">
        {view.honorFederation
          ? "People table: federations are honor-checked."
          : "AI table: only legal federations are offered."}
      </span>
      {yours.map((cmd, i) => {
        if (cmd.name === "build") {
          const buildings = (cmd.data as { buildings: Array<{ building: string; coordinates: string; steps?: number }> })
            ?.buildings ?? [];
          return (
            <div key={i}>
              <div className="muted">Build / upgrade — click a highlighted hex, or pick:</div>
              <div className="row">
                {buildings.slice(0, 8).map((b) => (
                  <button key={b.coordinates + b.building} className="cmd" onClick={() => send(`build ${b.building} ${b.coordinates}`)}>
                    {b.building} {b.coordinates}
                    {b.steps ? ` +${b.steps}` : ""}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        if (cmd.name === "brainstone") {
          const choices = (cmd.data as { choices: Array<{ area: string; warning?: string }> })?.choices ?? [];
          return (
            <div key={i} className="panel" style={{ padding: "0.6rem" }}>
              <strong>Taklons — charge which token?</strong>
              <p className="muted">Brainstone spends as 3 power. A wasted charge is marked.</p>
              <div className="row">
                {choices.map((choice) => (
                  <button
                    key={choice.area}
                    className={choice.area === "area3" ? "primary" : ""}
                    onClick={() => send(`brainstone ${choice.area}`)}
                  >
                    {choice.area}
                    {choice.warning ? " (waste)" : ""}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        if (cmd.name === "charge") {
          const offers = (cmd.data as { offers: Array<{ offer: string; cost: string }> })?.offers ?? [];
          return (
            <div key={i} className="row">
              {offers.map((offer) => (
                <button key={offer.offer} onClick={() => send(`charge ${offer.offer}`)}>
                  Charge {offer.offer} for {offer.cost || "0"}
                </button>
              ))}
              <button onClick={() => send(`decline ${offers[0]?.offer ?? ""}`)}>Decline</button>
            </div>
          );
        }
        if (cmd.name === "federation") {
          const data = cmd.data as { tiles: string[]; federations: Array<{ hexes: string }> };
          if (view.honorFederation && (!data.federations || data.federations.length === 0)) {
            return (
              <HonorFederation key={i} tiles={data.tiles ?? []} onSend={send} />
            );
          }
          return (
            <div key={i}>
              <div className="muted">Legal federations (AI-checked)</div>
              {(data.federations ?? []).map((fed) => (
                <button key={fed.hexes} className="cmd" onClick={() => send(`federation ${fed.hexes} ${data.tiles[0]}`)}>
                  {fed.hexes}
                </button>
              ))}
            </div>
          );
        }
        if (cmd.name === "up") {
          const tracks = (cmd.data as { tracks: Array<{ field: string }> })?.tracks ?? [];
          return (
            <div key={i} className="row">
              {tracks.map((t) => (
                <button key={t.field} onClick={() => send(`up ${t.field}`)}>
                  Research {t.field}
                </button>
              ))}
            </div>
          );
        }
        if (cmd.name === "action") {
          const acts = (cmd.data as { poweracts: Array<{ name: string; cost: string }> })?.poweracts ?? [];
          return (
            <div key={i} className="row">
              {acts.map((act) => (
                <button key={act.name} onClick={() => send(`action ${act.name}`)}>
                  {act.name}
                </button>
              ))}
            </div>
          );
        }
        if (cmd.name === "pass" || cmd.name === "booster") {
          const boosters = (cmd.data as { boosters: string[] })?.boosters ?? [];
          return (
            <div key={i} className="row">
              {boosters.map((b) => (
                <button key={b} onClick={() => send(`${cmd.name} ${b}`)}>
                  {cmd.name} {b}
                </button>
              ))}
            </div>
          );
        }
        if (cmd.name === "tech" || cmd.name === "cover") {
          const tiles = (cmd.data as { tiles: Array<{ pos: string }> })?.tiles ?? [];
          return (
            <div key={i} className="row">
              {tiles.map((t) => (
                <button key={t.pos} onClick={() => send(`${cmd.name} ${t.pos}`)}>
                  {cmd.name} {t.pos}
                </button>
              ))}
            </div>
          );
        }
        if (cmd.name === "spend") {
          const acts = (cmd.data as { acts: Array<{ cost: string; income: string; hide?: boolean }> })?.acts ?? [];
          return (
            <div key={i} className="row">
              {acts
                .filter((a) => !a.hide)
                .slice(0, 8)
                .map((a) => (
                  <button key={a.cost + a.income} onClick={() => send(`spend ${a.cost} for ${a.income}`)}>
                    {a.cost}→{a.income}
                  </button>
                ))}
            </div>
          );
        }
        if (cmd.name === "burn") {
          const amounts = (cmd.data as number[]) ?? [];
          return (
            <div key={i} className="row">
              {amounts.map((n) => (
                <button key={n} onClick={() => send(`burn ${n}`)}>
                  Burn {n}
                </button>
              ))}
            </div>
          );
        }
        if (cmd.name === "income") {
          const opts = (cmd.data as string[]) ?? [];
          return (
            <div key={i} className="row">
              {opts.map((o) => (
                <button key={o} onClick={() => send(`income ${o}`)}>
                  Income {o}
                </button>
              ))}
            </div>
          );
        }
        return (
          <button key={i} className="cmd" onClick={() => send(cmd.name)}>
            {cmd.name}
          </button>
        );
      })}
      <div className="log">{view.log.slice(-12).join("\n")}</div>
    </aside>
  );
}

function HonorFederation({ tiles, onSend }: { tiles: string[]; onSend: (body: string) => void }) {
  const [hexes, setHexes] = useState("");
  const [tile, setTile] = useState(tiles[0] ?? "");
  return (
    <div>
      <div className="muted">Honor federation — enter hex ids the table agrees on (comma-separated).</div>
      <input value={hexes} onChange={(e) => setHexes(e.target.value)} placeholder="2A1,2B0,3C" />
      <div className="row">
        {tiles.map((t) => (
          <button key={t} className={tile === t ? "primary" : ""} onClick={() => setTile(t)}>
            {t}
          </button>
        ))}
      </div>
      <button className="gaia" onClick={() => onSend(`federation ${hexes} ${tile}`)}>
        Form federation
      </button>
    </div>
  );
}
