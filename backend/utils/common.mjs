export function counts(msg) {
  let likes = 0;
  let dislikes = 0;
  for (const r of msg.reactions) {
    if (r.type === "like") likes += 1;
    else if (r.type === "dislike") dislikes += 1;
  }
  return { likes, dislikes };
}

export function toClient(msg) {
  const { likes, dislikes } = counts(msg);
  return {
    id: msg.id,
    sender: msg.sender,
    content: msg.content,
    timestamp: msg.timestamp,
    likes,
    dislikes,
  };
}
