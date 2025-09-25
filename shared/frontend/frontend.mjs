// State
let _currentUser = null;
let _lastSeenTs = 0;
let _currentBubbleColor = "#fadcfc";
const renderedIds = new Set();

export const state = {
  get currentUser() {
    return _currentUser;
  },
  set currentUser(v) {
    _currentUser = v || "Anonymous";
  },
  get lastSeenTs() {
    return _lastSeenTs;
  },
  set lastSeenTs(v) {
    _lastSeenTs = Number(v) || 0;
  },
  get bubbleColor() {
    return _currentBubbleColor;
  },
  set bubbleColor(v) {
    _currentBubbleColor = v || "#fadcfc";
  },
};

// UI helpers
export function getEl(id) {
  return document.getElementById(id);
}

export function messagesEl() {
  return getEl("messages");
}

export function handleJoinSubmit() {
  const join = getEl("join-screen");
  const chat = getEl("chat-screen");
  if (join && chat) {
    join.style.display = "none";
    chat.style.display = "grid";
  }
}

// Rendering
export function renderMessage(message) {
  const root = messagesEl();
  if (!root || !message) return;

  if (message.id != null && renderedIds.has(String(message.id))) return;
  if (message.id != null) renderedIds.add(String(message.id));

  const isMe =
    Boolean(state.currentUser) && message.sender === state.currentUser;

  const time = new Date(message.timestamp);
  const timeISO = time.toISOString();
  const timeLabel = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const msg = document.createElement("article");
  msg.className = "message";
  if (isMe) msg.classList.add("me");
  if (message.id != null) msg.dataset.id = String(message.id);

  msg.innerHTML = `
    <h6 class="name"></h6>
    <div class="bubble">
      <p class="msg-text"></p>
    </div>
    <footer class="meta">
      <time class="time" datetime="${timeISO}">${timeLabel}</time>
      <button class="like-btn" type="button" aria-label="Like">
        <i class="fa-solid fa-thumbs-up" aria-hidden="true"></i>
        <span class="like-count">0</span>
      </button>
      <button class="dislike-btn" type="button" aria-label="Dislike">
        <i class="fa-solid fa-thumbs-down" aria-hidden="true"></i>
        <span class="dislike-count">0</span>
      </button>
    </footer>
  `;

  msg.querySelector(".name").textContent = message.sender || "Anonymous";
  msg.querySelector(".msg-text").textContent = message.content || "";
  msg.querySelector(".like-count").textContent = Number(message.likes ?? 0);
  msg.querySelector(".dislike-count").textContent = Number( message.dislikes ?? 0 );

  const bubble = msg.querySelector(".bubble");
  if (isMe) bubble.style.backgroundColor = state.bubbleColor;

  root.appendChild(msg);
}

export function updateCounts(id, likes, dislikes) {
  const root = messagesEl();
  if (!root) return;
  const container = root.querySelector(`article.message[data-id="${id}"]`);
  if (!container) return;
  const likeSpan = container.querySelector(".like-count");
  const dislikeSpan = container.querySelector(".dislike-count");
  if (likeSpan) likeSpan.textContent = likes;
  if (dislikeSpan) dislikeSpan.textContent = dislikes;
}

// API
export const API = "http://127.0.0.1:3000/messages";

export async function getMessagesSince(ts) {
  const qs = ts ? `?since=${ts}` : "";
  const res = await fetch(`${API}${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function bumpLastSeen(ts) {
  const n = Number(ts);
  if (Number.isFinite(n)) {
    state.lastSeenTs = Math.max(state.lastSeenTs || 0, n);
  } else if (ts) {
    const d = new Date(n).getTime();
    if (Number.isFinite(d)) {
      state.lastSeenTs = Math.max(state.lastSeenTs || 0, d);
    }
  }
}

export async function addMsg(payload) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

export async function sendReaction(id, type) {
  const res = await fetch(`${API}/${id}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

// Events wiring
export function wireCommonEvents({ onJoined, sendChat, sendReactionFn, canSend, } = {}) {
  const on = (id, type, h) => getEl(id)?.addEventListener(type, h);
  const canTx = () => (typeof canSend === "function" ? canSend() : true);

  on("join-screen", "submit", async (e) => {
    e.preventDefault();
    const username = getEl("username")?.value.trim();
    state.currentUser = username || "Anonymous";
    handleJoinSubmit();
    try { if (typeof onJoined === "function") await onJoined(); }
    catch (err) { console.error(`onJoined failed: ${err?.message || err}`); }
  });

  on("message-form", "submit", async (e) => {
    e.preventDefault();
    const inputEl = getEl("msg-input");
    const content = inputEl?.value.trim();
    if (!content) return;
    if (!canTx) return console.error("Not connected");

    try {
      if (typeof sendChat === "function") {
        await sendChat(content);
      } else {
        const serverMsg = await addMsg({ sender: state.currentUser, content });
        renderMessage(serverMsg);
      }
      e.target.reset();
    } catch (err) {
      console.error(`Send failed: ${err?.message || err}`);
    }
  });

  messagesEl()?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".like-btn, .dislike-btn");
    const container = e.target.closest("article.message");
    const id = container?.dataset.id;
    if (!id & !btn) return;
    if (!canTx) return console.error("Not connected");

    const reaction = btn.classList.contains("like-btn") ? "like" : "dislike";
    try {
      if (typeof sendReactionFn === "function") {
        await sendReactionFn(id, reaction);
      } else {
        const { likes, dislikes } = await sendReaction(id, reaction);
        updateCounts(id, Number(likes ?? 0), Number(dislikes ?? 0));
      }
    } catch (err) {
      console.error(`Reaction failed: ${err?.message || err}`);
    }
  });

  const colorPicker = getEl("color-picker");
  if (colorPicker) {
    colorPicker.value = state.bubbleColor;
    colorPicker.addEventListener("input", (e) => {
      state.bubbleColor = e.target.value;
    });
  }
}