let _currentUser = null;
let _lastSeenTs = 0;
let _currentBubbleColor = localStorage.getItem("bubbleColor") || "#fadcfc";
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
    localStorage.setItem("bubbleColor", _currentBubbleColor);
  },
};

function getEl(id) {
  return document.getElementById(id);
}

export function messagesEl() {
  return getEl("messages");
}

function handleJoinSubmit() {
  const join = getEl("join-screen");
  const chat = getEl("chat-screen");
  if (join && chat) {
    join.style.display = "none";
    chat.style.display = "grid";
  }
}

export function renderMessage(message, root = messagesEl()) {
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
    <p class="name"></p>
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
  msg.querySelector(".dislike-count").textContent = Number(
    message.dislikes ?? 0
  );

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

export function bumpLastSeen(ts) {
  const n = Number(ts);
  if (Number.isFinite(n)) {
    state.lastSeenTs = Math.max(state.lastSeenTs || 0, n);
  } else if (ts) {
    const d = new Date(ts).getTime();
    if (Number.isFinite(d)) {
      state.lastSeenTs = Math.max(state.lastSeenTs || 0, d);
    }
  }
}

export function wireCommonEvents({
  onJoined = () => {},
  sendChat = () => {}, 
  sendReaction = () => {}, 
  } = {}) {
  const on = (id, type, h) => getEl(id)?.addEventListener(type, h);

  on("join-screen", "submit", (e) => {
    e.preventDefault();
    const username = getEl("username")?.value.trim();
    state.currentUser = username || "Anonymous";
    handleJoinSubmit();
    onJoined();
  });

  on("message-form", "submit", (e) => {
    e.preventDefault();
    const inputEl = getEl("msg-input");
    const content = inputEl?.value.trim();
    if (!content) return;
    sendChat(content);
    e.target.reset();
  });

  on("messages", "click", (e) => {
    const btn = e.target.closest("button.like-btn, button.dislike-btn");
    if (!btn) return;
    const container = e.target.closest("article.message");
    const id = container?.dataset.id;
    if (!id) return;
    const reaction = btn.classList.contains("like-btn") ? "like" : "dislike";
    sendReaction(id, reaction);
  });

  const colorPicker = getEl("color-picker");
  if (colorPicker) {
    if(state.bubbleColor){
      colorPicker.value = state.bubbleColor;
    }
    colorPicker.addEventListener("input", (e) => {
      state.bubbleColor = e.target.value;
    });
  }
}
