import express from "express";
import cors from "cors";
import crypto from "crypto"

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let messages = [];

function counts(msg) {
  let likes = 0;
  let dislikes = 0;
  for (const r of msg.reactions) {
    if (r.type === "like") likes += 1;
    else if (r.type === "dislike") dislikes += 1;
  }
  return { likes, dislikes };
}

function getMsg(req, res) {
  const id = String(req.params.id);
  const msg = messages.find((m) => m.id === id);
  if (!msg){
    res.status(404).json({ error: "Message not found" });
    return null;
  }
  return msg;
}


app.get("/messages", (req, res) => {
  const raw = req.query.since;
  const n = raw == null ? 0 : Number(raw);
  const since = Number.isFinite(n) ? n : 0;

  const filtered = messages
    .filter((m) => m.timestamp >= since)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((m) => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp,
      ...counts(m),
    }));
  res.json(filtered);
});

app.post("/messages", (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object" || !body.content) {
    return res.status(400).json({
      error: "Expected JSON with at least a 'content' field",
    });
  }

  const message = {
    id: crypto.randomUUID(),
    sender: body.sender || "Anonymous",
    content: body.content,
    timestamp: new Date(),
    reactions: [],
  };

  messages.push(message);
  const { likes, dislikes } = counts(message);
  return res.status(201).json({ ...message, likes, dislikes });
});

app.get("/messages/:id/reactions", (req, res) => {
  const msg = getMsg(req, res);
  if (!msg) return;
  const { likes, dislikes } = counts(msg);
  res.json({
    id: msg.id,
    likes,
    dislikes,
    reactions: msg.reactions.map((r) => ({ type: r.type, at: r.at })),
  });
});

app.post("/messages/:id/reactions", (req, res) => {
  const msg = getMsg(req, res);
  if (!msg) return;

  const { type } = req.body || {};
  if (type !== "like" && type !== "dislike") {
    return res
      .status(400)
      .json({ error: "Body must include { type: 'like' | 'dislike' }" });
  }
  msg.reactions.push({ type, at: new Date().toISOString() });
  const { likes, dislikes } = counts(msg);
  return res.json({ id: msg.id, likes, dislikes });
});

app.listen(port, () => {
  console.log(`Chat application server on ${port}`);
});
