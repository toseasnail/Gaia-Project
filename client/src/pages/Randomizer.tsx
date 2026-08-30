import { useState } from "react";
import { randomize } from "../api";

type Result = {
  seed: string;
  playerCount: number;
  centerSectorsFixed: boolean;
  sectors: Array<{ sector: string; rotation: number }>;
};

export function Randomizer() {
  const [playerCount, setPlayerCount] = useState(4);
  const [center, setCenter] = useState(true);
  const [seed, setSeed] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function generate() {
    const next = await randomize(playerCount, center, seed || undefined);
    setResult(next);
    setSeed(next.seed);
  }

  return (
    <section className="panel">
      <h2>uiqoo-style setup randomizer</h2>
      <p className="muted">
        Same idea as{" "}
        <a href="https://uiqoo.kr/boardgames/gaiaproject/randomizer.html" target="_blank" rel="noreferrer">
          uiqoo&apos;s BoardLife randomizer
        </a>
        : pick player count, optionally lock sectors 01–04 in the core, then shuffle the rest and rotate.
      </p>
      <div className="row">
        {([2, 3, 4] as const).map((n) => (
          <button key={n} className={playerCount === n ? "primary" : ""} onClick={() => setPlayerCount(n)}>
            {n} players
          </button>
        ))}
        <label className="row">
          <input type="checkbox" checked={center} onChange={(e) => setCenter(e.target.checked)} />
          Center sectors 01–04
        </label>
        <input placeholder="seed / share link id" value={seed} onChange={(e) => setSeed(e.target.value)} />
        <button className="gaia" onClick={generate}>
          Generate
        </button>
      </div>
      {result ? (
        <>
          <p>
            Seed <code>{result.seed}</code>
          </p>
          <div className="chips">
            {result.sectors.map((sector, i) => (
              <span className="chip" key={`${sector.sector}-${i}`}>
                {String(sector.sector).padStart(2, "0")} · rot {sector.rotation}
              </span>
            ))}
          </div>
        </>
      ) : null}
      <h3 style={{ marginTop: "1.2rem" }}>Separated space sectors</h3>
      <p className="muted">The photographed 10-sector cluster, cut into individual tiles for the map UI.</p>
      <div className="sector-grid">
        {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"].map((id) => (
          <figure key={id}>
            <img src={`/sectors/sector-${id}.png`} alt={`Sector ${id}`} />
            <figcaption className="muted">Sector {id}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
