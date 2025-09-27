import crypto from "crypto";
import { toClient,  counts} from "./common.mjs";

let messages = [];

export function getMsg(id) {
  return messages.find((m) => String(m.id )=== String(id) || null);
}

export function listSince(since = 0) {
  const n = Number.isFinite(Number(since)) ? Number(since) : 0;
  return messages
    .filter((m) => m.timestamp >= n)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(toClient);
}

export function createMsg({ sender = "Anonymous", content }) {
  if (!content) throw new Error("Content is required");
  const message = {
    id: crypto.randomUUID(),
    sender,
    content,
    timestamp: Date.now(),
    reactions: [],
  };
  messages.push(message);
  return toClient(message);
}

export function addReaction(id, type) {
  const msg = getMsg(id);
  if (!msg) return;

  if (type !== "like" && type !== "dislike") {
    throw new Error("Type must be 'like' or 'dislike' ");
  }
  msg.reactions.push({ type, at: new Date().toISOString() });
  const { likes, dislikes } = counts(msg);
  return { id: msg.id, likes, dislikes };
}
