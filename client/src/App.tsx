import { useEffect, useMemo, useState } from "react";
import type { GameView } from "../../shared/types.ts";
import { connectSocket } from "./api";
import { Home } from "./pages/Home";
import { Randomizer } from "./pages/Randomizer";
import { Table } from "./pages/Table";

type Page = "home" | "randomizer" | "table";

export function App() {
  const [page, setPage] = useState<Page>("home");
  const [view, setView] = useState<GameView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const socket = connectSocket((next) => {
      setView(next);
      setPage("table");
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const title = useMemo(() => {
    if (page === "randomizer") return "Setup randomizer";
    if (page === "table") return view?.code ? `Table ${view.code}` : "Table";
    return "Gaia Project Online";
  }, [page, view?.code]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>{title}</h1>
          <small>vs AI · or people on the internet · never mixed</small>
        </div>
        <div className="row">
          <button onClick={() => setPage("home")}>Lobby</button>
          <button onClick={() => setPage("randomizer")}>uiqoo randomizer</button>
        </div>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {page === "home" ? (
        <Home
          onError={setError}
          onPlay={(next) => {
            setView(next);
            setPage("table");
          }}
        />
      ) : null}
      {page === "randomizer" ? <Randomizer /> : null}
      {page === "table" && view ? <Table view={view} setView={setView} onError={setError} /> : null}
    </div>
  );
}
