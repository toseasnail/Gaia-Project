import { useEffect, useState } from "react";
import type { CreateRoomRequest, GameMode, GameView } from "../../../shared/types.ts";
import { createTable, joinTable, listTables } from "../api";

export function Home({
  onPlay,
  onError,
}: {
  onPlay: (view: GameView) => void;
  onError: (message: string) => void;
}) {
  const [mode, setMode] = useState<GameMode>("ai");
  const [name, setName] = useState("Pilot");
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [aiCount, setAiCount] = useState<1 | 2 | 3>(1);
  const [code, setCode] = useState("");
  const [tables, setTables] = useState<Array<{ code: string; seats: number; needed: number }>>([]);
  const [centerSectorsFixed, setCenterSectorsFixed] = useState(true);

  useEffect(() => {
    listTables()
      .then(setTables)
      .catch(() => undefined);
  }, []);

  const maxAi = Math.min(3, playerCount - 1) as 1 | 2 | 3;

  async function start() {
    onError("");
    try {
      const req: CreateRoomRequest = {
        name,
        mode,
        playerCount,
        aiCount: mode === "ai" ? (Math.min(aiCount, maxAi) as 1 | 2 | 3) : undefined,
        honorFederation: mode === "online",
        centerSectorsFixed,
      };
      onPlay(await createTable(req));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not open a table");
    }
  }

  async function join() {
    onError("");
    try {
      onPlay(await joinTable(code, name));
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not join");
    }
  }

  return (
    <div className="hero">
      <section className="panel">
        <h2>Open a table</h2>
        <p className="muted">
          Play the full Gaia Project rules: modular map, research, power cycle, and federations. Taklons
          choose whether the brainstone or a normal token is charged. AI tables validate federations.
          People-only tables use honor check, like sitting around a real board.
        </p>
        <label className="muted">Callsign</label>
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="mode-grid">
          <button className={`choice ${mode === "ai" ? "active" : ""}`} onClick={() => setMode("ai")}>
            <strong>vs AI</strong>
            <div className="muted">1–3 computer opponents. No internet opponents at the same table.</div>
          </button>
          <button className={`choice ${mode === "online" ? "active" : ""}`} onClick={() => setMode("online")}>
            <strong>People online</strong>
            <div className="muted">Share a table code. Humans check federations themselves.</div>
          </button>
        </div>
        <div className="setup-grid" style={{ marginTop: "0.8rem" }}>
          <label>
            Players
            <div className="row">
              {([2, 3, 4] as const).map((n) => (
                <button key={n} className={playerCount === n ? "primary" : ""} onClick={() => setPlayerCount(n)}>
                  {n}
                </button>
              ))}
            </div>
          </label>
          {mode === "ai" ? (
            <label>
              AI opponents
              <div className="row">
                {([1, 2, 3] as const)
                  .filter((n) => n < playerCount)
                  .map((n) => (
                    <button key={n} className={aiCount === n ? "primary" : ""} onClick={() => setAiCount(n)}>
                      {n} AI
                    </button>
                  ))}
              </div>
            </label>
          ) : null}
          <label className="row">
            <input
              type="checkbox"
              checked={centerSectorsFixed}
              onChange={(e) => setCenterSectorsFixed(e.target.checked)}
            />
            Keep sectors 01–04 in the center (uiqoo method)
          </label>
        </div>
        <div className="row" style={{ marginTop: "1rem" }}>
          <button className="primary" onClick={start}>
            {mode === "ai" ? "Start auction vs AI" : "Create open table"}
          </button>
        </div>
      </section>
      <section className="hero-art">
        <h2>Join a table</h2>
        <p className="muted">Board Game Arena bidding: secret max VP for each drafted faction, then auto-resolve.</p>
        <div className="row">
          <input placeholder="TABLE CODE" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button className="gaia" onClick={join}>
            Sit down
          </button>
        </div>
        {tables.length ? (
          <div className="chips" style={{ marginTop: "0.8rem" }}>
            {tables.map((table) => (
              <button key={table.code} className="chip" onClick={() => setCode(table.code)}>
                {table.code} {table.seats}/{table.needed}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">No open internet tables right now.</p>
        )}
      </section>
    </div>
  );
}
