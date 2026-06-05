# FITOS — Project Context

> Snapshot of the FITOS codebase as of the current state. This is the
> single source of truth for "where things are" and "what's wired up."
> Update it as the prototype evolves.

---

## 1. Product summary

FITOS is a fitness-coaching platform with three roles:

| Role        | Signup path                | What they do                                          |
|-------------|----------------------------|-------------------------------------------------------|
| **ADMIN**   | Bootstrapped manually      | Platform operator. Manages trainers. No client PII.   |
| **TRAINER** | Google OAuth (primary)     | Onboards clients, reviews check-ins, uploads photos.  |
| **CLIENT**  | Invite link from trainer   | Submits check-ins, sees own progress.                 |

There is **no in-app messaging**. Trainers share the activation link with
clients via their own channel (email, WhatsApp, etc.).

---

## 2. Repository layout

```
FITOS/
├── README.md
├── context.md              ← this file
├── docs/
├── backend/
│   ├── package.json
│   ├── .env                ← gitignored
│   ├── .env.example
│   ├── .gitignore
│   ├── uploads/            ← Multer destination (gitignored)
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── config/
│       │   ├── env.js
│       │   ├── cors.js
│       │   ├── database.js
│       │   ├── logger.js
│       │   └── passport.js
│       ├── middleware/
│       │   ├── auth.js
│       │   ├── roles.js
│       │   ├── errorHandler.js
│       │   ├── notFound.js
│       │   ├── requestLogger.js
│       │   └── upload.js
│       ├── schemas/
│       │   ├── User.schema.js
│       │   ├── Client.schema.js
│       │   ├── ClientInvite.schema.js
│       │   ├── CheckIn.schema.js
│       │   └── ProgressPhoto.schema.js
│       ├── services/
│       │   ├── auth.service.js          (placeholder)
│       │   ├── client.service.js
│       │   ├── checkin.service.js
│       │   ├── progressPhoto.service.js
│       │   ├── template.service.js      (placeholder)
│       │   └── notification.service.js  (placeholder)
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── client.controller.js
│       │   ├── checkin.controller.js
│       │   ├── progressPhoto.controller.js
│       │   ├── trainer.controller.js
│       │   └── health.controller.js
│       ├── routes/
│       │   ├── index.js
│       │   ├── auth.routes.js
│       │   ├── client.routes.js
│       │   ├── checkin.routes.js
│       │   ├── progressPhoto.routes.js
│       │   ├── trainer.routes.js
│       │   └── health.routes.js
│       ├── jobs/             (placeholders: reminder.job.js, cleanup.job.js)
│       └── utils/
│           ├── ApiError.js
│           ├── ApiResponse.js
│           ├── generateToken.js          (legacy, unused)
│           ├── generateAccessToken.js
│           └── generateRefreshToken.js
└── frontend/
    ├── package.json
    ├── vite.config.js       ← /api proxy → localhost:5000
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── routes/AppRoutes.jsx
        ├── constants/{routes,roles,index}.js
        ├── contexts/{AuthContext,ThemeContext,index}.jsx
        ├── hooks/{useAuth,useTheme,index}.js
        ├── lib/api.js                    ← axios + auto-refresh interceptor
        ├── styles/{globals.css, index.css, theme.js}
        ├── components/
        │   ├── ui/                       (Card, Button, Input, Loader, Modal)
        │   ├── design-system/            (MetricCard, ClientCard, AlertCard,
        │   │                              ProgressCard, UploadCard, Icons, …)
        │   ├── feedback/States.jsx       (Skeleton, EmptyState, ErrorState, Toast)
        │   └── layouts/{Auth,Admin,Trainer,Client}Layout.jsx
        ├── services/
        │   ├── api.js                    (legacy placeholder)
        │   ├── authService.js
        │   ├── clientService.js
        │   ├── checkinService.js
        │   ├── progressPhotoService.js
        │   ├── trainerService.js
        │   └── index.js
        └── pages/
            ├── DesignSystemPage.jsx
            ├── NotFound.jsx
            ├── auth/
            │   ├── LoginPage.jsx              ← unified login at "/"
            │   ├── GoogleCallbackPage.jsx
            │   └── ActivatePage.jsx
            ├── admin/
            │   ├── AdminDashboard.jsx
            │   ├── AdminTrainersPage.jsx
            │   └── AdminStubPage.jsx
            ├── trainer/
            │   ├── TrainerDashboard.jsx
            │   ├── TrainerClientsPage.jsx
            │   ├── TrainerAddClientPage.jsx
            │   ├── TrainerClientDetailPage.jsx
            │   ├── TrainerCheckinsPage.jsx
            │   └── TrainerStubPage.jsx
            └── client/
                ├── ClientDashboard.jsx
                ├── ClientNutritionPage.jsx
                ├── ClientProgressPage.jsx
                ├── ClientWorkoutPage.jsx
                └── ClientStubPage.jsx
```

