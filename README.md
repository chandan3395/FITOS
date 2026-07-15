# FITOS

A MERN SaaS platform for fitness trainers and their clients.

---

## Project Overview

FITOS connects fitness trainers with their clients on a single platform. It supports three roles — **Admin**, **Trainer**, and **Client** — each with their own workflows, dashboards, and data.

### Features (current)

- **Auth** — JWT access + refresh (HttpOnly cookie); trainers and clients sign in with Google OAuth 2.0 (feature-flag gated); admins use email + password.
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

- Node.js >= 20.19 (required by the backend dependency tree — mongoose 9, mongodb-memory-server 11)
- npm >= 10

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
{ "status": "ok", "db": "connected" }
```

Returns `200` when the MongoDB connection is live, `503` with
`{ "status": "degraded", "db": "disconnected" }` otherwise — so uptime
probes (and Render's health check) detect a dead DB connection.

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

---

## Production Deployment

Target platforms: **backend on Render**, **frontend on Vercel**. CI
(`.github/workflows/ci.yml`) lints, tests, and builds both on every push/PR.

### Backend — Render (Web Service)

- **Build command:** `npm install` &nbsp;·&nbsp; **Start command:** `npm start`
  &nbsp;·&nbsp; **Root directory:** `backend`
- **Health check path:** `/api/health` (200 only when the DB is connected)
- The app sets `trust proxy` for Render's proxy, so per-IP rate limiting and
  Secure cookies work out of the box.

Environment variables (see `backend/.env.example` for the full annotated list):

| Variable | Secret? | Notes |
| --- | --- | --- |
| `NODE_ENV` | no | set to `production` (JSON logs, Secure cookies) |
| `PORT` | no | Render injects one; the app reads it |
| `MONGO_URI` | **yes** | Atlas connection string |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | **yes** | long random strings, different from each other |
| `CLIENT_ORIGIN` | no | deployed frontend origin — see CORS note below |
| `MOBILE_CALLBACK` | no | optional; Flutter deep-link scheme |
| `ENABLE_GOOGLE_AUTH` | no | `true`/`false` feature flag |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | **yes** | required when Google auth is enabled |
| `GOOGLE_CALLBACK_URL` | no | `https://<backend-domain>/api/auth/google/callback` (must also be registered in the Google console) |
| `CLOUDINARY_CLOUD_NAME` | no | required |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | **yes** | required |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | **yes** | optional — invite sending is disabled when unset |
| `LOG_LEVEL` | no | optional pino level (default `info` in production) |
| `SENTRY_DSN` | **yes** | optional — enables Sentry error monitoring when set |

### Frontend — Vercel

- **Root directory:** `frontend` &nbsp;·&nbsp; **Build command:** `npm run build`
  &nbsp;·&nbsp; **Output directory:** `dist` (auto-detected for Vite)
- Environment variables (build-time, not secret — they are baked into the bundle):
  - `VITE_API_URL` — full backend API base **including `/api`**, e.g.
    `https://fitos-hrbl.onrender.com/api`
  - `VITE_ENABLE_GOOGLE_AUTH` — optional flag, defaults to enabled
- `frontend/vercel.json` ships the SPA rewrite plus security headers
  (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`).
  ⚠️ The CSP `connect-src` hardcodes the backend origin
  (`fitos-hrbl.onrender.com`) — if the backend moves, update `vercel.json`
  alongside `VITE_API_URL`, or API calls and the Socket.IO connection will be
  blocked by the browser.

### CORS + auth cookie requirement

`CLIENT_ORIGIN` on the backend **must exactly match the deployed frontend
origin** (scheme + host, e.g. `https://fitos.vercel.app`). It drives the CORS
allow-list and the OAuth redirect base. In production the refresh cookie is
issued with `SameSite=None; Secure`, which browsers only accept over
**HTTPS** — so both deployments must be HTTPS (Render and Vercel are by
default), and a mismatched `CLIENT_ORIGIN` breaks login/refresh with CORS
errors even when the API is otherwise reachable.
