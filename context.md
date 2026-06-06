# FITOS — Project Context

> Snapshot of the FITOS codebase as of the current state. Single source
> of truth for "where things are" and "what's wired up." Update as the
> prototype evolves.

---

## 1. Product summary

FITOS is a fitness-coaching platform with three roles:

| Role        | Signup path                              | What they do                                          |
|-------------|------------------------------------------|-------------------------------------------------------|
| **ADMIN**   | Bootstrapped manually + admin-created    | Platform operator. Manages trainers. No client PII.   |
| **TRAINER** | Created by admin · Google OAuth (gated)  | Onboards clients, reviews check-ins, uploads photos.  |
| **CLIENT**  | Invite link from trainer                 | Submits check-ins, sees own progress.                 |

No in-app messaging. Trainers share activation links with clients
out-of-band (WhatsApp, email, etc.) — the wizard outputs a
WhatsApp-formatted message ready to paste.

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
│   ├── __tests__/          ← Jest unit tests (no DB)
│   │   ├── contract/clientFields.contract.test.js
│   │   ├── utils/ApiError.test.js
│   │   └── validators/
│   │       ├── activationPayload.test.js
│   │       ├── clientPayload.test.js
│   │       └── clientPayload.expanded.test.js
│   └── src/
│       ├── server.js
│       ├── app.js          ← passport gated by ENABLE_GOOGLE_AUTH
│       ├── config/
│       │   ├── env.js      ← exports ENABLE_GOOGLE_AUTH flag
│       │   ├── cors.js
│       │   ├── database.js
│       │   ├── logger.js
│       │   └── passport.js
│       ├── middleware/
│       │   ├── auth.js     ← validates JWT + isActive
│       │   ├── roles.js    ← allowRoles helper
│       │   ├── errorHandler.js
│       │   ├── notFound.js
│       │   ├── requestLogger.js
│       │   └── upload.js   ← Multer disk storage
│       ├── schemas/
│       │   ├── User.schema.js
│       │   ├── Client.schema.js        ← 35+ persisted onboarding fields
│       │   ├── ClientInvite.schema.js
│       │   ├── CheckIn.schema.js
│       │   └── ProgressPhoto.schema.js
│       ├── validators/
│       │   ├── clientPayload.validator.js
│       │   └── activationPayload.validator.js
│       ├── services/
│       │   ├── client.service.js
│       │   ├── admin.service.js        ← trainer CRUD + platform metrics
│       │   ├── checkin.service.js
│       │   ├── progressPhoto.service.js
│       │   └── (notification/template/auth placeholders REMOVED)
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── client.controller.js
│       │   ├── admin.controller.js     ← new
│       │   ├── checkin.controller.js
│       │   ├── progressPhoto.controller.js
│       │   ├── trainer.controller.js
│       │   └── health.controller.js
│       ├── routes/
│       │   ├── index.js
│       │   ├── auth.routes.js          ← OAuth routes gated by feature flag
│       │   ├── client.routes.js
│       │   ├── admin.routes.js         ← new
│       │   ├── checkin.routes.js
│       │   ├── progressPhoto.routes.js
│       │   ├── trainer.routes.js
│       │   └── health.routes.js
│       └── utils/
│           ├── ApiError.js              ← validation() static helper
│           ├── ApiResponse.js
│           ├── generateAccessToken.js
│           └── generateRefreshToken.js
│           (jobs/, auth.service.js, template.service.js,
│            notification.service.js, generateToken.js — all REMOVED)
└── frontend/
    ├── package.json
    ├── vite.config.js       ← /api proxy → localhost:5000
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .env.development     ← VITE_DEV_AUTH_BYPASS=true (dev-only)
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx                       ← mounts DevRoleSwitcher when bypass on
        ├── routes/AppRoutes.jsx
        ├── constants/{routes,roles,index}.js
        ├── contexts/{AuthContext,ThemeContext,index}.jsx
        ├── hooks/{useAuth,useTheme,index}.js
        ├── lib/
        │   ├── api.js          ← axios + auto-refresh interceptor
        │   └── devAuth.js      ← DEV_BYPASS + mock users + role storage
        ├── styles/{globals.css, index.css, theme.js}
        ├── components/
        │   ├── ui/             (Card, Button, Input, Loader, Modal)
        │   ├── design-system/  (MetricCard, ClientCard, AlertCard,
        │   │                    ProgressCard, UploadCard, Icons, …)
        │   ├── feedback/States.jsx     (Skeleton, EmptyState, ErrorState, Toast)
        │   ├── dev/DevRoleSwitcher.jsx ← dev-only widget
        │   └── layouts/{Auth,Admin,Trainer,Client}Layout.jsx
        ├── services/
        │   ├── authService.js
        │   ├── clientService.js
        │   ├── adminService.js          ← new
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
            │   ├── AdminDashboard.jsx        ← wired to real APIs
            │   └── AdminTrainersPage.jsx     ← wired + Create Trainer modal
            ├── trainer/
            │   ├── TrainerDashboard.jsx      ← real metrics + activity
            │   ├── TrainerClientsPage.jsx
            │   ├── TrainerAddClientPage.jsx  ← per-step validation
            │   ├── TrainerClientDetailPage.jsx  ← 6 tabs, real data
            │   ├── TrainerCheckinsPage.jsx
            │   └── TrainerStubPage.jsx       (used only by Schedule)
            └── client/
                ├── ClientDashboard.jsx      ← real user, empty states
                ├── ClientNutritionPage.jsx  ← empty state
                ├── ClientProgressPage.jsx   ← empty state
                └── ClientWorkoutPage.jsx    ← empty state
                (Stub pages REMOVED)