---

## 3. Tech stack

**Backend** — Node 18+, Express 4, MongoDB Atlas via Mongoose, JWT + refresh
token (HttpOnly cookie), Passport (Google OAuth20), bcryptjs, Multer (disk
storage), helmet, cors, morgan, cookie-parser.

**Frontend** — React 18, Vite 5, React Router 6, Tailwind 3, axios.
Pure-black premium theme (`#000` / `#0a0a0a` / indigo `#6366f1` accent).
No CSS-in-JS, no UI library — only the in-house design system.

---

## 4. Environment

`backend/.env` (gitignored — see `backend/.env.example`):

```
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://...
JWT_SECRET=<long random>
JWT_REFRESH_SECRET=<different long random>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

`CLIENT_ORIGIN` must match the frontend dev origin. Google OAuth redirects
the user back to `${CLIENT_ORIGIN}/auth/google/callback#token=…&role=…`.

---

## 5. Authentication model

| Token         | Lifetime | Storage                                  |
|---------------|----------|------------------------------------------|
| Access token  | 10 min   | JS memory (mirrored to localStorage)     |
| Refresh token | 7 days   | HttpOnly cookie set by backend           |

Flow:
- `lib/api.js` attaches `Authorization: Bearer <access>` on every request.
- On any 401, a single shared `refresh` promise is fired against
  `/api/auth/refresh`; the original request is replayed once with the new
  access token. Concurrent 401s coalesce so we never run two refreshes.
- If refresh fails, `setUnauthorizedHandler` clears `AuthContext` state and
  the user is bounced to `/login` by `RequireAuth`.
- On tab reload, `AuthContext` boot path: if no access token in memory it
  tries a silent `/refresh` (the cookie may still be valid), then calls
  `/me` and hydrates the user.
- Role guard `RequireAuth roles={[…]}` wraps the three role layouts.

---

## 6. Database schemas

### User
`name, email (unique, lowercase), password (select:false), role (ADMIN|TRAINER|CLIENT),
googleId (sparse), profileImage, isActive, refreshToken (select:false), timestamps`

### Client
`trainerId (ref User, required), name, phone, gender, age, city, height,
startingWeight, targetWeight, goal, status (ACTIVE|ARCHIVED), email (sparse,
optional), userId (ref User, set after activation), timestamps`

Indexes: `{trainerId}`, `{trainerId, status}`.

### ClientInvite
`trainerId, clientName, phone, email, inviteToken (unique), expiresAt, isUsed,
timestamps`

Indexes: `{trainerId, isUsed}`, `{inviteToken, expiresAt}`.

### CheckIn
`clientId (ref Client), trainerId (ref User), weight, sleep, water,
energy (1–5), mood (1–5), notes, status (PENDING|REVIEWED|FLAGGED),
trainerComment, reviewedAt, timestamps`

Indexes: `{trainerId, status, createdAt:-1}`, `{clientId, createdAt:-1}`.

### ProgressPhoto
`clientId, trainerId, weekNumber, frontPhoto (URL), sidePhoto, backPhoto,
comment, status, timestamps`

Indexes: `{clientId, weekNumber:-1}`, `{trainerId, status, createdAt:-1}`.

---

## 7. API surface

### Auth
| Method | Path                                  | Auth         | Notes                            |
|--------|---------------------------------------|--------------|----------------------------------|
| POST   | `/api/auth/admin/login`               | public       | Email + password                 |
| POST   | `/api/auth/admin/create`              | ADMIN        | Bootstrap subsequent admins      |
| POST   | `/api/auth/trainer/signup`            | public       | Email + password (alt to Google) |
| POST   | `/api/auth/trainer/login`             | public       | Email + password                 |
| GET    | `/api/auth/google?role=TRAINER\|CLIENT` | public     | Initiates OAuth                  |
| GET    | `/api/auth/google/callback`           | passport     | Redirects to frontend with token |
| POST   | `/api/auth/refresh`                   | cookie       | Returns new access token         |
| POST   | `/api/auth/logout`                    | cookie       | Clears refresh + cookie          |
| GET    | `/api/auth/me`                        | bearer       | Safe user object                 |
| GET    | `/api/auth/invite/:token`             | public       | Returns invite metadata          |
| POST   | `/api/auth/invite/:token/activate`    | public       | Creates CLIENT user, returns JWT |

