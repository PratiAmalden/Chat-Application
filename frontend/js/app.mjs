import {
  bumpLastSeen,
  renderMessage,
  setTransportStatus,
  state,
  updateCounts,
  wireCommonEvents,
} from "./utils.mjs";

const API = "/messages";
const LONG_POLL_TIMEOUT_MS = 25_000;
let activeTransport = null;
let pollVersion = 0;
let socket = null;
let reconnectTimer = null;

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return response.json();
}

async function sendHttpMessage(content) {
  await requestJson(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender: state.currentUser, content }),
  });
}

async function sendHttpReaction(id, type) {
  await requestJson(`${API}/${encodeURIComponent(id)}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
}

function applyMessages(messages) {
  for (const message of messages) {
    renderMessage(message);
    bumpLastSeen(message.timestamp);
  }
}

async function startLongPolling() {
  activeTransport = "long-polling";
  setTransportStatus("Long polling · connecting…");

  while (activeTransport === "long-polling") {
    try {
      const url = pollVersion
        ? `${API}?since=${pollVersion}&wait=${LONG_POLL_TIMEOUT_MS}`
        : API;
      const result = await requestJson(url);
      applyMessages(result.messages);
      pollVersion = result.version;
      setTransportStatus("Long polling · connected");
    } catch (error) {
      if (activeTransport !== "long-polling") return;
      console.error("Long poll failed:", error);
      setTransportStatus("Long polling · reconnecting…");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

function sendSocketMessage(payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket is not connected");
  }
  socket.send(JSON.stringify(payload));
}

function connectWebSocket() {
  if (activeTransport !== "websocket") return;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL("/ws/", window.location.href);
  url.protocol = protocol;
  url.searchParams.set("id", state.currentUser);
  socket = new WebSocket(url);

  socket.onopen = () => {
    setTransportStatus("WebSocket · connected");
    sendSocketMessage({ type: "sync", since: 0 });
  };

  socket.onmessage = ({ data }) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (error) {
      console.error("Invalid message received from WebSocket:", error);
      return;
    }

    if (message.type === "history" && Array.isArray(message.messages)) {
      applyMessages(message.messages);
    } else if (message.type === "chat") {
      applyMessages([message]);
    } else if (message.type === "reaction") {
      updateCounts(message.id, Number(message.likes), Number(message.dislikes));
    } else if (message.type === "error") {
      setTransportStatus(`WebSocket · ${message.message}`);
    }
  };

  socket.onclose = () => {
    if (activeTransport !== "websocket") return;
    setTransportStatus("WebSocket · disconnected, reconnecting…");
    reconnectTimer = setTimeout(connectWebSocket, 3000);
  };

  socket.onerror = (error) => {
    console.error("WebSocket connection error:", error);
  };
}

wireCommonEvents({
  onJoined(transport) {
    pollVersion = 0;
    activeTransport = transport;
    if (transport === "websocket") connectWebSocket();
    else void startLongPolling();
  },
  sendChat(content) {
    if (activeTransport === "websocket") {
      sendSocketMessage({ type: "chat", sender: state.currentUser, content });
      return;
    }
    return sendHttpMessage(content);
  },
  sendReaction(id, reaction) {
    if (activeTransport === "websocket") {
      sendSocketMessage({ type: "reaction", id, reaction });
      return;
    }
    return sendHttpReaction(id, reaction);
  },
});
