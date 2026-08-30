import { useState } from "react";
import { tileArt } from "../../../shared/art.ts";
import {
  BUILDING_LABELS,
  FOLLOW_UP_COMMANDS,
  MAIN_COMMANDS,
  TECH_TILES,
  TRACK_LABELS,
  tileText,
} from "../../../shared/tiles.ts";
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
  const followUps = yours.filter((cmd) => FOLLOW_UP_COMMANDS.has(cmd.name));
  const mains = yours.filter((cmd) => MAIN_COMMANDS.has(cmd.name));
  const conversions = yours.filter((cmd) => cmd.name === "spend" || cmd.name === "burn");
  const [queued, setQueued] = useState<string[]>([]);
  const mustFollow = followUps.length > 0;
  const waitingToClose = !mustFollow && !mains.length && yours.some((cmd) => cmd.name === "endturn");

  function send(body: string) {
    const extras = queued.length ? `${queued.join(". ")}. ` : "";
    setQueued([]);
    onMove(`${prefix} ${extras}${body}`);
  }

  return (
    <aside className="panel actions">
      <strong>{yourTurn ? (mustFollow ? "Finish this action" : "Your action") : "Waiting"}</strong>
      <span className="muted">
        {mustFollow
          ? "Resolve the choice below. Conversions are not a turn."
          : "Take one main action. Free conversions can be attached, but they do not replace a turn."}
      </span>

      {mustFollow
        ? followUps.map((cmd, i) => <CommandBlock key={i} cmd={cmd} view={view} onSend={send} />)
        : mains.map((cmd, i) => <CommandBlock key={i} cmd={cmd} view={view} onSend={send} />)}
      {waitingToClose ? (
        <button className="gaia" onClick={() => send("endturn")}>
          Confirm end of turn
        </button>
      ) : null}

      {!mustFollow && conversions.length > 0 ? (
        <details className="convert-box">
          <summary>Attach a free conversion (does not end your turn)</summary>
          <p className="muted">These are queued onto your next main action — you still must build, research, or pass.</p>
          {queued.length ? <div className="muted">Queued: {queued.join(" · ")}</div> : null}
          {conversions.map((cmd, i) => {
            if (cmd.name === "spend") {
              const acts = (cmd.data as { acts: Array<{ cost: string; income: string; hide?: boolean }> })?.acts ?? [];
              return (
                <div key={i} className="row">
                  {acts
                    .filter((a) => !a.hide)
                    .map((a) => (
                      <button
                        key={a.cost + a.income}
                        className="cmd"
                        onClick={() => setQueued((list) => [...list, `spend ${a.cost} for ${a.income}`])}
                      >
                        Convert {prettyRes(a.cost)} → {prettyRes(a.income)}
                      </button>
                    ))}
                </div>
              );
            }
            const amounts = (cmd.data as number[]) ?? [];
            return (
              <div key={i} className="row">
                {amounts.map((n) => (
                  <button key={n} className="cmd" onClick={() => setQueued((list) => [...list, `burn ${n}`])}>
                    Burn {n} token{n === 1 ? "" : "s"} (II → III)
                  </button>
                ))}
              </div>
            );
          })}
        </details>
      ) : null}

      <div className="log">{view.log.slice(-12).join("\n")}</div>
    </aside>
  );
}

