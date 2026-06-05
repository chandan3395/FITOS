# FITOS

A MERN SaaS platform for fitness trainers and their clients.

---

## Project Overview

FITOS connects fitness trainers with their clients on a single platform. It supports three roles — **Admin**, **Trainer**, and **Client** — each with their own workflows, dashboards, and data.

---

## Architecture Overview

```
Client (React + Vite)  ──HTTP──▶  Express API  ──Mongoose──▶  MongoDB Atlas
                                        │
                                   Cloudinary (media)
                                   WhatsApp API (notifications)
                                   Google OAuth (auth)
```

The project is a **monorepo** with a clear frontend/backend split:

| Layer    | Stack                                    |
| -------- | ---------------------------------------- |
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Backend  | Node.js, Express 4, Mongoose             |
| Database | MongoDB Atlas                            |
| Auth     | Google OAuth 2.0 + JWT                   |
| Media    | Cloudinary                               |

---

## Folder Structure

```
fitos/
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── common/
│       │   ├── layouts/
│       │   └── ui/
│       ├── pages/
│       │   ├── admin/
│       │   ├── trainer/
│       │   ├── client/
│       │   └── auth/
│       ├── routes/
│       ├── hooks/
│       ├── services/
│       ├── contexts/
│       ├── utils/
│       ├── constants/
│       ├── styles/
│       ├── App.jsx
│       └── main.jsx
│
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── schemas/
│       ├── routes/
│       ├── services/
│       ├── jobs/
│       ├── utils/
│       ├── app.js
│       └── server.js
│
├── docs/
├── .gitignore
├── .env.example
└── README.md
```

---

## Local Development Setup

### Prerequisites

- Node.js >= 18
- npm >= 9

### 1. Clone the repo

```bash
git clone <repo-url>
cd fitos
```

### 2. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Frontend
cp frontend/.env.example frontend/.env.local
```

Fill in the values in each `.env` file before starting the servers.

### 3. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend (separate terminal)
cd frontend && npm install
```

### 4. Start the servers

```bash
# Backend  (http://localhost:5000)
cd backend && npm run dev

# Frontend (http://localhost:5173)
cd frontend && npm run dev
```

---

## Available Commands

### Frontend

| Command         | Description                     |
| --------------- | ------------------------------- |
| `npm run dev`   | Start Vite dev server           |
| `npm run build` | Production build to `dist/`     |
| `npm run lint`  | Run ESLint across `src/`        |

### Backend

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start server with nodemon (hot reload) |
| `npm run start` | Start server without hot reload      |
| `npm run build` | No-op (plain Node.js, no transpile)  |

---

## Health Check

```http
GET http://localhost:5000/health
```

```json
{
  "success": true,
  "message": "FITOS backend running"
}
```
