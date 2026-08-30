import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import {
  attachSocket,
  createRoom,
  detachSocket,
  getRoom,
  joinRoom,
  listPublicRooms,
  playMove,
  seatBySecret,
  submitBids,
} from "./room.ts";
import { toGameView } from "./view-model.ts";

const app = express();
app.use(express.json({ limit: "200kb" }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
});

function emitRoom(roomId: string) {
  const room = getRoom(roomId);
  if (!room) return;
  for (const seat of room.seats) {
    if (!seat.socketId) continue;
    io.to(seat.socketId).emit("state", toGameView(room, seat.id));
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "Gaia Project Online" });
});

app.get("/api/tables", (_req, res) => {
  res.json({ tables: listPublicRooms() });
});

app.post("/api/rooms", (req, res) => {
  try {
    const { room, secret } = createRoom(req.body);
    res.json({ secret, view: toGameView(room, room.hostId) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not create table" });
  }
});

app.post("/api/rooms/join", (req, res) => {
  try {
    const { room, secret } = joinRoom(String(req.body?.code ?? ""), String(req.body?.name ?? "Pilot"));
    const seat = room.seats.find((s) => s.secret === secret);
    emitRoom(room.id);
    res.json({ secret, view: toGameView(room, seat?.id ?? null) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not join table" });
  }
});

app.get("/api/rooms/:id", (req, res) => {
  const secret = String(req.headers["x-gaia-secret"] ?? "");
  const found = seatBySecret(secret);
  if (!found || found.room.id !== req.params.id) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  res.json({ view: toGameView(found.room, found.seat.id) });
});

app.post("/api/rooms/:id/bids", (req, res) => {
  try {
    const secret = String(req.headers["x-gaia-secret"] ?? "");
    const found = seatBySecret(secret);
    if (!found || found.room.id !== req.params.id) throw new Error("Table not found");
    submitBids(found.room, found.seat.id, req.body?.bids ?? {});
    emitRoom(found.room.id);
    res.json({ view: toGameView(found.room, found.seat.id) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Bid failed" });
  }
});

app.post("/api/rooms/:id/move", (req, res) => {
  try {
    const secret = String(req.headers["x-gaia-secret"] ?? "");
    const found = seatBySecret(secret);
    if (!found || found.room.id !== req.params.id) throw new Error("Table not found");
    playMove(found.room, found.seat.id, String(req.body?.move ?? ""));
    emitRoom(found.room.id);
    res.json({ view: toGameView(found.room, found.seat.id) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Illegal move" });
  }
});

io.on("connection", (socket) => {
  socket.on("hello", (secret: string) => {
    const found = attachSocket(String(secret ?? ""), socket.id);
    if (!found) {
      socket.emit("error", "Unknown seat");
      return;
    }
    socket.join(found.room.id);
    socket.emit("state", toGameView(found.room, found.seat.id));
  });
  socket.on("disconnect", () => detachSocket(socket.id));
});

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(here, "../dist/client");
app.use(express.static(clientDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
  res.sendFile(path.join(clientDir, "index.html"), (err) => (err ? next() : undefined));
});

const port = Number(process.env.PORT ?? 3001);
httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Gaia Project Online listening on ${port}`);
});

export { getRoom };
