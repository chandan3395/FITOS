# FITOS — Project Context

> Snapshot of the FITOS codebase as of the current state. Single source
> of truth for "where things are" and "what's wired up." Update as the
> prototype evolves.

---

## 1. Product summary

FITOS is a fitness-coaching platform with three roles:

| Role        | Signup path                              | What they do                                          |
|-------------|------------------------------------------|-------------------------------------------------------|
| **ADMIN**   | Bootstrapped manually + admin-created    | Platform operator. Manages trainers & admins. No client PII. |
| **TRAINER** | Created by admin · Google OAuth (gated)  | Onboards clients, builds workout/nutrition plans & templates, reviews check-ins & photos. |
| **CLIENT**  | Invite link from trainer                 | Activates account, submits check-ins, uploads progress photos, sees own plans & progress. |

No in-app messaging. Trainers deliver activation links to clients via
**WhatsApp** (Meta Cloud API, send-only foundation) or out-of-band
(copy link / copy WhatsApp message). Progress photos are stored on
**Cloudinary** via signed direct uploads.

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
│   ├── uploads/            ← legacy Multer dir (pre-Cloudinary photos); gitignored
│   ├── scripts/
│   │   ├── dedupe-progress-photos.js        ← one-shot (clientId, week) dedupe
│   │   └── migrate-photos-to-cloudinary.js  ← migrate legacy /uploads → Cloudinary
│   ├── __tests__/          ← Jest unit tests (no DB)
│   │   ├── contract/clientFields.contract.test.js
│   │   ├── services/whatsapp.service.test.js
│   │   ├── utils/ApiError.test.js
│   │   └── validators/
│   │       ├── activationPayload.test.js
│   │       ├── clientPayload.test.js
│   │       ├── clientPayload.expanded.test.js
│   │       ├── workoutPayload.test.js
│   │       ├── nutritionPayload.test.js
│   │       ├── workoutTemplatePayload.test.js
│   │       └── nutritionTemplatePayload.test.js
│   └── src/
│       ├── server.js
│       ├── app.js          ← passport gated by ENABLE_GOOGLE_AUTH; /uploads static
│       ├── config/
│       │   ├── env.js      ← validateEnv() + env object (Cloudinary required)
│       │   ├── cloudinary.js  ← SDK config + sign/url/thumbnail/destroy helpers
│       │   ├── cors.js
│       │   ├── database.js
│       │   ├── logger.js
│       │   └── passport.js
│       ├── middleware/
│       │   ├── auth.js     ← validates JWT + isActive (+ dev bypass)
│       │   ├── roles.js    ← allowRoles helper
│       │   ├── errorHandler.js
│       │   ├── notFound.js
│       │   ├── requestLogger.js
│       │   └── upload.js   ← Multer disk storage (legacy; UPLOAD_ROOT export)
│       ├── schemas/
│       │   ├── User.schema.js
│       │   ├── Client.schema.js          ← 35+ onboarding fields + lastInviteSentAt
│       │   ├── ClientInvite.schema.js
│       │   ├── CheckIn.schema.js
│       │   ├── ProgressPhoto.schema.js   ← Cloudinary {publicId,url,thumbnailUrl} slots
│       │   ├── WorkoutPlan.schema.js
│       │   ├── WorkoutCompletion.schema.js
│       │   ├── WorkoutTemplate.schema.js
│       │   ├── NutritionPlan.schema.js
│       │   ├── NutritionTemplate.schema.js
│       │   └── ActivityLog.schema.js
│       ├── validators/
│       │   ├── clientPayload.validator.js
│       │   ├── activationPayload.validator.js
│       │   ├── workoutPayload.validator.js
│       │   ├── nutritionPayload.validator.js
│       │   ├── workoutTemplatePayload.validator.js
│       │   └── nutritionTemplatePayload.validator.js
│       ├── services/
│       │   ├── client.service.js          ← create/update + issueInvite + sendWhatsAppInvite
│       │   ├── admin.service.js           ← trainer & admin CRUD + platform metrics
│       │   ├── checkin.service.js
│       │   ├── progressPhoto.service.js   ← Cloudinary metadata persistence
│       │   ├── upload.service.js          ← signs Cloudinary direct uploads
│       │   ├── whatsapp.service.js        ← Meta WhatsApp Cloud API (send text)
│       │   ├── workoutPlan.service.js
│       │   ├── workoutTemplate.service.js
│       │   ├── nutritionPlan.service.js
│       │   ├── nutritionTemplate.service.js
│       │   └── activity.service.js        ← append-only activity feed writer
│       ├── controllers/
│       │   ├── auth / client / admin / checkin / progressPhoto / upload
│       │   ├── workoutPlan / nutritionPlan / workoutTemplate / nutritionTemplate
│       │   ├── trainer / activity / health .controller.js
│       ├── routes/
│       │   ├── index.js  ← mounts all routers under /api
│       │   ├── auth / client / admin / checkin / progress-photos / uploads
│       │   ├── workouts / nutrition / workout-templates / nutrition-templates
│       │   ├── trainer / activity / health / dev .routes.js
│       └── utils/
│           ├── ApiError.js  ← validation() static helper
│           ├── ApiResponse.js
│           ├── generateAccessToken.js
│           └── generateRefreshToken.js
└── frontend/
    ├── package.json
    ├── vite.config.js       ← /api proxy → localhost:5000
    ├── tailwind.config.js · postcss.config.js · index.html
    ├── .env.development     ← VITE_DEV_AUTH_BYPASS=true (dev-only)
    ├── .env.example
    └── src/
        ├── main.jsx · App.jsx (mounts DevRoleSwitcher when bypass on)
        ├── routes/AppRoutes.jsx
        ├── constants/{routes,roles,index}.js
        ├── contexts/{AuthContext,ThemeContext,index}.jsx
        ├── hooks/{useAuth,useTheme,index}.js
        ├── lib/
        │   ├── api.js               ← axios + auto-refresh interceptor
        │   ├── devAuth.js           ← DEV_BYPASS + mock users + role storage
        │   └── imageCompression.js  ← browser WebP compression (max 1200px, q0.8)
        ├── styles/{globals.css, index.css, theme.js}
        ├── components/
        │   ├── ui/             (Card, Button, Input, Loader, Modal)
        │   ├── design-system/  (MetricCard, ClientCard, AlertCard, Icons, …)
        │   ├── progress/ComparePhotos.jsx  ← before/after photo compare modal
        │   ├── feedback/States.jsx (Skeleton, EmptyState, ErrorState, Toast)
        │   ├── dev/DevRoleSwitcher.jsx
        │   └── layouts/{Auth,Admin,Trainer,Client}Layout.jsx
        ├── services/
        │   ├── authService · clientService · adminService · checkinService
        │   ├── progressPhotoService · uploadService
        │   ├── workoutService · nutritionService
        │   ├── workoutTemplateService · nutritionTemplateService
        │   ├── trainerService · activityService · index.js
        └── pages/
            ├── DesignSystemPage.jsx · NotFound.jsx
            ├── auth/   (LoginPage, GoogleCallbackPage, ActivatePage)
            ├── admin/  (AdminDashboard, AdminTrainersPage, AdminAdminsPage)
            ├── trainer/(TrainerDashboard, TrainerClientsPage, TrainerAddClientPage,
            │            TrainerClientDetailPage, TrainerCheckinsPage,
            │            TrainerTemplatesPage, WorkoutPlanTab, NutritionPlanTab,
            │            TrainerStubPage)
            └── client/ (ClientDashboard, ClientNutritionPage,
                         ClientProgressPage, ClientWorkoutPage)
