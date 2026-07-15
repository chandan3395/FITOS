# FITOS — Functional & Security Audit

**Scope:** backend `backend/src` (Express 4 + Mongoose) and the frontend build/deploy surface.
**Nature:** read/verify pass. No feature behavior was changed. The only edits were **added tests**, two **low-risk fixes** (a missing index and 3 `console.*`→logger swaps), both listed below.
**Method:** traced `routes/index.js` → each `*.routes.js` → controller → service → schema, plus the Socket.IO layer; then verified authorization end-to-end with real-app integration tests (supertest + `mongodb-memory-server`) and a live Socket.IO runtime test. Nothing in the DB layer is mocked.

**Headline:** the codebase is in strong shape. Authorization is applied consistently through a small set of shared helpers (`utils/clientAccess.js`, `services/conversation.service.js` ownership derivation). No cross-tenant IDOR was found on any audited endpoint or socket event. One **medium consistency gap** (soft-deleted clients) is reported below and deliberately left unchanged pending a product decision.

---

## 1. Feature inventory

Guards legend: `A`=authenticate (JWT), `R(...)`=allowRoles, `own`=ownership/scoping enforced in the service layer.

| Feature | Endpoint(s) | Roles | Authorization check |
|---|---|---|---|
| Health | `GET /api/health` | public | none (intended; DB-aware 200/503) |
| Auth — login | `POST /api/auth/login`, `/admin/login` | public | password + `isActive`; `authLimiter` |
| Auth — refresh/logout | `POST /api/auth/refresh` (limited), `/logout` | public (cookie) | refresh JWT + `user.refreshToken` match + rotation |
| Auth — me | `GET /api/auth/me` | A | token → active user |
| Auth — Google OAuth | `GET /api/auth/google[/callback]` | public | passport + signed `state`; flag-gated |
| Auth — invites | `GET /api/auth/invite/:token`, `POST .../activate` (limited), `POST /invite/link/confirm` | public | token is the secret; expiry checked; signed linkToken |
| Auth — admin create | `POST /api/auth/admin/create` | A + R(ADMIN) | role gate |
| Clients | `POST /clients`, `GET /clients`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `POST /:id/invite[/regenerate]` | A + R(varies) | `getClientForTrainer` ownership; admin write-only; soft-delete guard |
| Trainer metrics | `GET /api/trainer/metrics` | A + R(TRAINER) | self-scoped |
| Admin | `GET/POST /admin/trainers|admins|metrics`, disable/enable/delete | A + R(ADMIN) | last-active-admin + self guards in service |
| Check-ins | `POST /checkins`, `GET /`, `/me`, `/:id`, `PATCH /:id/review` | A + R(varies) | `assertClientAccess` / trainer-owns / self |
| Progress photos | `POST /progress-photos`, `GET /me`, `/client/:id`, `PATCH /:id/comment|status`, `DELETE /:id` | A + R(varies) | `assertClientAccess` / `loadOwned` trainerId |
| Meal check-ins | mirror of progress photos under `/meal-checkins` | A + R(varies) | same |
| Meal logs | `POST /meal-logs`, `GET /me`, `/today`, `/client/:id`, `PATCH /:id/entries/:entryId/review` | A + R(varies) | `assertClientAccess` / trainer-owns-log |
| Uploads (Cloudinary sign) | `POST /uploads/sign`, `/sign-meal`, `/sign-meal-log` | A + R(TRAINER,ADMIN,CLIENT) | `assertClientAccess` before signing |
| Workouts | `POST/GET/PATCH/DELETE /workouts/...`, publish/archive/reassign/complete | A + own | `getWorkoutPlanWithAccess` (owns client; write→trainer); excludes soft-deleted |
| Nutrition | `POST/GET/PATCH/DELETE /nutrition/...`, publish/archive/reassign | A + own | `getPlanWithAccess` (owns client; write→trainer) |
| Workout templates | `GET/POST/PATCH/DELETE /workout-templates/...`, duplicate/assign/archive | A + R(TRAINER) | `loadOwned` trainerId; assign re-checks target client ownership |
| Nutrition templates | same under `/nutrition-templates` | A + R(TRAINER) | same |
| Activity | `GET /activity` (trainer/admin), `GET /activity/me` (client) | A + R(varies) | trainer-scoped; client feed by own clientId + visible-type allowlist |
| Conversations (REST) | `GET /conversations`, `/resolve`, `POST /send`, `GET /:id/messages`, `POST /:id/read` | A + R(TRAINER,CLIENT) | ownership derived from assignment; admin excluded |