### Clients
| Method | Path                       | Auth                 | Notes                                              |
|--------|----------------------------|----------------------|----------------------------------------------------|
| POST   | `/api/clients`             | TRAINER \| ADMIN     | Creates client + auto-generates 72h activation URL |
| GET    | `/api/clients`             | TRAINER              | Own clients only (admin forbidden — privacy rule)  |
| GET    | `/api/clients/:id`         | TRAINER              | Ownership enforced                                 |
| PATCH  | `/api/clients/:id`         | TRAINER \| ADMIN     | Edit fields, archive via `status: "ARCHIVED"`      |

### Trainer
| Method | Path                  | Auth     | Returns                                        |
|--------|-----------------------|----------|------------------------------------------------|
| GET    | `/api/trainer/metrics`| TRAINER  | `{activeClients, totalClients, archivedClients, pendingCheckins, photosPendingReview, attentionRequired}` |

### Check-ins
| Method | Path                       | Auth              | Notes                            |
|--------|----------------------------|-------------------|----------------------------------|
| POST   | `/api/checkins`            | TRAINER \| ADMIN  | Prototype: trainer-on-behalf     |
| GET    | `/api/checkins`            | TRAINER \| ADMIN  | `?status=&clientId=&limit=`      |
| GET    | `/api/checkins/:id`        | TRAINER \| ADMIN  | Ownership enforced               |
| PATCH  | `/api/checkins/:id/review` | TRAINER           | Body `{status, trainerComment}`  |

### Progress photos
| Method | Path                                  | Auth              | Notes                                  |
|--------|---------------------------------------|-------------------|----------------------------------------|
| POST   | `/api/progress-photos`                | TRAINER \| ADMIN  | Multipart: `front`, `side`, `back`     |
| GET    | `/api/progress-photos/client/:id`     | TRAINER \| ADMIN  | Sorted by week desc                    |
| PATCH  | `/api/progress-photos/:id/comment`    | TRAINER \| ADMIN  | Body `{comment}` — flips to REVIEWED   |

### Health
| Method | Path           | Auth   | Notes        |
|--------|----------------|--------|--------------|
| GET    | `/api/health`  | public | Liveness     |

### Static
`GET /uploads/<filename>` — serves photo files from `backend/uploads/`.

---

## 8. Frontend routes

| Path                          | Page                          | Guard            |
|-------------------------------|-------------------------------|------------------|
| `/`                           | LoginPage                     | public           |
| `/login`                      | LoginPage                     | public           |
| `/auth/google/callback`       | GoogleCallbackPage            | public           |
| `/activate/:token`            | ActivatePage                  | public           |
| `/design-system`              | DesignSystemPage              | public           |
| `/admin`                      | redirect → `/admin/dashboard` | ADMIN            |
| `/admin/dashboard`            | AdminDashboard                | ADMIN            |
| `/admin/trainers`             | AdminTrainersPage             | ADMIN            |
| `/trainer`                    | redirect → `.../dashboard`    | TRAINER, ADMIN   |
| `/trainer/dashboard`          | TrainerDashboard              | TRAINER, ADMIN   |
| `/trainer/clients`            | TrainerClientsPage            | TRAINER, ADMIN   |
| `/trainer/clients/new`        | TrainerAddClientPage          | TRAINER, ADMIN   |
| `/trainer/client/:id`         | TrainerClientDetailPage       | TRAINER, ADMIN   |
| `/trainer/check-ins`          | TrainerCheckinsPage           | TRAINER, ADMIN   |
| `/trainer/schedule`           | TrainerStubPage               | TRAINER, ADMIN   |
| `/client`                     | redirect → `.../dashboard`    | CLIENT           |
| `/client/dashboard`           | ClientDashboard               | CLIENT           |
| `/client/nutrition`           | ClientNutritionPage           | CLIENT           |
| `/client/progress`            | ClientProgressPage            | CLIENT           |
| `/client/workout`             | ClientWorkoutPage             | CLIENT           |
| `/not-found` / `*`            | NotFound                      | public           |

---

## 9. Security & privacy rules

1. **Trainer ownership** — every client query is filtered by
   `{trainerId: req.user._id}` in the service layer. Document fetches do
   a redundant `String(doc.trainerId) === String(req.user._id)` check
   before returning. 403 on mismatch.
2. **Admin privacy** — admin is **not** in `allowRoles` for
   `GET /api/clients`, `GET /api/clients/:id`, or `/api/trainer/metrics`.
   Admin sees trainer-level analytics only.
3. **Hidden fields** — `User.refreshToken` and `User.password` are
   `select: false`. `getCurrentUser` returns a hand-picked safe object.
4. **JWT middleware** — `middleware/auth.js` validates `Authorization:
   Bearer <access>` and attaches the User doc. Failures → 401.
5. **Role middleware** — `allowRoles("ADMIN", …)` returns 403 if the
   authenticated user's role is not in the list.
6. **CSRF / cookies** — refresh cookie is `httpOnly + sameSite:"strict"`,
   `secure` in production.
