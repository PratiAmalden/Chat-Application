import express from "express";
import cors from "cors";
import { addReaction, createMsg, listSince, getMsg, toClient } from "./utils.mjs";

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
    return res.status(400).json({ error: err.message });
  }
});

app.get("/messages/:id/reactions", (req, res) => {
  const msg = getMsg(req.params.id);
  if (!msg)
    return res.status(404).json({
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
    const { type } = req.body || {};
    if (!["like", "dislike"].includes(type)) {
      throw new Error("Body must include { type: 'like' | 'dislike' }");
    }
    const reaction = addReaction(req.params.id, (req.body || {}).type);
    return res.json(reaction);
  } catch (err) {
    return res
      .status(400)
      .json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Chat application server on ${port}`);
});