function CommandBlock({
  cmd,
  view,
  onSend,
}: {
  cmd: { name: string; data?: unknown };
  view: GameView;
  onSend: (body: string) => void;
}) {
  if (cmd.name === "build") {
    const buildings =
      (cmd.data as { buildings: Array<{ building: string; coordinates: string; steps?: number }> })?.buildings ?? [];
    return (
      <div>
        <div className="muted">Build or upgrade — click a highlighted hex, or pick:</div>
        <div className="row">
          {buildings.slice(0, 10).map((b) => (
            <button key={b.coordinates + b.building} className="cmd" onClick={() => onSend(`build ${b.building} ${b.coordinates}`)}>
              {BUILDING_LABELS[b.building] ?? b.building} on {b.coordinates}
              {b.steps ? ` (${b.steps} terraform)` : ""}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (cmd.name === "brainstone") {
    const choices = (cmd.data as { choices: Array<{ area: string; warning?: string }> })?.choices ?? [];
    return (
      <div className="panel" style={{ padding: "0.6rem" }}>
        <strong>Taklons — which token is charged?</strong>
        <p className="muted">Brainstone spends as 3 power. A wasted charge is marked.</p>
        <div className="row">
          {choices.map((choice) => (
            <button
              key={choice.area}
              className={choice.area === "area3" ? "primary" : ""}
              onClick={() => onSend(`brainstone ${choice.area}`)}
            >
              {choice.area === "area1" ? "Normal token / bowl I" : choice.area === "area2" ? "Brainstone to bowl II" : choice.area === "area3" ? "Brainstone to bowl III" : choice.area}
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
      <div className="row">
        {offers.map((offer) => (
          <button key={offer.offer} className="primary" onClick={() => onSend(`charge ${offer.offer}`)}>
            Charge {offer.offer} {offer.cost ? `(pay ${offer.cost})` : "for free"}
          </button>
        ))}
        <button onClick={() => onSend(`decline ${offers[0]?.offer ?? ""}`)}>Decline charge</button>
      </div>
    );
  }
  if (cmd.name === "federation") {
    const data = cmd.data as { tiles: string[]; federations: Array<{ hexes: string }> };
    if (view.honorFederation && (!data.federations || data.federations.length === 0)) {
      return <HonorFederation tiles={data.tiles ?? []} onSend={onSend} />;
    }
    return (
      <div>
        <div className="muted">Legal federations</div>
        {(data.federations ?? []).map((fed) =>
          (data.tiles ?? []).slice(0, 3).map((tile) => (
            <button key={fed.hexes + tile} className="cmd art-cmd" onClick={() => onSend(`federation ${fed.hexes} ${tile}`)}>
              <img src={tileArt("fed", tile)} alt="" />
              Connect {fed.hexes} · take {tileText("fed", tile)}
            </button>
          ))
        )}
      </div>
    );
  }
  if (cmd.name === "up") {
    const tracks = (cmd.data as { tracks: Array<{ field: string }> })?.tracks ?? [];
    return (
      <div className="row">
        {tracks.map((t) => (
          <button key={t.field} onClick={() => onSend(`up ${t.field}`)}>
            Advance {TRACK_LABELS[t.field] ?? t.field}
          </button>
        ))}
      </div>
    );
  }
  if (cmd.name === "action") {
    const acts = (cmd.data as { poweracts: Array<{ name: string }> })?.poweracts ?? [];
    return (
      <div className="row">
        {acts.map((act) => (
          <button key={act.name} onClick={() => onSend(`action ${act.name}`)}>
            {tileText("action", act.name)}
          </button>
        ))}
      </div>
    );
  }
  if (cmd.name === "pass" || cmd.name === "booster") {
    const boosters = (cmd.data as { boosters: string[] })?.boosters ?? [];
    return (
      <div>
        <div className="muted">{cmd.name === "pass" ? "Pass and take a booster" : "Draft a round booster"}</div>
        {boosters.map((b) => (
          <button key={b} className="cmd art-cmd" onClick={() => onSend(`${cmd.name} ${b}`)}>
            <img src={tileArt("booster", b)} alt="" />
            {tileText("booster", b)}
          </button>
        ))}
      </div>
    );
  }
  if (cmd.name === "tech" || cmd.name === "cover") {
    const tiles = (cmd.data as { tiles: Array<{ pos: string; tile?: string }> })?.tiles ?? [];
    return (
      <div className="row">
        {tiles.map((t) => (
          <button key={t.pos} className="cmd art-cmd" onClick={() => onSend(`${cmd.name} ${t.pos}`)}>
            {t.tile ? <img src={tileArt("tech", t.tile)} alt="" /> : null}
            {t.tile ? TECH_TILES[t.tile] ?? t.tile : t.pos}
          </button>
        ))}
      </div>
    );
  }
  if (cmd.name === "income") {
    const opts = (cmd.data as string[]) ?? [];
    return (
      <div className="row">
        {opts.map((o) => (
          <button key={o} onClick={() => onSend(`income ${o}`)}>
            Take income {prettyRes(o)}
          </button>
        ))}
      </div>
    );
  }
  if (cmd.name === "special") {
    const acts = (cmd.data as { specialacts: Array<{ income: string }> })?.specialacts ?? [];
    return (
      <div className="row">
        {acts.map((a) => (
          <button key={a.income} onClick={() => onSend(`special ${a.income}`)}>
            Special: {a.income}
          </button>
        ))}
      </div>
    );
  }
  return null;
}

function HonorFederation({ tiles, onSend }: { tiles: string[]; onSend: (body: string) => void }) {
  const [hexes, setHexes] = useState("");
  const [tile, setTile] = useState(tiles[0] ?? "");
  return (
    <div>
      <div className="muted">Honor federation — hexes the table agrees on.</div>
      <input value={hexes} onChange={(e) => setHexes(e.target.value)} placeholder="2A1,2B0,3C" />
      <div className="row">
        {tiles.map((t) => (
          <button key={t} className={tile === t ? "primary" : ""} onClick={() => setTile(t)}>
            {tileText("fed", t)}
          </button>
        ))}
      </div>
      <button className="gaia" onClick={() => onSend(`federation ${hexes} ${tile}`)}>
        Form federation
      </button>
    </div>
  );
}

function prettyRes(code: string) {
  const names: Record<string, string> = {
    q: "QIC",
    o: "ore",
    k: "knowledge",
    c: "credits",
    pw: "power",
    t: "token",
    tg: "Gaia token",
  };
  return code.replace(/(\d+)([a-z]+)/g, (_, n, unit) => `${n} ${names[unit] ?? unit}`);
}
