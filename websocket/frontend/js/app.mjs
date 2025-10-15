import {
  state,
  renderMessage,
  updateCounts,
  bumpLastSeen,
  wireCommonEvents,
  messagesEl,
} from "./utils.mjs";

let ws = null;
let wsReady = false;

function connectWS() {
  const url = `ws://localhost:8080/?id=${encodeURIComponent(
    state.currentUser
  )}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    wsReady = true;
    ws.send(JSON.stringify({ type: "sync", since: state.lastSeenTs || 0 }));
  };

  ws.onmessage = (e) => {
    let data;
    try {
      data = JSON.parse(e.data);
    } catch {
      return;
    }

    if (data.type === "history" && Array.isArray(data.messages)) {
      const root = messagesEl();
      for (const msg of data.messages) {
        renderMessage(msg, root);
        bumpLastSeen(msg.timestamp);
      }
      root.scrollTop = root.scrollHeight;
      return;
    }

    if (data.type === "chat") {
      const root = messagesEl();
      if (typeof data.id !== "undefined") {
        renderMessage(data, root);
        bumpLastSeen(data.timestamp);
        updateCounts(
          data.id,
          Number(data.likes ?? 0),
          Number(data.dislikes ?? 0)
      );
      root.scrollTop = root.scrollHeight;
      }
    return;
    }

    if (data.type === "reaction") {
      updateCounts(
        data.id,
        Number(data.likes ?? 0),
        Number(data.dislikes ?? 0)
      );
      return;
    }

    if (data.type === "error") {
      console.log("Server error:", data.message);
    }
  };

  ws.onclose = () => {
    wsReady = false;
    console.log("Disconnected, retrying in 3s...");
    setTimeout(connectWS, 3000)
  };
}

window.addEventListener("DOMContentLoaded", () => {
  wireCommonEvents({
    onJoined() {
      if (!ws || !wsReady) connectWS();
    },
    sendChat(content) {
      const payload = { type: "chat", sender: state.currentUser, content };
      if (wsReady) ws.send(JSON.stringify(payload));
      else console.warn("WS not ready, message dropped");
    },
    sendReaction(id, reaction) {
      const payload = { type: "reaction", id, reaction };
      if (wsReady) ws.send(JSON.stringify(payload));
      else console.warn("WS not ready, message dropped");
    },
  });
});
