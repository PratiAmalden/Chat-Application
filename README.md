# Chat Application Comparison (Polling vs WebSocket)

This project contains two implementations of a simple **single-room chat application**:
- One using **HTTP polling with Express**
- One using **WebSocket with the `websocket` npm library**
Both use the same server, in-memory message store, API, and frontend.

The goal of this project is to compare and understand different real-time communication methods in Node.js.

## Live Demo

https://pratiamalden-chatapp.grads.hosting.cyf.academy

---

## Features

- Single shared chat room
- Multiple users can join and exchange messages
- Real-time message updates
- Message reactions (like / dislike)
- Basic message history
- Simple browser-based UI

---

## Tech Stack

- Node.js
- Express (polling version)
- WebSocket using the `websocket` npm package
- HTML, CSS, JavaScript (frontend)
- No database (messages stored in memory)

---

## Run locally

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm start
```

Open [http://localhost:3000](http://localhost:3000). Messages and reactions are held in memory, so they are cleared when the server restarts.

---

### Running with Docker

```bash
docker build -t chat-application .
docker run --rm -p 3000:3000 chat-application
```

Open [http://localhost:3000](http://localhost:3000).

---
## Project layout

```text
backend/
  index.mjs       Express API, long-poll endpoint, WebSocket server, static hosting
  utils.mjs       Shared in-memory message store and long-poll change notifications
frontend/
  index.html      Transport picker and shared chat UI
  js/app.mjs      Long-poll and WebSocket client adapters
  js/utils.mjs    Shared UI state, rendering, and events
  css/style.css   Shared styles
Dockerfile        Single-image deployment
```
---

## How the transports work

- **Long polling:** the browser makes an HTTP request that stays open until a chat/reaction update or a 25-second timeout, then immediately opens the next request.
- **WebSocket:** the browser upgrades one connection at `/ws/`; the server pushes chats and reactions over that persistent connection.
- Both transports share the same in-memory state, so users in either mode see the same room and reactions.

