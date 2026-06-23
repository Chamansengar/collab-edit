# CollabEdit — Real-Time Collaborative Document Editor

A full-stack collaborative editing platform built with the **MERN stack** and **Socket.IO**, featuring **CRDT-based conflict resolution** via Yjs, real-time multi-user editing, version history with rollback, and rich Markdown support.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Tech Stack](https://img.shields.io/badge/Node.js-Express-green) ![Tech Stack](https://img.shields.io/badge/MongoDB-Mongoose-darkgreen) ![Tech Stack](https://img.shields.io/badge/Socket.IO-4.x-black) ![Tech Stack](https://img.shields.io/badge/Yjs-CRDT-purple)

## ✨ Features

- **Real-Time Collaboration** — Multiple users can edit the same document simultaneously with zero-lag CRDT sync
- **CRDT Conflict Resolution** — Powered by Yjs, ensuring automatic convergence without data loss
- **Remote Cursors** — See other collaborators' cursor positions and selections in real-time
- **Markdown Support** — Full GitHub-Flavored Markdown with live preview (split-pane or toggle view)
- **User Authentication** — JWT-based auth with access + refresh tokens
- **Access Control** — Role-based permissions: Owner, Admin, Editor, Viewer
- **Document Sharing** — Invite collaborators by email with specific roles
- **Version History** — Create snapshots, view diffs, and rollback to any previous version
- **Premium Dark UI** — Glassmorphism design with gradients, micro-animations, and Inter font

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, CodeMirror 6, Yjs |
| **Backend** | Node.js, Express.js, Socket.IO |
| **Database** | MongoDB (Mongoose ODM) |
| **Real-time** | Socket.IO + Yjs WebSocket Provider |
| **Auth** | JWT (access + refresh tokens), bcrypt |
| **Editor** | CodeMirror 6 with y-codemirror.next |
| **Markdown** | react-markdown, remark-gfm, rehype-highlight |

## 📋 Prerequisites

- **Node.js** v18 or higher
- **MongoDB** running locally or a MongoDB Atlas connection string
- **npm** v9+

## 🚀 Getting Started

### 1. Clone & Install

```bash
cd "Real time collaborative document editor"

# Install all dependencies
cd server && npm install
cd ../client && npm install
cd ..
```

### 2. Configure Environment

Copy the `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/collab-editor
JWT_SECRET=your-secure-random-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret
PORT=5000
CLIENT_URL=http://localhost:5173
```

### 3. Start Development Servers

```bash
# Terminal 1: Start the backend
cd server
npm run dev

# Terminal 2: Start the frontend
cd client
npm run dev
```

Or use the root command (requires `concurrently`):
```bash
npm run dev
```

### 4. Open the App

Navigate to **http://localhost:5173** in your browser.

## 📁 Project Structure

```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── Auth/       # Login, Register, ProtectedRoute
│   │   │   ├── Dashboard/  # Document list, cards, create modal
│   │   │   ├── Editor/     # Collaborative editor, preview, toolbar
│   │   │   ├── Sharing/    # Share modal
│   │   │   └── VersionHistory/ # Version panel, diff view
│   │   ├── context/        # React contexts (Auth)
│   │   ├── hooks/          # Custom hooks (useCollaboration)
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   └── styles/         # CSS design system
│   └── ...
│
├── server/                 # Node.js backend
│   ├── config/             # MongoDB connection
│   ├── controllers/        # Route handlers
│   ├── middleware/          # Auth & access control
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routes
│   ├── services/           # Yjs persistence
│   ├── socket/             # Socket.IO & presence
│   └── server.js           # Entry point
│
└── .env                    # Environment variables
```

## 🔐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents` | Create document |
| GET | `/api/documents` | List user's documents |
| GET | `/api/documents/:id` | Get document |
| PUT | `/api/documents/:id` | Update title/settings |
| DELETE | `/api/documents/:id` | Delete document |
| POST | `/api/documents/:id/share` | Share with user |

### Versions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/:id/versions` | Create snapshot |
| GET | `/api/documents/:id/versions` | List versions |
| GET | `/api/documents/:id/versions/:vid` | Get version |
| POST | `/api/documents/:id/versions/:vid/rollback` | Restore version |

## 🤝 How Collaboration Works

1. **Yjs CRDT**: Each document is backed by a `Y.Doc` containing a `Y.Text` type
2. **WebSocket Sync**: The `y-websocket` provider syncs CRDT updates between clients via the server
3. **Awareness Protocol**: Cursor positions and user metadata are shared through Yjs awareness
4. **Server Persistence**: Document state is debounce-saved to MongoDB every 2 seconds
5. **Conflict Resolution**: CRDT ensures all clients converge to the same state automatically — no merge conflicts ever

## 📄 License

MIT
