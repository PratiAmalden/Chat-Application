import crypto from "node:crypto";

let messages = [];
let version = 0;
const MAX_MESSAGES = 500;
const listeners = new Set();

function notifyChange() {
  version += 1;
  for (const listener of listeners) listener();
}

export function getVersion() {
  return version;
}

export function waitForChange(since, timeoutMs, signal) {
  if (version !== since) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      listeners.delete(onChange);
      signal?.removeEventListener("abort", onAbort);
    };
    const finish = () => {
      cleanup();
      resolve();
    };
    const onChange = () => {
      if (version !== since) finish();
    };
    const onAbort = () => {
      cleanup();
      reject(signal.reason || new Error("Long poll request was aborted"));
    };

    listeners.add(onChange);
    timer = setTimeout(finish, timeoutMs);
    signal?.addEventListener("abort", onAbort, { once: true });

    if (signal?.aborted) onAbort();
    else onChange();
  });
}

export function getMsg(id) {
  return messages.find((message) => String(message.id) === String(id)) || null;
}

export function toClient(message) {
  let likes = 0;
  let dislikes = 0;
  for (const reaction of message.reactions) {
    if (reaction.type === "like") likes += 1;
    else if (reaction.type === "dislike") dislikes += 1;
  }

  return {
    id: message.id,
    sender: message.sender,
    content: message.content,
    timestamp: message.timestamp,
    likes,
    dislikes,
  };
}

export function listSince(since = 0) {
  const timestamp = Number.isFinite(Number(since)) ? Number(since) : 0;
  return messages
    .filter((message) => message.timestamp >= timestamp)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(toClient);
}

export function createMsg({ sender = "Anonymous", content }) {
  if (!content) throw new Error("Content is required");
  const message = {
    id: crypto.randomUUID(),
    sender: typeof sender === "string" && sender.trim() ? sender.trim() : "Anonymous",
    content,
    timestamp: Date.now(),
    reactions: [],
  };
  messages.push(message);
  if (messages.length > MAX_MESSAGES) messages.shift();
  notifyChange();
  return toClient(message);
}

export function addReaction(id, type) {
  const message = getMsg(id);
  if (!message) return null;
  if (type !== "like" && type !== "dislike") {
    throw new Error("Type must be 'like' or 'dislike'");
  }

  message.reactions.push({ type, at: new Date().toISOString() });
  notifyChange();
  const { likes, dislikes } = toClient(message);
  return { id: message.id, likes, dislikes };
}

export function listReactions(message) {
  return message.reactions.map(({ type, at }) => ({ type, at }));
}
