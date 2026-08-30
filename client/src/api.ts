import { io, type Socket } from "socket.io-client";
import type { AuctionBids } from "../../shared/auction.ts";
import type { CreateRoomRequest, GameView } from "../../shared/types.ts";

const SECRET_KEY = "gaia-secret";

export function storedSecret(): string | null {
  return localStorage.getItem(SECRET_KEY);
}

export function storeSecret(secret: string) {
  localStorage.setItem(SECRET_KEY, secret);
}

async function parse(res: Response) {
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body;
}

export async function createTable(req: CreateRoomRequest): Promise<GameView> {
  const body = await parse(
    await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    })
  );
  storeSecret(body.secret);
  return body.view;
}

export async function joinTable(code: string, name: string): Promise<GameView> {
  const body = await parse(
    await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name }),
    })
  );
  storeSecret(body.secret);
  return body.view;
}

export async function loadTable(roomId: string): Promise<GameView> {
  const secret = storedSecret();
  const body = await parse(
    await fetch(`/api/rooms/${roomId}`, {
      headers: { "x-gaia-secret": secret ?? "" },
    })
  );
  return body.view;
}

export async function submitBids(roomId: string, bids: AuctionBids): Promise<GameView> {
  const body = await parse(
    await fetch(`/api/rooms/${roomId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-gaia-secret": storedSecret() ?? "" },
      body: JSON.stringify({ bids }),
    })
  );
  return body.view;
}

export async function playMove(roomId: string, move: string): Promise<GameView> {
  const body = await parse(
    await fetch(`/api/rooms/${roomId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-gaia-secret": storedSecret() ?? "" },
      body: JSON.stringify({ move }),
    })
  );
  return body.view;
}

export async function listTables() {
  const body = await parse(await fetch("/api/tables"));
  return body.tables as Array<{ code: string; seats: number; needed: number }>;
}

export async function randomize(playerCount: number, centerSectorsFixed: boolean, seed?: string) {
  const body = await parse(
    await fetch("/api/randomize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerCount, centerSectorsFixed, seed }),
    })
  );
  return body;
}

export function connectSocket(onState: (view: GameView) => void): Socket {
  const socket = io({ transports: ["websocket", "polling"] });
  socket.on("connect", () => {
    const secret = storedSecret();
    if (secret) socket.emit("hello", secret);
  });
  socket.on("state", onState);
  return socket;
}
