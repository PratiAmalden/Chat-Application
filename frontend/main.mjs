const API = "http://127.0.0.1:3000/messages";

function getEl(id){ return document.getElementById(id); }

const messagesEl = getEl("messages");
let currentUser = null;
let lastSeenTs = 0;
const renderedIds = new Set();

function handleJoinSubmit(e) {
  e.preventDefault();
  const username = getEl("username")?.value.trim();
  currentUser = username || "Anonymous";

  const join = getEl("join-screen");
  const chat = getEl("chat-screen");

  if (join && chat) {
    join.style.display = "none";
    chat.style.display = "grid";
  }
  keepFetchingMessages();
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
}

// see msgs
async function keepFetchingMessages() {
    try{
        const queryString = lastSeenTs ? `?since=${lastSeenTs}` : "";
        const res = await fetch(`${API}${queryString}`);
        if(!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();

        for(const msg of data){
            if(msg.id != null && renderedIds.has(String(msg.id))){
                updateCounts(msg.id, Number(msg.likes ?? 0), Number(msg.dislikes ?? 0));
            } else{
                renderMessage(msg);
            }
            if(typeof msg.timestamp === "number" && msg.timestamp > lastSeenTs){
                lastSeenTs = msg.timestamp;
            }
        }
    } catch (err) {
    console.error(`Fetch failed: ${err.message}`);
    } finally {
        setTimeout(keepFetchingMessages, 1000);
    }
}

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
