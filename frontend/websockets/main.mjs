import {
  state,
  renderMessage,
  updateCounts,
  bumpLastSeen,
  wireCommonEvents,
} from "../../shared/frontend/frontend.mjs";

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
      for (const m of data.messages) {
        renderMessage(m);
        bumpLastSeen(m.timestamp);
      }
      return;
    }

    if (data.type === "chat") {
      if (typeof data.id !== "undefined") {
        renderMessage(data);
        bumpLastSeen(data.timestamp);
        updateCounts(
          data.id,
          Number(data.likes ?? 0),
          Number(data.dislikes ?? 0)
        );
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
    console.log("Disconnect from server");
  };
}

window.onload = () => {
  wireCommonEvents({
    onJoined() {
      if (!ws || !wsReady) connectWS();
    },
    sendChat(content) {
      if (!wsReady) {
        console.error("Not connected");
        return;
      }
      const payload = { type: "chat", sender: state.currentUser, content };
      ws.send(JSON.stringify(payload));
    },
    sendReactionFn(id, reaction) {
      if (!wsReady) {
        console.error("Not connected");
        return;
      }
      ws.send(JSON.stringify({ type: "reaction", id, reaction }));
    },
    canSend() {
      return wsReady;
    },
  });
};
