import express from "express";
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { server as WebSocketServer } from "websocket";
import {
  addReaction,
  createMsg,
  getMsg,
  getVersion,
  listReactions,
  listSince,
  toClient,
  waitForChange,
} from "./utils.mjs";

const PORT = Number(process.env.PORT) || 3000;
const LONG_POLL_TIMEOUT_MS = 25_000;
const frontendPath = fileURLToPath(new URL("../frontend", import.meta.url));
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ httpServer: server });
const clients = new Set();

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

app.get("/messages", async (req, res) => { // explain
  const since = Number(req.query.since);
  const hasCursor = req.query.since !== undefined && Number.isFinite(since);
  const requestedWait = Number(req.query.wait);
  const waitMs = Number.isFinite(requestedWait)
    ? Math.max(0, Math.min(requestedWait, LONG_POLL_TIMEOUT_MS))
    : LONG_POLL_TIMEOUT_MS;

  if (hasCursor && waitMs > 0) {
    const abortController = new AbortController();
    res.on("close", () => abortController.abort());
    try {
      await waitForChange(since, waitMs, abortController.signal);
    } catch (error) {
      if (!res.destroyed) {
        console.error("Long poll wait failed:", error);
        res.status(500).json({ error: "Could not wait for messages" });
      }
      return;
    }
    if (res.destroyed) return;
  }

  res.json({ messages: listSince(0), version: getVersion() });
});

app.post("/messages", (req, res) => {
  try {
    const { sender, content } = req.body || {};
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }
    const message = createMsg({ sender, content: content.trim() });
    broadcast("chat", message);
    return res.status(201).json(message);
  } catch (error) {
    console.error("Could not create message:", error);
    return res.status(400).json({ error: error.message });
  }
});

app.get("/messages/:id/reactions", (req, res) => {
  const message = getMsg(req.params.id);
  if (!message) return res.status(404).json({ error: "Message not found" });
  const { likes, dislikes } = toClient(message);
  return res.json({
    id: message.id,
    likes,
    dislikes,
    reactions: listReactions(message),
  });
});

app.post("/messages/:id/reactions", (req, res) => {
  try {
    const reaction = addReaction(req.params.id, req.body?.type);
    if (!reaction) return res.status(404).json({ error: "Message not found" });
    broadcast("reaction", reaction);
    return res.json(reaction);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.use(express.static(frontendPath, { index: "index.html", maxAge: 0 }));

function broadcast(type, payload = {}) {
  const data = JSON.stringify({ type, ...payload });
  for (const connection of clients) {
    if (connection.connected) connection.sendUTF(data);
    else clients.delete(connection);
  }
}

function sendError(connection, message){
  connection.sendUTF(
    JSON.stringify({
      type: "error",
      message,
    })
  )
}

wss.on("request", (request) => {
  if (request.resourceURL?.pathname !== "/ws/") {
    request.reject(404, "Not Found");
    return;
  }

  const connection = request.accept(null, request.origin);
  const requestedId = request.resourceURL.query.id;
  connection.userId =
    typeof requestedId === "string" && requestedId.trim()
      ? requestedId.trim()
      : "Anonymous";
  clients.add(connection);

  connection.on("message", (frame) => {
    if (frame.type !== "utf8") return;

    let message;
    try {
      message = JSON.parse(frame.utf8Data);
    } catch {
      sendError(connection, "Invalid JSON in message");
      return;
    }

    switch (message.type) {
      case "sync": {
        connection.sendUTF(JSON.stringify({ type: "history", messages: listSince(message.since) }));
        break;
      }
      case "chat": {
        if (typeof message.content !== "string" || !message.content.trim()) {
          sendError(connection, "content is required");
          return;
        }
        const chatMessage = createMsg({
          sender: typeof message.sender === "string" ? message.sender : connection.userId,
          content: message.content.trim(),
        });
        broadcast("chat", chatMessage);
        break;
      }
      case "reaction": {
        try {
          const reaction = addReaction(message.id, message.reaction);
          if (!reaction) {
            sendError(connection, "message not found")
            return;
          }
          broadcast("reaction", reaction);
        } catch (error) {
          sendError(connection, error.message)
        }
        break;
      }
      default:
        connection.sendUTF(
          sendError(connection, `Unknown message type: ${String(message.type)}`)
        );
    }
  });
  connection.on("close", () => clients.delete(connection));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Chat application listening on port ${PORT}`);
});
