# Chat Application (Polling vs WebSocket)

This project contains two implementations of a simple **single-room chat application**:
- One using **HTTP polling with Express**
- One using **WebSocket with the `websocket` npm library**

The goal of this project is to compare and understand different real-time communication methods in Node.js.

---

## Live Demo

Both implementations are deployed and publicly accessible:

### WebSocket version
- Frontend: https://pratiamaladen-frontend.hosting.codeyourfuture.io  
- Backend: https://pratiamalden-chatapp-websocket.hosting.codeyourfuture.io  

### Polling version
- Frontend: https://chatapp-frontend.hosting.codeyourfuture.io  
- Backend: https://chatapp-server.hosting.codeyourfuture.io/messages  

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

## Project Purpose

This project is primarily built for:
- Learning real-time communication concepts
- Understanding the difference between polling and WebSocket communication
- Practicing backend and frontend interaction

---

## Project Structure

```
Chat-Application/
├── polling/
│   ├── backend/
│   │   ├── index.mjs
│   │   └── utils.mjs
│   └── frontend/
│       ├── index.html
│       ├── css/
│       │   └── style.css
│       └── js/
│           ├── app.mjs
│           └── utils.mjs
│
├── websocket/
│   ├── backend/
│   │   ├── index.mjs
│   │   └── utils.mjs
│   └── frontend/
│       ├── index.html
│       ├── css/
│       │   └── style.css
│       └── js/
│           ├── app.mjs
│           └── utils.mjs
│
├── package.json
├── package-lock.json
└── README.md
```

## Installation

### Prerequisites
- Node.js (v16+ recommended)
- npm

### Setup
Clone the repository and install dependencies:

```bash
git clone https://github.com/PratiAmalden/Chat-Application.git
cd Chat-Application
npm install
````

Dependencies are shared across both implementations using the root `package.json`.

---

## Running the Polling Version

1. Start the server:

   ```bash
   node polling/backend/index.mjs
   ```

2. Open the frontend:

   * Open `polling/frontend/index.html` directly in your browser
     **or**
   * Serve it using a simple local server

3. The app will connect to the polling backend and simulate real-time updates by regularly requesting new messages.

---

## Running the WebSocket Version

1. Start the backend:

   ```bash
   node websocket/backend/index.mjs
   ```

2. Open the frontend:

   * Open `websocket/frontend/index.html` in your browser
     **or**
   * Serve it through a local server

3. This version uses persistent WebSocket connections for true real-time communication.

## Future Improvements

- Multiple chat rooms
- Proper user accounts (persistent identities stored server-side)
- Authentication and basic authorization
- Message history with database 
- UI improvements
- Typing indicators and read receipts

