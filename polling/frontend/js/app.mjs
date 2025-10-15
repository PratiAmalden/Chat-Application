import {
  state,
  messagesEl,
  renderMessage,
  updateCounts,
  getMessagesSince,
  wireCommonEvents,
} from "./utils.mjs";

function startPolling() {
  async function tick() {
    try {
      const data = await getMessagesSince(state.lastSeenTs);
      for (const msg of data) {
        if (!msg.id) continue;

        const already = messagesEl()?.querySelector(
          `article.message[data-id="${msg.id}"]`
        );
        if (already) {
          updateCounts(msg.id, Number(msg.likes ?? 0), Number(msg.dislikes ?? 0));
          continue;
        }

        renderMessage(msg);
        
        if (
          typeof msg.timestamp === "number" &&
          msg.timestamp > state.lastSeenTs
        ) {
          state.lastSeenTs = msg.timestamp;
        }
      }
    } catch (err) {
      console.error(`Fetch failed: ${err.message}`);
    } finally {
      setTimeout(tick, 1000);
    }
  }
  tick();
}

window.onload = () => {
  wireCommonEvents({ onJoined: startPolling });
};