### Socket.IO events (`src/socket/`)

| Event | Direction | Authorization |
|---|---|---|
| handshake | client→server | JWT (same as REST) + `isActive`; rejected otherwise |
| `message:send` | client→server | `sendMessage`→`resolveOwnership` (trainer owns client / client is self) |
| `conversation:read` | client→server | `markRead`→`assertParticipant` |
| `typing:start` / `typing:stop` | client→server | broadcast only into rooms the socket already belongs to (`socket.rooms.has`) — no spoofing |
| `message:new` / `:delivered` / `:read` | server→room | emitted to `conversation:<id>` room only |
| `presence:update` | server→rooms | emitted only to the user's own conversation rooms |
| delivered-flush on connect | server | `flushDeliveriesOnConnect` over the user's own conversations |

---

## 2. Authorization matrix — verification result

Every audited endpoint has both `authenticate` and an effective role/ownership gate. The workout/nutrition routers intentionally use `authenticate` only at the router level and enforce role+ownership **in the service** (`assertTrainer` for writes, `resolveClientForUser` for reads) — verified correct, not a missing guard.

| Concern | Result | Evidence |
|---|---|---|
| Trainer cannot reach another trainer's client (read/modify/delete) | ✅ 403/404 | `authRbac`, `features` (workouts/nutrition/photos/meal-logs/clients denied) |
| Client can reach only their own thread; spoofed `?clientId` ignored | ✅ | `messaging › resolve ignores spoofed ?clientId` |
| Second trainer 403 on another trainer's conversation | ✅ 403 | `messaging › history ownership` |
| Admin is never a messaging participant | ✅ 403 | `messaging › admin is never a participant` |
| Activity feeds are trainer-scoped | ✅ `[]` for other trainer | `features › trainer feed is scoped` |
| Client activity feed excludes trainer-private types | ✅ | `features › client feed excludes trainer-private types` |
| Upload signing is ownership-checked before signing | ✅ | `upload.service.assertClientAccess` (code) |
| Template assign re-checks target client ownership | ✅ 403 | `features › cannot assign to another trainer's client` |
| Socket typing/message does not leak to non-participants | ✅ silence | `socket › outsider receives nothing / typing` |
| No endpoint missing `authenticate` (except intended public: health, invite lookup/activate, google) | ✅ | route inventory (§1) |

**No IDOR or missing-guard gaps were found.**

---

## 3. PASS/FAIL per feature (with test evidence)

All PASS. Test files under `backend/__tests__/integration/`:

| Feature area | Status | Representative tests |
|---|---|---|
| Auth — admin login (200/401/403) | PASS | `authRbac › POST /api/auth/admin/login` (3) |
| Auth — `authenticate` (missing/malformed/expired/forged) | PASS | `authRbac › authenticate middleware` (6) |
| Auth — `allowRoles` (trainer→admin route 403) | PASS | `authRbac › allowRoles` |
| Auth — ownership (trainer B vs A's client) | PASS | `authRbac › ownership` (5) |
| Auth — rate limiter → 429 after 10 | PASS | `authRateLimit › allows 10 then 429` |
| Auth — refresh rotation (old token rejected) | PASS | `authRefresh › rotates and rejects replay` |
| Auth — disabled account blocked (login + token) | PASS | `authRefresh › disabled account is blocked everywhere` (2) |
| Messaging — send persists + preview + recipient unread | PASS | `messaging › send persists...` (2) |
| Messaging — history ownership + pagination | PASS | `messaging › history: ownership-checked + paginated` (3) |
| Messaging — resolve self-only | PASS | `messaging › resolve` |
| Messaging — markRead flips other side only + zeroes reader unread | PASS | `messaging › markRead flips only the OTHER side's...` |
| Messaging — soft-deleted client excluded | PASS | `messaging › soft-deleted client is excluded` (2) |
| Messaging — empty/too-long body, bad/missing id | PASS | `messaging › message body + id edge cases` (4) |
| Workouts — create/publish + activity; client self-read; denied | PASS | `features › workouts` (3) |
| Nutrition — create/publish + activity; denied | PASS | `features › nutrition` (2) |
| Workout templates — assign snapshot; cross-trainer denied; client denied | PASS | `features › workout templates` (3) |
| Nutrition templates — create; client denied | PASS | `features › nutrition templates` |
| Check-ins — client submit + 1 activity; client list denied; cross-trainer getOne denied | PASS | `features › check-ins` (3) |
| Meal check-ins — client upload; cross-trainer list denied | PASS | `features › meal check-ins` |
| Meal logs — client log + activity; owner reviews; foreign trainer denied | PASS | `features › meal logs` |
| Progress photos — client upload + activity; foreign trainer denied | PASS | `features › progress photos` |
| Admin — disable trainer (clears refresh); last-admin guard; trainer blocked | PASS | `features › admin management` (3) |
| Client CRUD + soft-delete — create (2 activities), soft-delete (hidden), cross-trainer denied | PASS | `features › client CRUD + soft-delete` (2) |
| Activity rules — client visible-type filter; trainer scoping | PASS | `features › activity feed rules` (2) |
| Socket — auth handshake rejection | PASS | `socket › rejects unauthenticated handshakes` |
| Socket — message:send delivery; outsider silent | PASS | `socket › message:send delivers` |
| Socket — read receipt to sender | PASS | `socket › conversation:read emits a read receipt` |
| Socket — typing scoped to participants | PASS | `socket › typing indicators only reach participants` |
| Socket — presence online/offline + delivered-flush on connect | PASS | `socket › presence + delivered-flush on connect` |

New tests added: **44** (13 messaging + 22 features + 3 auth-refresh + 1 rate-limit + 5 socket). Total suite: **351 tests, 25 suites, all passing** (was 307).

---

## 4. Bugs found & fixes

### Fixed (low-risk, no behavior change)

**FIX-1 — Missing index on the client activity feed (performance).**
`activity.service.listForClientUser` queries `ActivityLog.find({ clientId, type: {$in} }).sort({ createdAt: -1 })`, but `ActivityLog` only indexed `trainerId`. The client dashboard "Recent Activity" was a collection scan.
Fix: added `activityLogSchema.index({ clientId: 1, createdAt: -1 })` in [ActivityLog.schema.js](backend/src/schemas/ActivityLog.schema.js). Indexes don't change behavior.

**FIX-2 — Three `console.*` calls bypassing the pino logger (observability hygiene).**
`config/cloudinary.js` (destroy failure) and `services/activity.service.js` (unknown type, record failure) wrote via `console.*`, so those lines weren't structured or level-controlled like the rest of the app.
Fix: swapped to the shared `logger` (`logger.error`/`logger.warn` with structured fields) in [cloudinary.js](backend/src/config/cloudinary.js) and [activity.service.js](backend/src/services/activity.service.js). `src/` is now free of `console.*`.

### Reported, deliberately NOT changed (behavior change on ambiguous intent)

**OBS-1 (Medium) — Soft-deleted clients can still WRITE self-service records.**
Messaging, workouts, and nutrition resolve the current client with `excludeDeleted: true`, so a soft-deleted client is treated as gone on those paths (verified by tests). But check-ins, progress photos, meal check-ins, meal logs, and upload-signing call `resolveCurrentClient(user)` **without** `excludeDeleted`, e.g.:
- [checkin.service.js:20](backend/src/services/checkin.service.js), [progressPhoto.service.js:50](backend/src/services/progressPhoto.service.js), [mealCheckin.service.js:43](backend/src/services/mealCheckin.service.js), [mealLog.service.js:94](backend/src/services/mealLog.service.js), [upload.service.js:28](backend/src/services/upload.service.js).

`deleteClient` soft-deletes the Client but does not deactivate the client's `User`, so that user still authenticates and could keep posting check-ins/photos/meal logs (which also emit activity rows to the trainer's feed). **Scope is limited to the client's own data** — it is not a cross-tenant IDOR — hence Medium, not High.
Not fixed because closing it changes observable behavior and the intended policy is ambiguous (the `Client` soft-delete comment explicitly mentions only "workout/nutrition reads" being guarded). **Recommendation:** decide the policy, then either add `excludeDeleted: true` to those five call sites, or deactivate the `User` inside `deleteClient` — and add a regression test.

**OBS-2 (Low) — Admin visibility asymmetry.**
Per the Phase-5 privacy rule (`client.service.js`), admins must not read individual `Client` records, and `GET /clients/:id` correctly blocks admin. However `GET /checkins`, `GET /progress-photos/client/:id`, `GET /meal-checkins/client/:id`, and `GET /meal-logs/client/:id` allow `ADMIN`, so an admin can read client check-in/photo/meal data even though they can't read the profile. This looks like a design inconsistency rather than a defect; flagged for a product decision. Not changed.

---