```

---

## 3. Tech stack

**Backend** — Node 18+, Express 4, MongoDB Atlas via Mongoose, JWT +
refresh token (HttpOnly cookie), Passport Google OAuth20 (feature-flag
gated), bcryptjs, Multer (disk storage), helmet, cors, morgan,
cookie-parser, Jest (testing).

**Frontend** — React 18, Vite 5, React Router 6, Tailwind 3, axios.
Pure-black premium theme (`#000` / `#0a0a0a` / indigo `#6366f1`
accent). In-house design system; no UI library.

---

## 4. Environment variables

### Backend `.env`

```
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://...
JWT_SECRET=<long random>
JWT_REFRESH_SECRET=<different long random>

# Google OAuth — only required when ENABLE_GOOGLE_AUTH != "false"
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Feature flag — set to "false" to disable Google OAuth entirely.
# Default: enabled. Routes return 503 when disabled, passport not loaded.
ENABLE_GOOGLE_AUTH=true
```

### Frontend `.env.local` (or `.env.development`)

```
# Dev-only auth bypass (default true in dev, never honored in prod build)
VITE_DEV_AUTH_BYPASS=true

# Mirror of backend ENABLE_GOOGLE_AUTH — hides Google CTA on login page
VITE_ENABLE_GOOGLE_AUTH=true
```

---

## 5. Authentication model

| Token         | Lifetime | Storage                                  |
|---------------|----------|------------------------------------------|
| Access token  | 10 min   | JS memory (mirrored to localStorage)     |
| Refresh token | 7 days   | HttpOnly cookie set by backend           |

Flow:
- `lib/api.js` attaches `Authorization: Bearer <access>` on every request.
- On any 401, a single shared `refresh` promise hits `/api/auth/refresh`;
  the original request is replayed once with the new access token.
  Concurrent 401s coalesce.
- If refresh fails, `setUnauthorizedHandler` clears `AuthContext` and
  `RequireAuth` bounces to `/login`.
- On tab reload: if no access token in memory, silent `/refresh` (cookie
  may still be valid), then `/me` to hydrate user.
- Role guard `RequireAuth roles={[…]}` wraps each role layout.
- **Disabled trainers**: blocked at `authenticate` middleware (`!isActive`),
  at `adminLogin`, and at `trainerLogin`. Disable also invalidates the
  refresh token, so existing sessions die on next refresh.

### Dev auth bypass (frontend-only convenience)
- Hard-gated on `import.meta.env.DEV && VITE_DEV_AUTH_BYPASS === "true"`.
- In prod builds, the flag is a compile-time `false` → Vite tree-shakes
  every bypass branch out of the bundle.
- When active: injects a mock user from `lib/devAuth.MOCK_USERS`. Switch
  roles via the floating `DevRoleSwitcher` widget (bottom-right).