```

---

## 3. Tech stack

**Backend** — Node 18+, Express 4, MongoDB Atlas via Mongoose, JWT +
refresh token (HttpOnly cookie), Passport Google OAuth20 (feature-flag
gated), bcryptjs, Cloudinary SDK (signed direct uploads), Meta WhatsApp
Cloud API (native `fetch`, no SDK), Multer (legacy disk storage), helmet,
cors, morgan, cookie-parser, Jest (testing).

**Frontend** — React 18, Vite 5, React Router 6, Tailwind 3, axios.
Pure-black premium theme (`#000` / `#0a0a0a` / indigo `#6366f1`
accent). In-house design system; no UI library. Browser-side image
compression before Cloudinary upload.

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
ENABLE_GOOGLE_AUTH=true

# Cloudinary — REQUIRED (server fails fast on startup if any is missing)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# WhatsApp Cloud API (Meta) — OPTIONAL (unset → invite-send returns 503)
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...        # reserved for inbound webhook (later)

# Dev-only bypass (NEVER enable in production)
DEV_AUTH_BYPASS=false
```

### Frontend `.env.local` (or `.env.development`)

```
VITE_DEV_AUTH_BYPASS=true        # dev-only; compiled out of prod builds
VITE_ENABLE_GOOGLE_AUTH=true     # mirrors backend flag — hides Google CTA
```

> Only `VITE_`-prefixed vars reach the client bundle. All secrets
> (Mongo, JWT, OAuth, Cloudinary, WhatsApp) live in `backend/.env` and
> are never exposed to the frontend.

---

## 5. Authentication model

| Token         | Lifetime | Storage                                  |
|---------------|----------|------------------------------------------|
| Access token  | 10 min   | JS memory (mirrored to localStorage)     |
| Refresh token | 7 days   | HttpOnly cookie set by backend           |

Flow:
- `lib/api.js` attaches `Authorization: Bearer <access>` on every request.
- On any 401, a single shared `refresh` promise hits `/api/auth/refresh`;
  the original request is replayed once with the new token. Concurrent
  401s coalesce.
- If refresh fails, `setUnauthorizedHandler` clears `AuthContext` and the
  role guard bounces to `/login`.
- **Disabled accounts**: blocked at `authenticate` middleware (`!isActive`)
  and at login; disabling also clears the refresh token, so live sessions
  die on next refresh.

### Dev auth bypass
- Frontend: hard-gated on `import.meta.env.DEV && VITE_DEV_AUTH_BYPASS`;
  injects a mock user, switchable via the floating `DevRoleSwitcher`.
- Backend: `DEV_AUTH_BYPASS=true` lets `authenticate()` resolve `req.user`
  from `x-dev-role` / `x-dev-client-id` headers and unlocks `/api/dev/*`.
  Never enable in production.

### Google OAuth feature flag
- Backend `ENABLE_GOOGLE_AUTH=false`: passport never loaded,
  `/api/auth/google*` returns 503, `GOOGLE_*` not required at startup.
- Frontend `VITE_ENABLE_GOOGLE_AUTH=false`: hides the Google CTA.

---

## 6. Database schemas

### User
`name, email (unique, lowercase), password (select:false), role
(ADMIN|TRAINER|CLIENT), googleId (sparse), profileImage, isActive,
refreshToken (select:false), timestamps`

### Client — 35+ persisted onboarding fields
- **Ownership**: `trainerId`
- **Identity**: `name`, `phone`, `email` (sparse), `gender`, `dob`, `age`, `city`, `occupation`
- **Body**: `height`, `startingWeight`, `bodyFat`
- **Health**: `medicalConditions`, `medications`, `pastInjuries`, `allergies`
- **Goal & program**: `goal`, `targetWeight`, `targetBodyFat`, `timeline`,
  `goalDescription`, `startDate`, `duration`, `sessionFrequency`
- **Nutrition**: `diet`, `calories`, `protein`, `carbs`, `fats`,
  `mealsPerDay`, `waterTarget`, `cheatMeals`, `foodDislikes`, `eatingHabits`
- **Trainer notes**: `privateNotes`
- **Lifecycle**: `status` (ACTIVE|ARCHIVED), `userId` (set after activation),
  `lastInviteSentAt` (last successful WhatsApp invite)

Indexes: `{trainerId}`, `{trainerId, status}`. All onboarding fields optional.

### ClientInvite
`trainerId, clientName, phone, email, inviteToken (unique), expiresAt,
isUsed, timestamps`. Indexes: `{trainerId, isUsed}`, `{inviteToken, expiresAt}`.

### CheckIn
`clientId, trainerId, weight, sleep, water, energy (1–5), mood (1–5), notes,
status (PENDING|REVIEWED|FLAGGED), trainerComment, reviewedAt, timestamps`.
Indexes: `{trainerId, status, createdAt:-1}`, `{clientId, createdAt:-1}`.

### ProgressPhoto — **Cloudinary-backed**
`clientId, trainerId, weekNumber, frontPhoto, sidePhoto, backPhoto,
uploadedBy, uploaderRole (TRAINER|CLIENT|ADMIN), comment,
status (PENDING|REVIEWED|FLAGGED), timestamps`

Each photo slot is a subdocument `{ publicId, url, thumbnailUrl }` pointing
at a Cloudinary asset (no raw response stored). Deterministic publicIds:
`fitos/clients/<clientId>/week-<n>/<front|side|back>`.
Indexes: unique `{clientId, weekNumber}`, `{trainerId, status, createdAt:-1}`.

### WorkoutPlan
`clientId, planName, goal, durationWeeks, notes, status
(DRAFT|ACTIVE|ARCHIVED), exercises[], timestamps`. Exercise subdocs keep
stable `_id` for completion tracking: `name, sets, reps, weight,
restSeconds, dayNumber, order, notes`. Indexes: `{clientId}`, `{clientId, status}`.

### WorkoutCompletion
`clientId, workoutPlanId, exerciseId, completedAt, timestamps`.
Indexes: `{clientId, workoutPlanId}`, `{clientId, completedAt:-1}`,
`{workoutPlanId}`, unique `{clientId, workoutPlanId, exerciseId}`.

### NutritionPlan
`clientId, planName, notes, status (DRAFT|ACTIVE|ARCHIVED), calories,
protein, carbs, fats, waterTarget, mealsPerDay, cheatMeals, dietType,
foodAvoidances, eatingHabits, timestamps`. Indexes: `{clientId}`, `{clientId, status}`.

### WorkoutTemplate (trainer-private)
`trainerId, name, description, durationWeeks, notes,
status (ACTIVE|ARCHIVED), exercises[], timestamps`.
Index: `{trainerId, status, updatedAt:-1}`.

### NutritionTemplate (trainer-private)
`trainerId, name, description, notes, status (ACTIVE|ARCHIVED), calories,
protein, carbs, fats, waterTarget, mealsPerDay, cheatMeals, dietType,
foodRestrictions, eatingHabits, timestamps`.
Index: `{trainerId, status, updatedAt:-1}`.

### ActivityLog (per-trainer feed, append-only)
`trainerId, clientId, actorId, actorRole (TRAINER|CLIENT|ADMIN|SYSTEM),
entityId, type, summary, metadata, timestamps`.
Types: `CLIENT_CREATED`, `INVITE_SENT`, `WHATSAPP_INVITE_SENT`,
`INVITE_ACTIVATED`, `WORKOUT_PUBLISHED`, `NUTRITION_PUBLISHED`,
`CHECKIN_SUBMITTED`, `PROGRESS_PHOTO_UPLOADED`.
Index: `{trainerId, createdAt:-1}`.

---

## 7. Backend validation system

Pure validator modules (`src/validators/*.validator.js`) return
`{ ok: true, value }` (cleaned/coerced) or `{ ok: false, errors }`
(`{ field: "message" }`). `ApiError.validation(errors)` is the standard
throw site; the global `errorHandler` surfaces `errors` in the JSON
envelope:

```json
{ "success": false, "message": "Validation failed",
  "errors": { "email": "Enter a valid email address." } }
```

Validators: `clientPayload` (strict + partial), `activationPayload`,
`workoutPayload`, `nutritionPayload`, `workoutTemplatePayload`,
`nutritionTemplatePayload`. Macro/body ranges are shared across
client onboarding, plans, and templates so values flow through without
re-validation. Schema-level min/max/maxlength/enum mirror the validators
as defense-in-depth.

---

## 8. API surface

All routes mounted under `/api`. `★` = gated by `ENABLE_GOOGLE_AUTH`.

### Auth
| Method | Path                                  | Auth     |
|--------|---------------------------------------|----------|
| POST   | `/api/auth/admin/login`               | public   |
| POST   | `/api/auth/admin/create`              | ADMIN    |
| POST   | `/api/auth/trainer/signup`            | public   |
| POST   | `/api/auth/trainer/login`             | public   |
| GET    | `/api/auth/google?role=TRAINER\|CLIENT`| public ★|
| GET    | `/api/auth/google/callback`           | passport ★|
| POST   | `/api/auth/refresh`                   | cookie   |
| POST   | `/api/auth/logout`                    | cookie   |
| GET    | `/api/auth/me`                        | bearer   |
| GET    | `/api/auth/invite/:token`             | public   |
| POST   | `/api/auth/invite/:token/activate`    | public   |

### Clients
| Method | Path                       | Auth             | Notes |
|--------|----------------------------|------------------|-------|
| POST   | `/api/clients`             | TRAINER \| ADMIN | Persists onboarding fields + auto-issues 72h activation URL |
| GET    | `/api/clients`             | TRAINER          | Own clients only (admin forbidden) |
| GET    | `/api/clients/:id`         | TRAINER          | Ownership enforced |
| PATCH  | `/api/clients/:id`         | TRAINER \| ADMIN | Edit fields; archive via `status:"ARCHIVED"` |
| POST   | `/api/clients/:id/invite`  | TRAINER \| ADMIN | (Re)send activation invite via WhatsApp; stamps `lastInviteSentAt` |

### Uploads (Cloudinary signing)
| Method | Path                | Auth                      | Notes |
|--------|---------------------|---------------------------|-------|
| POST   | `/api/uploads/sign` | TRAINER \| ADMIN \| CLIENT | Returns signed params for one progress-photo slot (direct browser upload) |

### Progress photos (Cloudinary metadata)
| Method | Path                                | Auth                      | Notes |
|--------|-------------------------------------|---------------------------|-------|
| POST   | `/api/progress-photos`              | TRAINER \| ADMIN \| CLIENT | Metadata-only upsert per (client, week); body carries per-slot publicIds |
| GET    | `/api/progress-photos/me`           | CLIENT                    | Own photo sets |
| GET    | `/api/progress-photos/client/:id`   | TRAINER \| ADMIN          | Sorted by week desc |
| PATCH  | `/api/progress-photos/:id/comment`  | TRAINER \| ADMIN          | Comment → REVIEWED |
| PATCH  | `/api/progress-photos/:id/status`   | TRAINER \| ADMIN          | REVIEWED / FLAGGED |
| DELETE | `/api/progress-photos/:id`          | TRAINER \| ADMIN          | Deletes record + Cloudinary assets |

### Workouts
| Method | Path                                               | Auth |
|--------|----------------------------------------------------|------|
| GET    | `/api/workouts/client/me`                          | CLIENT |
| POST   | `/api/workouts/client/:clientId`                   | TRAINER |
| GET    | `/api/workouts/client/:clientId`                   | TRAINER \| ADMIN \| CLIENT |
| GET    | `/api/workouts/:id`                                | TRAINER \| ADMIN \| CLIENT |
| PATCH  | `/api/workouts/:id`                                | TRAINER |
| DELETE | `/api/workouts/:id`                                | TRAINER |
| POST   | `/api/workouts/:id/publish` · `/archive` · `/reassign` | TRAINER |
| GET    | `/api/workouts/:id/completions`                    | TRAINER \| ADMIN \| CLIENT |
| POST   | `/api/workouts/:id/exercises/:exerciseId/complete` | CLIENT |

### Nutrition
| Method | Path                                          | Auth |
|--------|-----------------------------------------------|------|
| GET    | `/api/nutrition/client/me`                    | CLIENT |
| POST   | `/api/nutrition/client/:clientId`             | TRAINER |
| GET    | `/api/nutrition/client/:clientId`             | TRAINER \| ADMIN \| CLIENT |
| GET    | `/api/nutrition/:id`                          | TRAINER \| ADMIN \| CLIENT |
| PATCH  | `/api/nutrition/:id`                          | TRAINER |
| DELETE | `/api/nutrition/:id`                          | TRAINER |
| POST   | `/api/nutrition/:id/publish` · `/archive` · `/reassign` | TRAINER |

### Templates (trainer-private, TRAINER only)
`/api/workout-templates` and `/api/nutrition-templates` each expose:
`GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `POST /:id/duplicate`,
`POST /:id/assign`, `POST /:id/archive`, `DELETE /:id`.

### Admin (platform operations, ADMIN only)
| Method | Path                                   | Notes |
|--------|----------------------------------------|-------|
| GET    | `/api/admin/trainers`                  | List w/ client counts |
| POST   | `/api/admin/trainers`                  | Create trainer |
| POST   | `/api/admin/trainers/:id/disable` `/enable` | Toggle isActive (disable clears refresh) |
| GET    | `/api/admin/admins`                    | List admins |
| POST   | `/api/admin/admins`                    | Create admin |
| POST   | `/api/admin/admins/:id/disable` `/enable` | Toggle admin |
| DELETE | `/api/admin/admins/:id`                | Remove admin |
| GET    | `/api/admin/metrics`                   | Platform totals (no PII) |

### Trainer / Activity / Health / Dev
- `GET /api/trainer/metrics` (TRAINER) — real dashboard counts.
- `GET /api/activity` (TRAINER \| ADMIN) — newest-first activity feed.
- `GET /api/health` — liveness. `GET /uploads/<file>` — legacy local photos.
- `GET /api/dev/clients`, `POST /api/dev/session` — dev-only (bypass).

---

## 9. Frontend routes

| Path                          | Page                          | Guard            |
|-------------------------------|-------------------------------|------------------|
| `/` · `/login`                | LoginPage                     | public           |
| `/auth/google/callback`       | GoogleCallbackPage            | public           |
| `/activate/:token`            | ActivatePage                  | public           |
| `/design-system`              | DesignSystemPage              | public           |
| `/admin/dashboard`            | AdminDashboard                | ADMIN            |
| `/admin/trainers`             | AdminTrainersPage             | ADMIN            |
| `/admin/admins`               | AdminAdminsPage               | ADMIN            |
| `/trainer/dashboard`          | TrainerDashboard              | TRAINER, ADMIN   |
| `/trainer/clients`            | TrainerClientsPage            | TRAINER, ADMIN   |
| `/trainer/clients/new`        | TrainerAddClientPage          | TRAINER, ADMIN   |
| `/trainer/client/:id`         | TrainerClientDetailPage       | TRAINER, ADMIN   |
| `/trainer/check-ins`          | TrainerCheckinsPage           | TRAINER, ADMIN   |
| `/trainer/templates`          | TrainerTemplatesPage          | TRAINER, ADMIN   |
| `/trainer/schedule`           | TrainerStubPage               | TRAINER, ADMIN   |
| `/client/dashboard`           | ClientDashboard               | CLIENT           |
| `/client/nutrition`           | ClientNutritionPage           | CLIENT           |
| `/client/progress`            | ClientProgressPage            | CLIENT           |
| `/client/workout`             | ClientWorkoutPage             | CLIENT           |
| `/not-found` / `*`            | NotFound                      | public           |

---

## 10. Cloudinary & WhatsApp foundations

### Progress photos (Cloudinary, signed direct uploads)
1. Browser compresses the image (`lib/imageCompression.js` → WebP, max
   1200px, q0.8) and requests a signature: `POST /api/uploads/sign`.
2. Browser uploads bytes **directly** to Cloudinary (overwrite + invalidate,
   deterministic publicId) — the backend never receives image bytes.
3. Browser posts the resulting `{ publicId }` per slot to
   `POST /api/progress-photos`; the backend derives `url` + `thumbnailUrl`
   from the publicId and stores metadata only.
4. Replace reuses the same publicId (orphan-free); delete destroys assets.
   Grids use `thumbnailUrl`; full view + Compare Mode use `url`.

**Compare Mode** (`components/progress/ComparePhotos.jsx`) — read-only,
frontend-only fullscreen modal grouping any two weeks by pose
(Front/Back/Side), Week A | Week B. No backend/network/activity.

### WhatsApp (Meta Cloud API, send-only)
- `whatsapp.service.js` calls the Graph API (`v21.0`) directly via `fetch`
  with a 10s AbortController timeout. Errors normalised to ApiError
  (503 not configured · 400 invalid phone · 504 timeout · 502 upstream);
  never throws raw.
- `POST /api/clients/:id/invite` validates the phone, mints a fresh 72h
  invite, sends the activation message, then on success stamps
  `lastInviteSentAt` and records `WHATSAPP_INVITE_SENT`.
- No reminders / automations / campaigns yet (foundation only).

---

## 11. Security & privacy rules

1. **Trainer ownership** — every client/plan query filtered by trainer in
   the service layer; document fetches re-check `trainerId`. 403 on mismatch.
2. **Admin privacy** — admin not in `allowRoles` for client list/detail or
   trainer metrics. Admin sees trainer-level analytics only.
3. **Hidden fields** — `User.refreshToken` / `User.password` are `select:false`.
4. **JWT middleware** — validates bearer token AND `isActive`.
5. **Disable cascade** — disabling clears `refreshToken`.
6. **Cookies** — refresh cookie `httpOnly + sameSite:"strict"`, `secure` in prod.
7. **Uploads** — signed direct-to-Cloudinary; backend never handles bytes.
   Signatures are scoped to a client the caller owns/is.
8. **Invite tokens** — 32-byte random, 72h expiry.
9. **Secrets backend-only** — Cloudinary/WhatsApp/JWT never reach the bundle.

---

## 12. Working trainer flow (end-to-end)

```
1. Admin creates trainer → POST /api/admin/trainers
2. Trainer logs in (email/password or Google) → /trainer/dashboard
3. Dashboard: real metrics + activity feed + attention list
4. +Add Client → 5-step wizard → POST /api/clients → { client, invite }
   → activation panel: Copy link · Copy WhatsApp message · Send WhatsApp Invite
5. Send invite via WhatsApp (POST /api/clients/:id/invite) or share link
6. Client opens /activate/:token → sets password → CLIENT user created,
   Client.userId linked → /client/dashboard
7. Trainer on /trainer/client/:id:
   - Overview (35+ fields, last check-in, Invite Sent date)
   - Check-ins (form + list + approve/flag)
   - Photos (Cloudinary upload front/side/back, comment, Compare Photos)
   - Workout / Nutrition plan tabs (build, publish, archive, reassign)
   - Notes (privateNotes)
   - Resend Invite from header
8. Templates page: build reusable workout/nutrition blueprints; assign to clients
9. Admin can disable a trainer → refresh invalidated → next request 401
```

---

## 13. What's built vs. not

**Built**: auth (JWT + OAuth-gated), admin trainer/admin management,
client onboarding (35+ fields), check-ins, **Cloudinary progress photos +
Compare Mode**, workout plans + completions, nutrition plans,
workout/nutrition templates, activity feed, **WhatsApp invite foundation**,
client portal (dashboard, workout, nutrition, progress wired to real data).

**Not built / queued**: WhatsApp reminders/automations/campaigns &
inbound webhook; trainer Schedule (stub); payments/subscriptions;
push/email notifications; mobile app. Legacy `/uploads` photos await the
Cloudinary migration script run (see §2 scripts).

---

## 14. How to run

```bash
# Backend
cd backend && npm install
# create .env from .env.example (Cloudinary required; WhatsApp optional)
npm run dev       # nodemon   ·   npm start = production
npm test          # Jest — 10 suites, 184 tests, ~1s

# Frontend
cd frontend && npm install
npm run dev       # vite — http://localhost:5173
npm run build · npm run lint
```

Backend listens on `5000`; frontend dev proxies `/api/*` → it.

One-shot scripts (run from `backend/`):
`node scripts/migrate-photos-to-cloudinary.js [--dry]`,
`node scripts/dedupe-progress-photos.js [--dry]`.

---

## 15. Conventions

- **HTTP responses** — `{ success, message, data }` (see `ApiResponse`).
  Validation errors include `errors`. Throw `ApiError(status, message)`.
- **Thin controllers** — business logic + ownership checks live in `services/`.
- **Frontend services** — every call goes through `lib/api.js` (no raw fetch),
  except direct Cloudinary uploads (bare axios to the Cloudinary endpoint).
- **In-house design system only** — colocate page-local helpers.
- **Tests** — pure unit tests against validators/utils/services (fetch mocked).
  No DB, no live HTTP. Contract test pins persistence allowlist to schema paths.
- Backend has **no `lint` script**, and `.eslintrc.cjs` lacks a jest env, so
  test files report `no-undef` under eslint — they are intentionally not linted.

---

## 16. Test coverage

Jest — **10 suites, 184 tests** passing:

| Suite | Covers |
|---|---|
| `validators/clientPayload.test.js` | onboarding happy/sad paths, email/phone/number range validation, enums, body guards |
| `validators/clientPayload.expanded.test.js` | full payload, dob→age, future-dob rejection, length caps |
| `validators/activationPayload.test.js` | password/name rules, body shape |
| `validators/workoutPayload.test.js` | plan + exercise validation |
| `validators/nutritionPayload.test.js` | macro/preference validation |
| `validators/workoutTemplatePayload.test.js` | template + exercise validation |
| `validators/nutritionTemplatePayload.test.js` | template macro validation |
| `services/whatsapp.service.test.js` | phone normalize/validate, not-configured 503, invalid 400, success messageId, 502 upstream, 504 timeout (fetch mocked) |
| `utils/ApiError.test.js` | statusCode/message/errors, `.validation()` |
| `contract/clientFields.contract.test.js` | every persisted field exists on schema; validator accepts all; `new Client({...})` round-trips |

---

## 17. Open questions / risks

- **Cloudinary migration not yet run** against the dev DB (needs a
  Mongo-reachable env) — ~9 legacy `/uploads` photos remain until then.
- **WhatsApp live send unverified** — needs real Meta credentials + an
  opted-in recipient (24h window or approved template). Code path is
  fully mock-tested.
- **Google OAuth** requires console config matching `GOOGLE_CALLBACK_URL`
  when enabled.
- **Activation token** re-issues on repeat hits until `expiresAt` — decide
  single-use hardening for production.
- **Trainer creates check-ins on behalf of clients** — prototype shortcut.
- **`MONGO_URI` / secrets** — rotate dev creds before public release.