## 5. Data integrity & edge cases

**Required fields / schemas:** verified. `User` (name/email/role), `Client` (trainerId/name), `Conversation` (trainerId/clientId), `Message` (conversationId/senderId/senderRole/body), `CheckIn`/`MealLog`/`MealCheckin`/`ProgressPhoto` all require `clientId`+`trainerId`; `ClientInvite` requires token+expiry. Bodies are length-bounded (`Message` maxlength 5000; validators enforce ranges as defense-in-depth).

**Indexes on hot query paths:**

| Query path | Index | Status |
|---|---|---|
| Message history (`conversationId` + `createdAt`) | `{conversationId:1, createdAt:1}` | ✅ present |
| Conversation uniqueness (`trainerId`+`clientId`) | `{trainerId:1, clientId:1}` unique | ✅ present |
| Trainer conversation list | `{trainerId:1, lastActivityAt:-1}` | ✅ present |
| Trainer activity feed | `{trainerId:1, createdAt:-1}` | ✅ present |
| **Client activity feed (`clientId`+`createdAt`)** | `{clientId:1, createdAt:-1}` | ⚠️ was missing → **added (FIX-1)** |
| Check-ins (client + trainer) | `{clientId,createdAt}`, `{trainerId,status,createdAt}` | ✅ present |
| MealLog / MealCheckin uniqueness (`clientId`+`date`) | unique | ✅ present |
| Workout/Nutrition plans by client | `{clientId}`, `{clientId,status}` | ✅ present |

**Soft-delete exclusion:** verified for messaging (tests) and by code for workouts/nutrition. See OBS-1 for the check-in/photo/meal gap.

**Edge cases tested:** empty/whitespace message body → 400 (nothing persisted); >5000-char body → 400; invalid ObjectId → 400; well-formed missing id → 404; expired/malformed/forged/expired JWT → 401 (`authRbac`). Invite expiry is enforced in `getInvite`/`activateInvite` (`expiresAt < now` → 410) — covered by existing unit tests.

---

## 6. Production hygiene

- **Secrets / .env:** `backend/.env` and `frontend/.env` are gitignored (`git check-ignore` confirms). Only `*.env.example` (blank placeholders) are tracked. A scan of all tracked files for connection strings, `GOCSPX-` secrets, and private keys came back **clean**.
- **Public routes:** exactly the intended ones are unauthenticated — `GET /api/health`, invite lookup/activate, and Google OAuth. All others require `authenticate`.
- **`console.*` in `src/`:** the 3 leftover calls were migrated to the pino logger (FIX-2); `src/` is now clean.
- **`npm audit`:**
  - **Backend: 0 vulnerabilities.**
  - **Frontend: 2 (1 moderate `esbuild`, 1 high `vite`).** Both are **dev-server-only** (esbuild dev-server request reflection; vite dev-server path-traversal / `server.fs.deny` bypass / `launch-editor` — none reachable in the production build output). The only fix is `vite@8`, a **major breaking upgrade** from `^5.3.1`, deliberately out of scope for this no-behavior-change pass.

---

## 7. Outstanding (prioritized)

1. **(Medium) OBS-1** — decide soft-deleted-client write policy and close the check-in/photo/meal/upload gap (add `excludeDeleted:true` to the five call sites *or* deactivate the User on soft-delete), then add a regression test.
2. **(Low) OBS-2** — decide whether admins should read client check-in/photo/meal data given the profile-privacy rule; align the route guards either way.
3. **(Low) Frontend dev-server vulns** — plan the `vite@5 → 8` upgrade (breaking) to clear the two advisories; no production-runtime exposure today.
4. **(Housekeeping)** — a Mongoose deprecation warning (`new` option on `findOneAndUpdate`) surfaces in `admin.service.setTrainerActive`; switch to `returnDocument: 'after'` at some point (cosmetic).

---

## 8. Final verification

```
backend $ npm test        → Test Suites: 25 passed, 25 total
                            Tests:       351 passed, 351 total   (307 prior + 44 new)
backend $ npm run lint     → eslint src — clean (exit 0)
frontend $ npm run build   → ✓ built in ~2.1s (exit 0)
backend $ npm audit        → 0 vulnerabilities
frontend $ npm audit       → 2 (1 moderate, 1 high) — dev-server-only, fix = vite@8 (breaking)
```

Test env for the suite: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENABLE_GOOGLE_AUTH=false`, and placeholder `CLOUDINARY_*` (no live DB — `mongodb-memory-server`).
