const API = "http://127.0.0.1:3000/messages";

function getEl(id){ return document.getElementById(id); }

const messagesEl = getEl("messages");
let currentUser = null;

const renderedIds = new Set();

function handleJoinSubmit(e) { // done
  e.preventDefault();
  const username = getEl("username")?.value.trim();
  currentUser = username || "Anonymous";

  const join = getEl("join-screen");
  const chat = getEl("chat-screen");

  if (join && chat) {
    join.style.display = "none";
    chat.style.display = "grid";
  }
  fetchMsg();
}

function renderMessage(message){
    if(!messagesEl || !message) return;

    if (message.id != null && renderedIds.has(String(message.id))) return;
    if (message.id != null) renderedIds.add(String(message.id));

    const isMe = Boolean(currentUser) && message.sender === currentUser;

     const time = new Date(message.timestamp);
     const timeISO = time.toISOString();
     const timeLabel = time.toLocaleTimeString([], {
       hour: "2-digit",
       minute: "2-digit",
     });

    const msg = document.createElement("article");
    msg.className = "message";
    if(isMe) msg.classList.add("me");
    if(message.id != null) msg.dataset.id = String(message.id);

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

    msg.querySelector(".name").textContent = message.sender || 'Anonymous';
    msg.querySelector('.msg-text').textContent = message.content || '';
  
    msg.querySelector(".like-count").textContent = Number(message.likes ?? 0);
    msg.querySelector(".dislike-count").textContent = Number(message.dislikes ?? 0);
 
    const bubble = msg.querySelector(".bubble");
    const pickedColor = getEl("color-picker")?.value;
    if(isMe && pickedColor) {
        bubble.style.backgroundColor = pickedColor;
    }
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;

}

// schedule a message to be sent at some time in the future.


// replay to other msgs


// see msgs
async function fetchMsg() {
    try{
        const res = await fetch(API);
        if(!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        data.forEach(renderMessage);;
    } catch (error){
        console.error(`Fetch failed: ${error.message}`);
    }
}

const keepFetchingMessages = async () => {
  const lastMessageTime =
    state.messages.length > 0
      ? state.messages[state.messages.length - 1].timestamp
      : null;
  const queryString = lastMessageTime ? `?since=${lastMessageTime}` : "";
  const url = `${API}/messages${queryString}`;
  const rawResponse = await fetch(url);
  const response = await rawResponse.json();
  state.messages.push(...response);
  renderMessage();
  setTimeout(keepFetchingMessages, 100);
};

// add msg + change color of msg
async function addMsg(e) {
    e.preventDefault();

    const inputEl = getEl("msg-input");
    const content = inputEl?.value.trim();
    if(!content) return;

    const payload = { sender: currentUser || 'Anonymous', content }
    
    try{
        const res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if(!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const serverMsg = await res.json();
        renderMessage(serverMsg);
        
        e.target.reset();
    } catch (error){
        console.error(`${error.message}`);
    }
}

async function sendReaction(id, type) {
    const res = await fetch(`${API}/${id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if(!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();

}

function updateCounts(id, likes, dislikes){
    const container = messagesEl.querySelector(
      `article.message[data-id="${id}"]`
    );
    if(!container) return;
    const likeSpan = container.querySelector(".like-count");
    const dislikeSpan = container.querySelector(".dislike-count");
    if(likeSpan) likeSpan.textContent = likes;
    if(dislikeSpan) dislikeSpan.textContent = dislikes;
}

window.onload = () => {
    getEl("join-screen")?.addEventListener("submit", handleJoinSubmit);   
    getEl("message-form")?.addEventListener("submit", addMsg);

    messagesEl?.addEventListener("click", async (e) => {
      const likeBtn = e.target.closest(".like-btn");
      const dislikeBtn = e.target.closest(".dislike-btn");
      const container = e.target.closest("article.message");
      const id = container?.dataset.id;
      if (!id) return;

      try{
       if (likeBtn) {
        const { likes, dislikes } = await sendReaction(id, "like")
        updateCounts(id, likes, dislikes)
        return;
        }
        if (dislikeBtn) {
        const { likes, dislikes } = await sendReaction(id, "dislike")
        updateCounts(id, likes, dislikes)
        return;
        }
    } catch (err){
       console.error(`Reaction failed: ${err.message}`); 
    }  
    });
}
