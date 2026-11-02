let _currentUser = null;
let _lastSeenTs = 0;
let _currentBubbleColor = localStorage.getItem("bubbleColor") || "#fadcfc";
const renderedIds = new Set();

export const state = {
  get currentUser() {
    return _currentUser;
  },
  set currentUser(value) {
    _currentUser = value || "Anonymous";
  },
  get lastSeenTs() {
    return _lastSeenTs;
  },
  set lastSeenTs(value) {
    _lastSeenTs = Number(value) || 0;
  },
  get bubbleColor() {
    return _currentBubbleColor;
  },
  set bubbleColor(value) {
    _currentBubbleColor = value || "#fadcfc";
    localStorage.setItem("bubbleColor", _currentBubbleColor);
  },
};

export function getEl(id) {
  return document.getElementById(id);
}

export function messagesEl() {
  return getEl("messages");
}

export function setTransportStatus(message) {
  const status = getEl("transport-status");
  if (status) status.textContent = message;
}

export function renderMessage(message) {
  const root = messagesEl();
  if (!root || !message) return;

  // different
  if (message.id != null && renderedIds.has(String(message.id))) {
    updateCounts(message.id, Number(message.likes ?? 0), Number(message.dislikes ?? 0));
    return;
  }
  if (message.id != null) renderedIds.add(String(message.id));

  const isMe = Boolean(state.currentUser) && message.sender === state.currentUser;
  const time = new Date(message.timestamp);
  const msg = document.createElement("article");
  msg.className = `message${isMe ? " me" : ""}`;
  if (message.id != null) msg.dataset.id = String(message.id);

  const name = document.createElement("p");
  name.className = "name";
  name.textContent = message.sender || "Anonymous";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const text = document.createElement("p");
  text.className = "msg-text";
  text.textContent = message.content || "";
  bubble.append(text);
  if (isMe) bubble.style.backgroundColor = state.bubbleColor;

  const meta = document.createElement("footer");
  meta.className = "meta";
  const timeElement = document.createElement("time");
  timeElement.className = "time";
  timeElement.dateTime = time.toISOString();
  timeElement.textContent = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  meta.append(timeElement);

  for (const [kind, icon, count] of [
    ["like", "thumbs-up", Number(message.likes ?? 0)],
    ["dislike", "thumbs-down", Number(message.dislikes ?? 0)],
  ]) {
    const button = document.createElement("button");
    button.className = `${kind}-btn`;
    button.type = "button";
    button.setAttribute("aria-label", kind === "like" ? "Like" : "Dislike");
    button.innerHTML = `<i class="fa-solid fa-${icon}" aria-hidden="true"></i>`;
    const countElement = document.createElement("span");
    countElement.className = `${kind}-count`;
    countElement.textContent = count;
    button.append(countElement);
    meta.append(button);
  }

  msg.append(name, bubble, meta);
  root.append(msg);
  root.scrollTop = root.scrollHeight;
}

export function updateCounts(id, likes, dislikes) {
  const container = messagesEl()?.querySelector(
    `article.message[data-id="${CSS.escape(String(id))}"]`
  );
  if (!container) return;
  const likeCount = container.querySelector(".like-count");
  const dislikeCount = container.querySelector(".dislike-count");
  if (likeCount) likeCount.textContent = likes;
  if (dislikeCount) dislikeCount.textContent = dislikes;
}

export function bumpLastSeen(timestamp) {
  const value = Number(timestamp);
  if (Number.isFinite(value)) {
    state.lastSeenTs = Math.max(state.lastSeenTs, value);
  }
}

export function wireCommonEvents({ onJoined, sendChat, sendReaction }) {
  getEl("user-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = getEl("username")?.value.trim();
    state.currentUser = username || "Anonymous";
    const transport = document.querySelector('input[name="transport"]:checked')?.value;
    getEl("current-user").textContent = `${state.currentUser} · ${transport}`;
    getEl("join-screen").hidden = true;
    getEl("chat-screen").hidden = false;
    onJoined(transport);
  });

  getEl("message-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = getEl("msg-input");
    const content = input?.value.trim();
    if (!content) return;
    try {
      await sendChat(content);
      if (input) input.value = "";
    } catch (error) {
      console.error("Could not send message:", error);
      setTransportStatus("Message could not be sent. Check the connection and try again.");
    }
  });

  messagesEl()?.addEventListener("click", async (event) => {
    const button = event.target.closest("button.like-btn, button.dislike-btn");
    if (!button) return;

    const id = button.closest("article.message")?.dataset.id;
    if (!id) return;

    const reaction = button.classList.contains("like-btn") ? "like" : "dislike";
    try {
      await sendReaction(id, reaction);
    } catch (error) {
      console.error("Reaction failed:", error);
      setTransportStatus("Reaction could not be sent. Check the connection and try again.");
    }
  });

  const colorPicker = getEl("color-picker");
  if (colorPicker) {
    colorPicker.value = state.bubbleColor;
    colorPicker.addEventListener("input", (event) => {
      state.bubbleColor = event.target.value;
    });
  }
}
