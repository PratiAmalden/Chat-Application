import { server as WebSocketServer } from "websocket";
import http from "http";
import { addReaction, createMsg, listSince } from "./utils.mjs";

const PORT = process.env.PORT || 8080;
const clients = new Set();

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("OK");
});
const wss = new WebSocketServer({ httpServer: server });

function broadcast(type, payload = {}) {
  const data = JSON.stringify({ type, ...payload });
  for (const c of clients) {
    try {
      c.sendUTF(data);
    } catch (err) { clients.delete(c) }
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

function originIsAllowed(origin) {
  return true;
}

wss.on("request", (req) => {
  if (!originIsAllowed(req.origin)) {
    req.reject();
    return;
  }

  const id = req.resourceURL?.query?.id;
  let connection = req.accept(null, req.origin);
  connection.userId = typeof id === "string" && id.trim() ? id.trim() : "Anonymous";

  connection.sendUTF(
    JSON.stringify({ type: "history", messages: listSince(0) })
  );
  clients.add(connection);

  connection.on("message", (message) => {
    if (message.type !== "utf8") return;

    let msg;
    try {
      msg = JSON.parse(message.utf8Data);
    } catch {
      sendError(connection, "Invalid JSON in message");
      return;
    }

    switch (msg.type) {
      case "sync": {
        const since = Number(msg.since) || 0;
        const history = listSince(since);
        connection.sendUTF(
          JSON.stringify({
            type: "history",
            messages: history,
          })
        );
        break;
      }
      case "chat": {
        const sender =
          typeof msg.sender === "string"
            ? msg.sender.trim()
            : connection.userId || "Anonymous";

        if (typeof msg.content !== "string" || !msg.content.trim()) {
          sendError(connection, "content is required");
          return;
        }

        const clientMsg = createMsg({ sender, content: msg.content.trim() });
        broadcast("chat", clientMsg);
        break;
      }
      case "reaction": {
        if (msg.reaction !== "like" && msg.reaction !== "dislike") {
          sendError(connection, "reaction must be like or dislike");
          return;
        }
        if (!msg.id) { 
          sendError(connection, "message id is required for reaction");
          return;
        }

        const reaction = addReaction(msg.id, msg.reaction);  
        if (reaction) broadcast("reaction", reaction);
        else sendError(connection, "message not found");
        break;
      }
      default:
        sendError(connection, `Unknown message type: ${String(msg.type)}`);
    }
  });
  connection.on("close", () => {
    clients.delete(connection);
  });
});

server.listen(PORT, () => {
  console.log(
    "Listening on http://localhost:" + PORT,
    "and ws://localhost:" + PORT + "/"
  );
});