- Production auth code (AuthContext bootstrap, refresh interceptor,
  OAuth callback, role guards) is never modified — bypass simply
  short-circuits *into* it at boot.

### Google OAuth feature flag
- Backend `ENABLE_GOOGLE_AUTH=false`:
  - `passport` is never required or initialised
  - `/api/auth/google*` routes return 503 with a clear message
  - `GOOGLE_*` env vars are no longer required at startup
- Frontend `VITE_ENABLE_GOOGLE_AUTH=false`:
  - Hides the "Continue with Google" CTA on `/login`
  - Shows an amber notice and renders the email/password form directly
- Implementation is preserved verbatim — flip both flags to `true` to
  restore the full OAuth path.

---

## 6. Database schemas

### User
`name, email (unique, lowercase), password (select:false), role
(ADMIN|TRAINER|CLIENT), googleId (sparse), profileImage, isActive,
refreshToken (select:false), timestamps`

### Client — **35+ persisted onboarding fields**
- **Ownership**: `trainerId`
- **Identity**: `name`, `phone`, `email` (sparse), `gender`, `dob`,
  `age`, `city`, `occupation`
- **Body**: `height`, `startingWeight`, `bodyFat`
- **Health**: `medicalConditions`, `medications`, `pastInjuries`,
  `allergies`
- **Goal & program**: `goal`, `targetWeight`, `targetBodyFat`,
  `timeline`, `goalDescription`, `startDate`, `duration`,
  `sessionFrequency`
- **Nutrition**: `diet`, `calories`, `protein`, `carbs`, `fats`,
  `mealsPerDay`, `waterTarget`, `cheatMeals`, `foodDislikes`,
  `eatingHabits`
- **Trainer notes**: `privateNotes`
- **Lifecycle**: `status` (ACTIVE|ARCHIVED), `userId` (set after activation)

Indexes: `{trainerId}`, `{trainerId, status}`.
All new fields are optional → no migration needed for existing docs.
Schema-level guards (min/max, maxlength, enum) mirror the validator.

### ClientInvite
`trainerId, clientName, phone, email, inviteToken (unique), expiresAt,
isUsed, timestamps`

Indexes: `{trainerId, isUsed}`, `{inviteToken, expiresAt}`.

### CheckIn
`clientId, trainerId, weight, sleep, water, energy (1–5), mood (1–5),
notes, status (PENDING|REVIEWED|FLAGGED), trainerComment, reviewedAt,
timestamps`

Indexes: `{trainerId, status, createdAt:-1}`, `{clientId, createdAt:-1}`.

### ProgressPhoto
`clientId, trainerId, weekNumber, frontPhoto, sidePhoto, backPhoto,
comment, status, timestamps`

Indexes: `{clientId, weekNumber:-1}`, `{trainerId, status, createdAt:-1}`.

### WorkoutPlan
`clientId, planName, goal, durationWeeks, notes, status
(ACTIVE|ARCHIVED), exercises[], timestamps`

Exercise subdocuments keep stable `_id` values for completion tracking and
store `name, sets, reps, weight, restSeconds, dayNumber, order, notes`.

Indexes: `{clientId}`, `{clientId, status}`.

### WorkoutCompletion
`clientId, workoutPlanId, exerciseId, completedAt, timestamps`

Indexes: `{clientId, workoutPlanId}`, `{clientId, completedAt:-1}`,
`{workoutPlanId}`, unique `{clientId, workoutPlanId, exerciseId}`.

---

## 7. Backend validation system

Pure validator modules (`src/validators/*.validator.js`) return:

```js
{ ok: true,  value }   // cleaned, trimmed, type-coerced
{ ok: false, errors }  // { fieldName: "message" }
```

Wired into:
- `client.service.createClient()` — strict mode
- `client.service.updateClient()` — partial mode
- `auth.controller.activateInvite()` — required password validation
- `admin.service.createTrainer()` — inline (name/email/password rules)

