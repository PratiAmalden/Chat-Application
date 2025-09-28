import express from "express";
import cors from "cors";
import { addReaction, createMsg, listSince, getMsg } from "./utils/server.mjs";
import { toClient } from "./utils/common.mjs";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/messages", (req, res) => {
  const item = listSince(req.query.since);
  res.json(item);
});

app.post("/messages", (req, res) => {
  try {
    const { sender, content } = req.body || {};
    const msg = createMsg({ sender, content });
    return res.status(201).json(msg);
  } catch (err) {
    return res.status(400).json({
      error: "Expected JSON with at least a 'content' field",
    });
  }
});

app.get("/messages/:id/reactions", (req, res) => {
  const msg = getMsg(req.params.id);
  if (!msg)
    return res.status(400).json({
      error: "Message not found",
    });
  res.json({
    id: msg.id,
    likes: toClient(msg).likes,
    dislikes: toClient(msg).dislikes,
    reactions: msg.reactions.map((r) => ({ type: r.type, at: r.at })),
  });
});

app.post("/messages/:id/reactions", (req, res) => {
  try {
    const reaction = addReaction(req.params.id, (req.body || {}).type);
    return res.json(reaction);
  } catch (err) {
    return res
      .status(400)
      .json({ error: "Body must include { type: 'like' | 'dislike' }" });
  }
});

app.listen(port, () => {
  console.log(`Chat application server on ${port}`);
});
