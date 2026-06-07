# FITOS

A MERN SaaS platform for fitness trainers and their clients.

---

## Project Overview

FITOS connects fitness trainers with their clients on a single platform. It supports three roles — **Admin**, **Trainer**, and **Client** — each with their own workflows, dashboards, and data.

### Features (current)

- **Auth** — JWT access + refresh (HttpOnly cookie); Google OAuth 2.0 (feature-flag gated); admin/trainer email-password login.
- **Admin** — manage trainers and admins (create / enable / disable); platform metrics (no client PII).
- **Trainer** — client onboarding wizard (35+ fields), check-in review, workout & nutrition plans, reusable workout/nutrition templates, activity feed.
- **Progress photos** — stored on **Cloudinary** via signed direct browser uploads (backend never handles bytes); before/after **Compare Mode**.
- **WhatsApp** — send client activation invites via the Meta WhatsApp Cloud API (send-only foundation).
- **Client** — activate account, view assigned workout/nutrition plans, submit progress, upload photos.

> For a deep, current map of schemas, routes, and flows, see [`context.md`](./context.md).

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
| Auth     | Google OAuth 2.0 + JWT (refresh cookie)  |
| Media    | Cloudinary (signed direct uploads)       |
| Messaging| Meta WhatsApp Cloud API (invite delivery)|
| Testing  | Jest (backend unit tests)                |

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
│   ├── scripts/            # one-shot maintenance (Cloudinary migration, dedupe)
│   ├── __tests__/          # Jest unit tests (no DB)
│   └── src/
│       ├── config/         # env, cloudinary, cors, database, logger, passport
│       ├── controllers/
│       ├── middleware/
│       ├── schemas/        # Mongoose models
│       ├── routes/
│       ├── services/       # business logic + ownership checks
│       ├── validators/     # pure input validators
│       ├── utils/
│       ├── app.js
│       └── server.js
│
├── docs/
├── context.md             # detailed architecture snapshot
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
| `npm test`      | Run Jest unit tests                  |
| `npm run build` | No-op (plain Node.js, no transpile)  |

---

## Health Check

```http
GET http://localhost:5000/api/health
```

```json
{
  "success": true,
  "message": "FITOS backend running"
}
```

---

## Environment Variables

All secrets live in `backend/.env` (never exposed to the frontend bundle):

- **Required**: `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
  `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- **Google OAuth** (required when `ENABLE_GOOGLE_AUTH != "false"`):
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`.
- **WhatsApp (optional)**: `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`.

Frontend (`frontend/.env.local`) exposes only `VITE_`-prefixed flags:
`VITE_ENABLE_GOOGLE_AUTH`.