`ApiError.validation(errors)` is the standard throw site. The global
`errorHandler` surfaces `errors` in the JSON envelope:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": { "email": "Enter a valid email address." }
}
```

### Validation rules implemented
- `name` (2–200), `phone` (regex 7–20), `email` (RFC-ish), `gender`
  enum, `age` integer 1–120, `city` ≤120, `occupation` ≤200
- `height` 80–250 cm, `startingWeight`/`targetWeight` 20–300 kg,
  `bodyFat`/`targetBodyFat` 1–60
- `calories` 800–6000, `protein` 20–500 g, `carbs` 20–1000 g, `fats`
  10–300 g, `mealsPerDay` integer 1–8, `waterTarget` 0.5–10 L,
  `cheatMeals` integer 0–7
- `goalDescription` 20–2000 chars, `timeline`/`duration`/
  `sessionFrequency`/`diet` ≤60 chars
- `dob` parseable past date (backend derives `age` if not supplied)
- `startDate` parseable date
- Free-text health/diet/notes fields with explicit length caps
  (1000–4000 chars)
- Body shape guards (`_root` error on non-object body)

---

## 8. API surface

### Auth
| Method | Path                                  | Auth         | Notes                            |
|--------|---------------------------------------|--------------|----------------------------------|
| POST   | `/api/auth/admin/login`               | public       | Email + password; rejects disabled accounts |
| POST   | `/api/auth/admin/create`              | ADMIN        | Bootstrap subsequent admins      |
| POST   | `/api/auth/trainer/signup`            | public       | Email + password (alt to Google) |
| POST   | `/api/auth/trainer/login`             | public       | Email + password; rejects disabled trainers |
| GET    | `/api/auth/google?role=TRAINER\|CLIENT`| public ★    | Returns 503 when feature disabled |
| GET    | `/api/auth/google/callback`           | passport ★   | Redirects to frontend with token |
| POST   | `/api/auth/refresh`                   | cookie       | Returns new access token         |
| POST   | `/api/auth/logout`                    | cookie       | Clears refresh + cookie          |
| GET    | `/api/auth/me`                        | bearer       | Safe user object                 |
| GET    | `/api/auth/invite/:token`             | public       | Returns invite metadata          |
| POST   | `/api/auth/invite/:token/activate`    | public       | Requires password ≥ 8 chars      |

★ Gated by `ENABLE_GOOGLE_AUTH`.

### Clients
| Method | Path                       | Auth                 | Notes                                              |
|--------|----------------------------|----------------------|----------------------------------------------------|
| POST   | `/api/clients`             | TRAINER \| ADMIN     | Persists 35+ onboarding fields + auto-generates 72h activation URL |
| GET    | `/api/clients`             | TRAINER              | Own clients only (admin forbidden — privacy rule)  |
| GET    | `/api/clients/:id`         | TRAINER              | Ownership enforced                                 |
| PATCH  | `/api/clients/:id`         | TRAINER \| ADMIN     | Edit any onboarding field; archive via `status: "ARCHIVED"` |

### Admin (platform operations)
| Method | Path                                   | Auth  | Notes                          |
|--------|----------------------------------------|-------|--------------------------------|
| GET    | `/api/admin/trainers`                  | ADMIN | List w/ client counts          |
| POST   | `/api/admin/trainers`                  | ADMIN | Create trainer (name/email/password) |
| POST   | `/api/admin/trainers/:id/disable`      | ADMIN | Sets isActive=false + invalidates refresh |
| POST   | `/api/admin/trainers/:id/enable`       | ADMIN | Sets isActive=true             |
| GET    | `/api/admin/metrics`                   | ADMIN | Platform totals (no PII)       |

### Trainer
| Method | Path                  | Auth     | Returns                                        |
|--------|-----------------------|----------|------------------------------------------------|
| GET    | `/api/trainer/metrics`| TRAINER  | `{activeClients, totalClients, archivedClients, pendingCheckins, photosPendingReview, attentionRequired}` — all real counts |

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

### Workouts
| Method | Path                                            | Auth              | Notes |
|--------|-------------------------------------------------|-------------------|-------|
| POST   | `/api/workouts/client/:clientId`                | TRAINER           | Create plan for an owned client |
| GET    | `/api/workouts/client/:clientId`                | TRAINER \| ADMIN \| CLIENT | Trainer-owned, admin read-only, or own linked client |
| GET    | `/api/workouts/client/me`                       | CLIENT            | Active assigned plans for the client portal |
| GET    | `/api/workouts/:id`                             | TRAINER \| ADMIN \| CLIENT | Read with ownership/self checks |
| PATCH  | `/api/workouts/:id`                             | TRAINER           | Update owned-client plans |
| DELETE | `/api/workouts/:id`                             | TRAINER           | Soft-archives owned-client plans |
| GET    | `/api/workouts/:id/completions`                 | TRAINER \| ADMIN \| CLIENT | Completion history with access checks |
| POST   | `/api/workouts/:id/exercises/:exerciseId/complete` | CLIENT         | Mark own active-plan exercise complete |

### Health & static
- `GET /api/health` — liveness
- `GET /uploads/<filename>` — Multer-served photo files

---

## 9. Frontend routes

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

## 10. Security & privacy rules

1. **Trainer ownership** — every client query filtered by
   `{trainerId: req.user._id}` in the service layer. Document fetches
   do a redundant `String(doc.trainerId) === String(req.user._id)`
   check before returning. 403 on mismatch.
2. **Admin privacy** — admin **not** in `allowRoles` for
   `GET /api/clients`, `GET /api/clients/:id`, or `/api/trainer/metrics`.
   Admin sees trainer-level analytics only. The admin trainers list
   exposes counts, not client identities.
3. **Hidden fields** — `User.refreshToken` and `User.password` are
   `select: false`. `getCurrentUser` returns a hand-picked safe object.
4. **JWT middleware** — validates `Authorization: Bearer <access>`
   AND `user.isActive`. Disabled users get 401.
5. **Role middleware** — `allowRoles("ADMIN", …)` returns 403 if the
   authenticated user's role is not in the list.
6. **Disable cascade** — disabling a trainer also clears their
   `refreshToken`, so any active session dies on next refresh attempt.
7. **CSRF / cookies** — refresh cookie is `httpOnly + sameSite:"strict"`,
   `secure` in production.
8. **Upload limits** — Multer caps 5 MB per file, image MIME types only.
9. **Invite tokens** — 32-byte cryptographic random, 72h expiry, single
   email-bound.

---

## 11. UX guarantees

Every data-fetching page uses primitives in
`components/feedback/States.jsx`:

- `Skeleton`, `SkeletonGrid`, `SkeletonDetail` — loading
- `EmptyState` — nothing to show, with optional CTA
- `ErrorState` — failure with retry button
- `Toast` — success / error feedback

Form pages (Add Client wizard, Check-in form, Photo upload, Login,
Activation, Create Trainer modal) all have:
- Per-step client-side validation matching backend requirements
- Inline per-field error display (red border + helper text)
- Loading button state
- Toast on success
- Redirect / navigation on completion

Wizard specifics:
- **State persistence** — single parent `useState`; back/next never
  clears entered values
- **Per-step validation** — errors scoped to current step only, never
  leak across steps
- **Scroll to first error** on validation failure
- **All 32 wizard fields persist** end-to-end (the audit-fixed
  field-drop bug from prior pass)

---

## 12. Working trainer flow (end-to-end)

```
1. Admin creates trainer
   → POST /api/admin/trainers (name, email, password)
   → Trainer can now log in with email/password