7. **Upload limits** — Multer caps 5 MB per file, image MIME types only.

---

## 10. UX guarantees (Phase 10)

Every data-fetching page now uses the shared primitives in
`components/feedback/States.jsx`:

- `Skeleton`, `SkeletonGrid`, `SkeletonDetail` — loading
- `EmptyState` — nothing to show, with optional CTA
- `ErrorState` — failure with retry button
- `Toast` — success / error feedback

Form pages (Add Client wizard, Check-in form, Photo upload, Login,
Activation) all have:
- Client-side validation matching backend requirements
- Inline error display
- Loading button state
- Toast on success
- Redirect / navigation on completion

---

## 11. Working trainer flow (end-to-end)

```
1. Trainer opens /
   → LoginPage
2. Clicks "Continue with Google"
   → /api/auth/google?role=TRAINER → Google → /api/auth/google/callback
   → 302 to /auth/google/callback#token=…&role=TRAINER
   → GoogleCallbackPage stores token, calls /me, navigates to /trainer/dashboard
3. Dashboard loads real metrics + check-in feed + attention list
4. Trainer clicks +Add Client → fills 5-step wizard
   → POST /api/clients → returns { client, invite: { activationUrl, expiresAt } }
   → Wizard shows the URL with a Copy button
5. Trainer shares the URL with the client
6. Client opens /activate/:token
   → GET /api/auth/invite/:token → renders "Welcome, <name>"
   → POST /api/auth/invite/:token/activate
   → Backend creates CLIENT User, links Client.userId, returns JWT pair
   → ActivatePage stores token, navigates to /client/dashboard
7. Trainer (back on /trainer/client/:id):
   - Overview tab: real client + last check-in
   - Check-ins tab: inline form to log a check-in + reverse-chrono list
   - Photos tab: upload front/side/back + comment editor
   - Approve / Flag from /trainer/check-ins
8. Logout via sidebar → clears cookie, drops local token, → /login
```

---

## 12. What's **NOT** built

These were intentionally skipped (out of scope or queued):

- **In-app messaging** — removed (trainers contact clients out-of-band)
- **Workout plan API + tab** — empty state placeholder
- **Nutrition plan API + tab** — empty state placeholder
- **Trainer-private notes API + tab** — empty state placeholder
- **Client portal data wiring** — nutrition/progress/workout pages still
  use mock content; chat page removed; dashboard is partly real
- **Trainer Schedule** — stub page
- **Admin Trainers table backend** — UI uses mock; no `/api/admin/trainers` yet
- **Email delivery of invite links** — backend generates the URL; sending
  is out-of-band
- **Cloud storage** — uploads stay on local disk per prototype scope
- **Payments / subscriptions / analytics / notifications / mobile app**

---

## 13. How to run

```bash
# Backend
cd backend
npm install
# create .env from .env.example
npm start         # production
npm run dev       # nodemon

# Frontend
cd frontend
npm install
npm run dev       # vite — http://localhost:5173
npm run build     # production bundle
npm run lint
```

Backend defaults to port `5000`. Frontend dev server proxies
`/api/*` → `http://localhost:5000`.

`backend/uploads/` is created on first request; serve at `/uploads/<filename>`.

---

## 14. Conventions

- **HTTP responses** — `{ success, message, data }` always (see
  `utils/ApiResponse.js`). Errors throw `ApiError(statusCode, message)`.
- **Controller pattern** — controllers are thin; all business logic +
  ownership checks live in `services/`.
- **Frontend services** — every API call goes through `lib/api.js`. No
  raw `fetch` calls. Every service returns the inner `data.*` shape, not
  the axios response.
- **Components** — only the in-house design system. New page-local
  helpers (Field, Chip, Stepper) are colocated, not exported.
- **No new theme tokens** — colors and spacing come from Tailwind config
  + `globals.css`. Semantic colors: `emerald` (success), `amber`
  (warning), `red` (error), `primary` (#6366f1).

---

## 15. Open questions / risks

- **Google OAuth credentials must be configured** in Google Cloud Console
  with the redirect URI matching `GOOGLE_CALLBACK_URL`. Without that,
  step 2 of the trainer flow won't complete.
- **Activation token** is currently single-use *by design* (`isUsed=true`
  after activation) but the endpoint still re-issues tokens on repeat
  hits until `expiresAt`. Decide whether to harden this for production.
- **Trainer creates check-ins on behalf of clients** — prototype
  shortcut. Production should expose a `POST /api/checkins` path that
  resolves the client via the authenticated CLIENT user.
- **`MONGO_URI` in `.env.example`** still has the dev cluster hostname
  hardcoded. Rotate before public release.
- **Admin dashboard** still uses mock trainer data; wire to a real
  `/api/admin/trainers` endpoint before declaring admin "done."
