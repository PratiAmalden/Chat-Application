import { server as WebSocketServer } from "websocket";
import http from "http";
import {
  addReaction,
  createMsg,
  listSince,
} from "../shared/backend/server.mjs";


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
    } catch {}
  }
}

function originIsAllowed(origin) {
  return true;
}

wss.on("request", (request) => {
  if (!originIsAllowed(request.origin)) {
    request.reject();
    return;
  }

  let connection = request.accept(null, request.origin);
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
      connection.sendUTF(
        JSON.stringify({
          type: "error",
          message: "Message not found",
        })
      );
      return;
    }

    switch (msg.type) {
      case "sync": {
        const history = listSince(0);
        connection.sendUTF(
          JSON.stringify({
            type: "history",
            message: history,
          })
        );
        break;
      }
      case "chat": {
        const sender =
          typeof msg.sender === "string" ? msg.sender.trim() : "Anonymous";
        const clientMsg = createMsg({ sender, content: msg.content });
        broadcast("chat", clientMsg);
        break;
      }
      case "reaction": {
        if (msg.reaction !== "like" && msg.reaction !== "dislike") {
          connection.sendUTF(
            JSON.stringify({
              type: "error",
              message: "reaction must be like or dislike",
            })
          );
          return;
        }

        const reaction = addReaction(msg.id, msg.reaction);
        if (!msg.id) {
          connection.sendUTF(
            JSON.stringify({
              type: "error",
              message: "message id is required for reaction",
            })
          );
          return;
        }
        broadcast("reaction", reaction);
        break;
      }
      default:
        break;
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