2. Trainer opens / → LoginPage
   → email + password OR Google (if feature enabled)
   → JWT pair issued, lands on /trainer/dashboard
3. Dashboard loads real metrics + check-in feed + attention list
4. Trainer clicks +Add Client → fills 5-step wizard
   → POST /api/clients → returns { client, invite: { activationUrl } }
   → Wizard shows URL with Copy Link + Copy WhatsApp Message buttons
5. Trainer shares the URL with the client
6. Client opens /activate/:token
   → GET /api/auth/invite/:token → renders "Welcome, <name>"
   → Sets password (≥8 chars + confirm), submits
   → POST /api/auth/invite/:token/activate
   → Backend creates CLIENT User, links Client.userId, returns JWT pair
   → ActivatePage stores token, navigates to /client/dashboard
7. Trainer (back on /trainer/client/:id):
   - Overview tab: real client + last check-in (35+ fields shown
     across Goal Snapshot, Body Metrics, Program, Personal, Health)
   - Check-ins tab: inline form + reverse-chrono list
   - Photos tab: upload front/side/back + comment editor
   - Workout/Nutrition tabs: empty state with "Edit/Reassign" buttons
   - Notes tab: displays privateNotes captured during onboarding
   - Approve / Flag from /trainer/check-ins
8. Admin can disable the trainer
   → POST /api/admin/trainers/:id/disable
   → Trainer's refresh token invalidated, next request → 401
9. Logout via sidebar → clears cookie, drops local token, → /login
```

---

## 13. What's NOT built

Intentionally skipped (out of scope or queued):

- **In-app messaging** — removed (trainers contact clients out-of-band)
- **Workout plan editor + tab content** — Edit / Reassign buttons emit
  "coming in a later phase" toast
- **Nutrition plan editor** — same pattern (data shown, editor stubbed)
- **Client portal data wiring beyond the dashboard** — Nutrition /
  Progress / Workout pages show empty states ("No plan assigned yet")
- **Trainer Schedule** — stub page
- **Email/WhatsApp delivery of invite links** — backend generates the
  URL; sending is out-of-band
- **Cloud storage** — uploads stay on local disk per prototype scope
- **Payments / subscriptions / analytics / notifications / mobile app**

---

## 14. How to run

```bash
# Backend
cd backend
npm install
# create .env from .env.example
npm start         # production
npm run dev       # nodemon
npm test          # Jest (5 suites, 122 tests, ~1s)

# Frontend
cd frontend
npm install
npm run dev       # vite — http://localhost:5173
npm run build     # production bundle
npm run lint
```

Backend defaults to port `5000`. Frontend dev server proxies
`/api/*` → `http://localhost:5000`.

`backend/uploads/` is created on first request; served at
`/uploads/<filename>`.

---

## 15. Conventions

- **HTTP responses** — `{ success, message, data }` always
  (see `utils/ApiResponse.js`). Validation errors include `errors`
  field. Plain errors throw `ApiError(statusCode, message)`.
- **Controller pattern** — controllers are thin; all business logic +
  ownership checks live in `services/`.
- **Frontend services** — every API call goes through `lib/api.js`.
  No raw `fetch`. Services return the inner `data.*` shape.
- **Components** — only the in-house design system. New page-local
  helpers (Field, Chip, Stepper) are colocated, not exported.
- **No new theme tokens** — colors and spacing come from Tailwind +
  `globals.css`. Semantic colors: `emerald` (success), `amber`
  (warning), `red` (error), `primary` (#6366f1).
- **Tests** — pure unit tests against validators + schema. No DB,
  no HTTP. Contract tests pin the persistence allowlist to the
  schema paths so silent field-drops can't recur.

---

## 16. Test coverage

Jest, 5 suites, 122 tests passing:

| Suite | Tests | Covers |
|---|---|---|
| `validators/clientPayload.test.js` | 66 | happy paths, missing fields, invalid email (6 cases) + lowercasing, invalid phone (5), invalid height incl. "abc"/"12abc"/"@@@", invalid weight ranges, 13 invalid nutritional values, gender/status enums, body shape guards |
| `validators/clientPayload.expanded.test.js` | 7 | full onboarding payload accepted end-to-end, dob → age derivation, future dob rejection, oversized text rejection, length-cap acceptance, empty optional fields dropped silently |
| `validators/activationPayload.test.js` | 9 | password required/length/type, name length, body shape |
| `utils/ApiError.test.js` | 4 | statusCode/message/errors fields, `.validation()` helper |
| `contract/clientFields.contract.test.js` | 36 | every persisted field exists on schema (parameterised), validator accepts every onboarding field, `new Client({...})` round-trips via `toObject()` with `validateSync()` checking ranges/enums — no DB connection |

---

## 17. Open questions / risks

- **Google OAuth credentials must be configured** in Google Cloud
  Console with the redirect URI matching `GOOGLE_CALLBACK_URL` when
  the feature is enabled. Without that, OAuth won't complete.
- **Activation token** — currently single-use semantics (`isUsed=true`
  after activation) but the endpoint still re-issues tokens on repeat
  hits until `expiresAt`. Decide whether to harden for production.
- **Trainer creates check-ins on behalf of clients** — prototype
  shortcut. Production should expose a path that resolves the client
  via the authenticated CLIENT user.
- **`MONGO_URI` in `.env.example`** — empty, but the actual `.env` may
  contain dev cluster creds. Rotate before public release.
- **Client portal sub-pages** (Nutrition/Progress/Workout) currently
  show empty states. Wire to real per-client data once those domains
  have backend endpoints.
- **Schedule page** still a stub.
