"use strict";
const { randomUUID } = require("crypto");
const request = require("supertest");
const sharp = require("sharp");
const app = require("../../src/app");
const { User } = require("../../src/schemas/User.schema");
const { ByotProfile } = require("../../src/schemas/ByotProfile.schema");
const {
  ByotProgress: Progress,
  ByotPhotoAttempt: Attempt,
  ByotPhotoBudget: Budget,
} = require("../../src/schemas/ByotProgress.schema");
const provider = require("../../src/services/byotMediaProvider");
const photos = require("../../src/services/byotPhoto.service");
const clock = require("../../src/utils/byotClock");
const { startMemoryMongo, stopMemoryMongo, tokenFor, uniqEmail } = require("./_setup");
const ApiError = require("../../src/utils/ApiError");
jest.setTimeout(120000);
let db, user, jpeg, assets, now;
const date = "2026-09-20";
async function revoke() {
  const admin = await User.create({ name: "Revocation admin", email: uniqEmail("revoke"), role: "ADMIN" });
  const response = await request(app).patch(`/api/admin/byot-users/${user._id}`)
    .set("Authorization", `Bearer ${tokenFor(admin)}`).send({ isActive: false, expectedIsActive: true });
  expect(response.status).toBe(200);
}
const call = (method, path, body, key = randomUUID(), actor = user) => {
  let r = request(app)[method](`/api/byot/progress${path}`).set("Idempotency-Key", key);
  if (actor) r = r.set("Authorization", `Bearer ${tokenFor(actor)}`);
  return body === undefined ? r : r.send(body);
};
const draft = async (d = date, values = { weightKg: 79 }) => {
  const r = await call("put", `/checkins/${d}`, {
    version: 0,
    measurements: values,
    notes: "Private notes",
  });
  expect(r.status).toBe(200);
  return r.body.data;
};
async function addPhoto(record, slot = "front") {
  const init = await call("post", `/checkins/${record.date}/photos/${slot}/init`, {
    version: record.version,
  });
  expect(init.status).toBe(200);
  const uploaded = await request(app)
    .post(`/api/byot/progress/uploads/${init.body.data.attempt.id}/content`)
    .set("Authorization", `Bearer ${tokenFor(user)}`)
    .set("Content-Type", "image/jpeg")
    .send(jpeg);
  expect(uploaded.status).toBe(200);
  const attached = await call("post", `/checkins/${record.date}/photos/${slot}/attach`, {
    version: init.body.data.record.version,
    attemptId: init.body.data.attempt.id,
  });
  expect(attached.status).toBe(200);
  return attached.body.data;
}
async function full(d = date) {
  let r = await draft(d);
  for (const s of ["front", "side", "back"]) r = await addPhoto(r, s);
  return r;
}
async function complete(record, key = randomUUID()) {
  const r = await call(
    "post",
    `/checkins/${record.date}/complete`,
    { version: record.version },
    key
  );
  expect(r.status).toBe(200);
  return r.body.data;
}
beforeAll(async () => {
  db = await startMemoryMongo();
  await Promise.all([Progress.init(), Attempt.init(), Budget.init(), ByotProfile.init()]);
  jpeg = await sharp({ create: { width: 400, height: 600, channels: 3, background: "#224466" } })
    .jpeg()
    .toBuffer();
  jest.spyOn(clock, "now").mockImplementation(() => new Date(now));
  jest.spyOn(provider, "configured").mockImplementation(() => {});
  jest.spyOn(provider, "upload").mockImplementation(async (publicId, bytes) => {
    const meta = await sharp(bytes).metadata();
    const r = {
      public_id: publicId,
      type: "authenticated",
      resource_type: "image",
      format: "jpg",
      asset_id: randomUUID(),
      bytes: bytes.length,
      width: meta.width,
      height: meta.height,
    };
    assets.set(publicId, { ...r, buffer: bytes });
    return r;
  });
  jest.spyOn(provider, "inspect").mockImplementation(async (id) => {
    if (!assets.has(id)) throw new ApiError(502, "Provider unavailable");
    return assets.get(id);
  });
  jest.spyOn(provider, "destroy").mockImplementation(async (id) => {
    assets.delete(id);
  });
  jest
    .spyOn(provider, "download")
    .mockImplementation(async (photo, thumb) =>
      thumb
        ? sharp(assets.get(photo.publicId).buffer)
            .resize({ width: 360, height: 360, fit: "inside" })
            .jpeg()
            .toBuffer()
        : assets.get(photo.publicId).buffer
    );
});
afterAll(async () => {
  jest.restoreAllMocks();
  await stopMemoryMongo(db);
});
beforeEach(async () => {
  // Each test is an independent synthetic client, not a 300-request browser session.
  await require("../../src/middleware/rateLimit").globalLimiter.resetKey("127.0.0.1");
  await Promise.all([Progress.deleteMany({}), Attempt.deleteMany({}), Budget.deleteMany({})]);
  now = "2026-09-20T12:00:00Z";
  assets = new Map();
  user = await User.create({ name: "Progress", email: uniqEmail("progress"), role: "BYOT" });
  await ByotProfile.create({
    ownerId: user._id,
    timezone: "Asia/Kolkata",
    startingWeightKg: 80,
    targetWeightKg: 75,
    checkInAnchorDate: "2026-09-13",
    onboardingCompletedAt: new Date(),
  });
});
it("disabling during provider upload rejects finalization and keeps the private orphan in cleanup", async () => {
  const r = await draft();
  const intent = (await call("post", `/checkins/${date}/photos/front/init`, { version: r.version })).body.data;
  const original = provider.upload.getMockImplementation();
  provider.upload.mockImplementationOnce(async (...args) => { const asset = await original(...args); await revoke(); return asset; });
  const result = await request(app).post(`/api/byot/progress/uploads/${intent.attempt.id}/content`)
    .set("Authorization", `Bearer ${tokenFor(user)}`).set("Content-Type", "image/jpeg").send(jpeg);
  expect(result.status).toBe(401);
  const attempt = await Attempt.findOne({ id: intent.attempt.id });
  expect(attempt.state).toBe("cleanup");
  expect(assets.get(attempt.publicId).type).toBe("authenticated");
  expect((await Progress.findOne({ ownerId: user._id, date })).checkin.photos.front).toBeNull();
  expect((await call("post", `/checkins/${date}/photos/front/attach`, { version: intent.record.version, attemptId: intent.attempt.id })).status).toBe(401);
  const cleaned = await photos.cleanup(100, new Date(Date.now() + 11 * 60000));
  expect(cleaned.deleted).toBe(1);
  expect(assets.size).toBe(0);
});
it("disable/re-enable during attachment verification cannot attach using the old session", async () => {
  const r = await draft();
  const intent = (await call("post", `/checkins/${date}/photos/front/init`, { version: r.version })).body.data;
  expect((await request(app).post(`/api/byot/progress/uploads/${intent.attempt.id}/content`)
    .set("Authorization", `Bearer ${tokenFor(user)}`).set("Content-Type", "image/jpeg").send(jpeg)).status).toBe(200);
  const inspect = provider.inspect.getMockImplementation();
  provider.inspect.mockImplementationOnce(async (...args) => {
    const asset = await inspect(...args); await revoke();
    await User.updateOne({ _id: user._id }, { isActive: true });
    return asset;
  });
  expect((await call("post", `/checkins/${date}/photos/front/attach`, { version: intent.record.version, attemptId: intent.attempt.id })).status).toBe(401);
  expect((await Progress.findOne({ ownerId: user._id, date })).checkin.photos.front).toBeNull();
});
it("revocation during check-in completion does not advance the schedule", async () => {
  const r = await full();
  const inspect = provider.inspect.getMockImplementation();
  provider.inspect.mockImplementationOnce(async (...args) => { const asset = await inspect(...args); await revoke(); return asset; });
  expect((await call("post", `/checkins/${date}/complete`, { version: r.version })).status).toBe(401);
  expect((await Progress.findOne({ ownerId: user._id, date })).checkin.completedAt).toBeNull();
});
it("revocation and re-enable during media delivery still denies the old session", async () => {
  await addPhoto(await draft());
  const download = provider.download.getMockImplementation();
  provider.download.mockImplementationOnce(async (...args) => {
    const bytes = await download(...args); await revoke(); await User.updateOne({ _id: user._id }, { isActive: true }); return bytes;
  });
  const r = await call("get", `/checkins/${date}/photos/front/original`);
  expect(r.status).toBe(401); expect(r.headers["content-type"]).not.toContain("image");
});
it("overlapping cleanup protects valid pending uploads and deletes abandoned assets once", async () => {
  const r = await draft();
  const intent = (await call("post", `/checkins/${date}/photos/front/init`, { version: r.version })).body.data;
  await Attempt.updateOne({ id: intent.attempt.id }, { nextCleanupAt: new Date(0) });
  const runs = await Promise.all([photos.cleanup(), photos.cleanup()]);
  expect(runs.reduce((n, x) => n + x.deleted, 0)).toBe(0);
  expect((await Progress.findOne({ ownerId: user._id, date })).checkin.pending.front).toBe(intent.attempt.id);
  await Attempt.updateOne({ id: intent.attempt.id }, { expiresAt: new Date(0), nextCleanupAt: new Date(0) });
  const expired = await Promise.all([photos.cleanup(), photos.cleanup()]);
  expect(expired.reduce((n, x) => n + x.deleted, 0)).toBe(1);
});
it.each([
  ["get", "/api/byot/profile"], ["post", "/api/byot/onboarding"],
  ["get", "/api/byot/nutrition/day"], ["get", "/api/byot/nutrition/summary"], ["get", "/api/byot/nutrition/plan"], ["put", "/api/byot/nutrition/plan"], ["delete", "/api/byot/nutrition/plan"],
  ["get", `/api/byot/nutrition/logs/${date}`], ["put", `/api/byot/nutrition/logs/${date}`], ["delete", `/api/byot/nutrition/logs/${date}`],
  ["get", "/api/byot/workouts/day"], ["get", "/api/byot/workouts/routine"], ["put", "/api/byot/workouts/routine"], ["delete", "/api/byot/workouts/routine"], ["post", `/api/byot/workouts/days/${date}/start`], ["put", `/api/byot/workouts/days/${date}/exercises/${randomUUID()}`],
  ["get", "/api/byot/progress/summary"], ["get", "/api/byot/progress/records"], ["get", `/api/byot/progress/records/${date}`], ["put", `/api/byot/progress/records/${date}`], ["delete", `/api/byot/progress/records/${date}`],
  ["put", `/api/byot/progress/checkins/${date}`], ["delete", `/api/byot/progress/checkins/${date}`], ["post", `/api/byot/progress/checkins/${date}/complete`],
  ["post", `/api/byot/progress/checkins/${date}/photos/front/init`], ["post", `/api/byot/progress/uploads/${randomUUID()}/content`], ["post", `/api/byot/progress/checkins/${date}/photos/front/attach`], ["delete", `/api/byot/progress/checkins/${date}/photos/front`], ["get", `/api/byot/progress/checkins/${date}/photos/front/original`], ["get", `/api/byot/progress/checkins/${date}/photos/front/thumbnail`],
])("admin has no override on %s %s", async (method, path) => {
  const admin = await User.create({ name: "Denied", email: uniqEmail("denied"), role: "ADMIN" });
  expect((await request(app)[method](path).set("Authorization", `Bearer ${tokenFor(admin)}`).send({})).status).toBe(403);
});
it("GETs do not create records and show separate onboarding baseline", async () => {
  const summary = (await call("get", "/summary")).body.data;
  expect(summary).toMatchObject({
    baseline: { date: "2026-09-13", weightKg: 80 },
    targetWeightKg: 75,
    latestWeight: null,
    nextDueDate: date,
    state: "due",
  });
  expect((await call("get", `/records/${date}`)).body.data.exists).toBe(false);
  await call("get", "/records");
  expect(await Progress.countDocuments({ ownerId: user._id })).toBe(0);
});
it("creates, edits and deletes canonical partial measurements without zero defaults", async () => {
  let r = await call("put", `/records/${date}`, {
    version: 0,
    measurements: { waistCm: 82.25 },
    notes: "Measurement only",
  });
  expect(r.status).toBe(200);
  expect(r.body.data.measurements.weightKg).toBeNull();
  r = await call("put", `/records/${date}`, {
    version: 1,
    measurements: { weightKg: 81 },
    notes: "Weight only",
  });
  expect(r.status).toBe(200);
  expect(r.body.data.measurements.waistCm).toBeNull();
  expect((await call("get", "/summary")).body.data.changeKg).toBe(1);
  r = await call("delete", `/records/${date}`, { version: 2 });
  expect(r.body.data.exists).toBe(false);
  expect(await Progress.countDocuments({ ownerId: user._id, date })).toBe(1);
});
it("reuses an existing measurement record for a resumable empty check-in draft", async () => {
  await call("put", `/records/${date}`, { version: 0, measurements: { weightKg: 79 } });
  const r = await call("put", `/checkins/${date}`, { version: 1, measurements: { weightKg: 79 } });
  expect(r.status).toBe(200);
  expect(r.body.data.checkin).toMatchObject({ active: true, completed: false });
  expect(await Progress.countDocuments({ ownerId: user._id, date })).toBe(1);
  expect((await call("get", `/records/${date}`)).body.data.version).toBe(2);
  expect((await call("get", "/summary")).body.data.nextDueDate).toBe(date);
  const empty = await draft("2026-09-19", {});
  expect(empty.checkin.active).toBe(true);
});
it("orders by local measurement date with bounded pagination", async () => {
  await draft("2026-09-18");
  await draft("2026-09-16");
  await draft("2026-09-19");
  const a = (await call("get", "/records?limit=2")).body.data;
  expect(a.items.map((r) => r.date)).toEqual(["2026-09-19", "2026-09-18"]);
  expect(a.next).toBe("2026-09-18");
  expect((await call("get", `/records?before=${a.next}`)).body.data.items[0].date).toBe(
    "2026-09-16"
  );
  expect((await call("get", "/summary")).body.data.latestWeight.date).toBe("2026-09-19");
});
it.each([
  {},
  { weightKg: 0 },
  { weightKg: 501 },
  { chestCm: 4 },
  { leftArmCm: 101 },
  { rightThighCm: 151 },
  { weightKg: "79" },
  { waistCm: Infinity },
  { weightKg: 79.001 },
  { status: "completed" },
])("rejects malformed measurements %j", async (measurements) => {
  expect((await call("put", `/records/${date}`, { version: 0, measurements })).status).toBe(400);
});
it.each(["2026-02-29", "2024-02-30", "2026-13-01", "bad", "2026-09-21"])(
  "rejects invalid/future date %s",
  async (d) => {
    expect(
      (await call("put", `/records/${d}`, { version: 0, measurements: { weightKg: 80 } })).status
    ).toBe(400);
  }
);
it("honors leap date, local midnight and saved timezone dates", async () => {
  now = "2024-02-28T18:29:59Z";
  expect(
    (await call("put", "/records/2024-02-29", { version: 0, measurements: { weightKg: 80 } }))
      .status
  ).toBe(400);
  now = "2024-02-28T18:30:00Z";
  expect(
    (await call("put", "/records/2024-02-29", { version: 0, measurements: { weightKg: 80 } }))
      .status
  ).toBe(200);
  await ByotProfile.updateOne({ ownerId: user._id }, { timezone: "America/Los_Angeles" });
  const r = (await call("get", "/records/2024-02-29")).body.data;
  expect(r).toMatchObject({ date: "2024-02-29", timezoneAtCreation: "Asia/Kolkata" });
});
it("requires weight and all three provider-verified photos before completion", async () => {
  let r = await draft();
  expect((await call("post", `/checkins/${date}/complete`, { version: r.version })).status).toBe(
    409
  );
  r = await addPhoto(r);
  expect((await call("post", `/checkins/${date}/complete`, { version: r.version })).status).toBe(
    409
  );
  r = await addPhoto(r, "side");
  r = await addPhoto(r, "back");
  r = await complete(r);
  expect(r.checkin.completed).toBe(true);
  expect((await call("get", "/summary")).body.data).toMatchObject({
    latestCompletedDate: date,
    nextDueDate: "2026-09-27",
    state: "upcoming",
  });
});
it("handles due today, overdue, late completion and historical backfill without overriding latest", async () => {
  expect((await call("get", "/summary")).body.data.state).toBe("due");
  now = "2026-09-23T12:00:00Z";
  expect((await call("get", "/summary")).body.data.reminder).toBe(
    `You missed your check-in on ${date}. Please check in.`
  );
  await complete(await full("2026-09-23"));
  await complete(await full("2026-09-09"));
  expect((await call("get", "/summary")).body.data.nextDueDate).toBe("2026-09-30");
});
it("completion is idempotent and concurrent submissions do not duplicate records", async () => {
  const r = await full();
  const key = randomUUID();
  const body = { version: r.version };
  const results = await Promise.all([
    call("post", `/checkins/${date}/complete`, body, key),
    call("post", `/checkins/${date}/complete`, body, key),
  ]);
  expect(results.map((r) => r.status)).toEqual([200, 200]);
  expect(await Progress.countDocuments({ ownerId: user._id, date })).toBe(1);
  expect(results[0].body.data.version).toBe(r.version + 1);
});
it("removing weight or a photo downgrades completion and recomputes reminders", async () => {
  let r = await complete(await full());
  r = (await call("delete", `/checkins/${date}/photos/front`, { version: r.version })).body.data;
  expect(r.checkin.completed).toBe(false);
  expect((await call("get", "/summary")).body.data.nextDueDate).toBe(date);
  r = await addPhoto(r);
  r = await complete(r);
  r = (await call("put", `/records/${date}`, { version: r.version, measurements: { waistCm: 81 } }))
    .body.data;
  expect(r.checkin.completed).toBe(false);
  expect(r.checkin.photos.back).not.toBeNull();
});
it("deleting check-in keeps independent measurements and queues every photo for cleanup", async () => {
  const r = await complete(await full());
  const removed = await call("delete", `/checkins/${date}`, { version: r.version });
  expect(removed.body.data.measurements.weightKg).toBe(79);
  expect(removed.body.data.checkin.active).toBe(false);
  const outcome = await photos.cleanup(100);
  expect(outcome.deleted).toBeGreaterThanOrEqual(3);
  expect(assets.size).toBe(0);
  expect((await call("get", "/summary")).body.data.latestCompletedDate).toBeNull();
});
it("rejects stale records and forged owner/completion fields", async () => {
  let r = await draft();
  expect(
    (await call("put", `/records/${date}`, { version: 0, measurements: { weightKg: 81 } })).status
  ).toBe(409);
  for (const key of [
    "ownerId",
    "role",
    "status",
    "completedAt",
    "checkin",
    "photos",
    "timezoneAtCreation",
  ])
    expect(
      (
        await call("put", `/checkins/${date}`, {
          version: r.version,
          measurements: { weightKg: 81 },
          [key]: "forged",
        })
      ).status
    ).toBe(400);
});
it("preserves the old photo when a replacement upload fails, then replaces and cleans old asset", async () => {
  let r = await addPhoto(await draft());
  const old = r.checkin.photos.front.id;
  const init = (await call("post", `/checkins/${date}/photos/front/init`, { version: r.version }))
    .body.data;
  provider.upload.mockRejectedValueOnce(new ApiError(502, "Test failed"));
  const fail = await request(app)
    .post(`/api/byot/progress/uploads/${init.attempt.id}/content`)
    .set("Authorization", `Bearer ${tokenFor(user)}`)
    .set("Content-Type", "image/jpeg")
    .send(jpeg);
  expect(fail.status).toBe(502);
  r = (await call("get", `/records/${date}`)).body.data;
  expect(r.checkin.photos.front.id).toBe(old);
  r = await addPhoto(r);
  expect(r.checkin.photos.front.id).not.toBe(old);
  await photos.cleanup(100);
  expect(assets.size).toBe(1);
});
it("rejects wrong-slot/foreign/replayed attachments and arbitrary asset references", async () => {
  let r = await draft();
  const init = (await call("post", `/checkins/${date}/photos/front/init`, { version: r.version }))
    .body.data;
  expect(
    (
      await call("post", `/checkins/${date}/photos/back/attach`, {
        version: init.record.version,
        attemptId: init.attempt.id,
      })
    ).status
  ).toBe(400);
  expect(
    (
      await call("post", `/checkins/${date}/photos/front/attach`, {
        version: init.record.version,
        attemptId: randomUUID(),
      })
    ).status
  ).toBe(404);
  expect(
    (
      await call("post", `/checkins/${date}/photos/front/init`, {
        version: init.record.version,
        publicId: "arbitrary",
      })
    ).status
  ).toBe(400);
  r = await addPhoto(init.record);
  expect(
    (
      await call("post", `/checkins/${date}/photos/front/attach`, {
        version: r.version,
        attemptId: r.checkin.photos.front.id,
      })
    ).status
  ).toBe(409);
});
it.each([
  { type: "upload" },
  { resource_type: "raw" },
  { format: "svg" },
  { bytes: 9 * 1024 * 1024 },
  { width: 3000 },
  { public_id: "wrong" },
  { access_control: [{ access_type: "anonymous" }] },
])("rejects provider metadata %j", async (values) => {
  const r = await draft();
  const init = (await call("post", `/checkins/${date}/photos/front/init`, { version: r.version }))
    .body.data;
  provider.upload.mockResolvedValueOnce({
    public_id: (await Attempt.findOne({ ownerId: user._id, id: init.attempt.id })).publicId,
    type: "authenticated",
    resource_type: "image",
    format: "jpg",
    asset_id: randomUUID(),
    bytes: 100,
    width: 400,
    height: 600,
    ...values,
  });
  expect(
    (
      await request(app)
        .post(`/api/byot/progress/uploads/${init.attempt.id}/content`)
        .set("Authorization", `Bearer ${tokenFor(user)}`)
        .set("Content-Type", "image/jpeg")
        .send(jpeg)
    ).status
  ).toBe(400);
  expect((await call("get", `/records/${date}`)).body.data.checkin.photos.front).toBeNull();
});
it("validates actual decoded images and strips EXIF", async () => {
  await expect(provider.sanitize(Buffer.from("<svg/>"), "image/jpeg")).rejects.toThrow();
  await expect(provider.sanitize(jpeg, "image/svg+xml")).rejects.toThrow();
  const big = await sharp({ create: { width: 9000, height: 32, channels: 3, background: "white" } })
    .png()
    .toBuffer();
  await expect(provider.sanitize(big, "image/png")).rejects.toThrow();
  const exif = await sharp(jpeg).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const output = await provider.sanitize(exif, "image/jpeg");
  const info = await sharp(output).metadata();
  expect(info.width).toBe(600);
  expect(info.height).toBe(400);
  expect(info.exif).toBeUndefined();
  await expect(
    provider.sanitize(Buffer.alloc(8 * 1024 * 1024 + 1), "image/jpeg")
  ).rejects.toThrow();
});
it("serves originals and aspect-preserving thumbnails only through authenticated no-store APIs", async () => {
  await addPhoto(await draft());
  const original = await call("get", `/checkins/${date}/photos/front/original`);
  const thumb = await call("get", `/checkins/${date}/photos/front/thumbnail`);
  expect(original.status).toBe(200);
  expect(original.headers["cache-control"]).toBe("private, no-store");
  expect(original.headers["referrer-policy"]).toBe("no-referrer");
  expect((await sharp(thumb.body).metadata()).height).toBe(360);
  expect((await call("get", `/checkins/${date}/photos/front/arbitrary`)).status).toBe(400);
});
it("persists failed cleanup and retries without removing referenced photos", async () => {
  const r = await addPhoto(await draft());
  await call("delete", `/checkins/${date}/photos/front`, { version: r.version });
  provider.destroy.mockRejectedValueOnce(new Error("Provider failure"));
  let result = await photos.cleanup(100);
  expect(result.failed).toBeGreaterThanOrEqual(1);
  expect(await Attempt.countDocuments({ ownerId: user._id, state: "cleanup", failures: 1 })).toBe(
    1
  );
  result = await photos.cleanup(100, new Date(Date.now() + 120000));
  expect(result.deleted).toBeGreaterThanOrEqual(1);
  expect(assets.size).toBe(0);
});
it("expired abandoned intents release pending quota and cannot attach", async () => {
  let r = await draft();
  for (let n = 0; n < 6; n++) {
    const init = await call("post", `/checkins/${date}/photos/front/init`, { version: r.version });
    expect(init.status).toBe(200);
    r = init.body.data.record;
  }
  expect(
    (await call("post", `/checkins/${date}/photos/front/init`, { version: r.version })).status
  ).toBe(429);
  await photos.cleanup(100, new Date(Date.now() + 21 * 60000));
  expect((await Budget.findOne({ ownerId: user._id })).pending).toHaveLength(0);
});
it.each(["ADMIN", "TRAINER", "CLIENT", null])(
  "denies %s on data, uploads and media",
  async (role) => {
    const actor = role ? await User.create({ name: role, email: uniqEmail(role), role }) : null;
    for (const [method, path, body] of [
      ["get", "/summary"],
      ["get", "/records"],
      ["put", `/records/${date}`, {}],
      ["post", `/checkins/${date}/complete`, {}],
      ["post", `/checkins/${date}/photos/front/init`, {}],
      ["post", `/uploads/${randomUUID()}/content`, {}],
      ["get", `/checkins/${date}/photos/front/original`],
      ["get", `/checkins/${date}/photos/front/thumbnail`],
    ])
      expect((await call(method, path, body, randomUUID(), actor)).status).toBe(role ? 403 : 401);
  }
);
it("isolates other owners and denies previously issued disabled sessions", async () => {
  const r = await addPhoto(await draft());
  const other = await User.create({ name: "Other", email: uniqEmail("other"), role: "BYOT" });
  await ByotProfile.create({
    ownerId: other._id,
    timezone: "UTC",
    checkInAnchorDate: "2026-09-13",
    onboardingCompletedAt: new Date(),
  });
  expect(
    (await call("get", `/records/${date}`, undefined, randomUUID(), other)).body.data.exists
  ).toBe(false);
  expect(
    (await call("get", `/checkins/${date}/photos/front/original`, undefined, randomUUID(), other))
      .status
  ).toBe(404);
  expect(
    (
      await call(
        "post",
        `/checkins/${date}/photos/front/attach`,
        { version: 0, attemptId: r.checkin.photos.front.id },
        randomUUID(),
        other
      )
    ).status
  ).toBe(404);
  const token = tokenFor(user);
  await User.updateOne({ _id: user._id }, { isActive: false });
  for (const path of [
    "/summary",
    `/checkins/${date}/photos/front/original`,
    `/checkins/${date}/photos/front/thumbnail`,
  ])
    expect(
      (await request(app).get(`/api/byot/progress${path}`).set("Authorization", `Bearer ${token}`))
        .status
    ).toBe(401);
});
it("does not expose asset metadata, ownership or private records via admin", async () => {
  await addPhoto(await draft());
  const r = (await call("get", `/records/${date}`)).body.data;
  expect(JSON.stringify(r)).not.toMatch(/publicId|assetId|signature|ownerId|receipts/);
  const admin = require("../../src/services/admin.service");
  expect((await admin.listTrainers()).some((r) => String(r._id) === String(user._id))).toBe(false);
  expect((await call("get", "/records?limit=101")).status).toBe(400);
  expect((await call("get", "/records?before=invalid")).status).toBe(400);
});
it("cleanup and attachment contend on the same version, preserving referenced assets", async () => {
  let r = await draft();
  const initialized = await photos.init(
    user._id,
    date,
    "front",
    { version: r.version },
    randomUUID()
  );
  await photos.upload(user._id, initialized.attempt.id, jpeg, "image/jpeg");
  const a = await Attempt.findOne({ ownerId: user._id, id: initialized.attempt.id }).lean();
  const meta = assets.get(a.publicId);
  let release, entered;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const arrived = new Promise((resolve) => {
    entered = resolve;
  });
  provider.inspect.mockImplementationOnce(async () => {
    entered();
    await gate;
    return meta;
  });
  const attaching = photos
    .attach(
      user._id,
      date,
      "front",
      { version: initialized.record.version, attemptId: a.id },
      randomUUID()
    )
    .catch((e) => e);
  await arrived;
  await photos.cleanup(100, new Date(Date.now() + 21 * 60000));
  release();
  expect((await attaching).statusCode).toBe(409);
  expect((await Progress.findOne({ ownerId: user._id, date })).checkin.photos.front).toBeNull();
  expect(assets.has(a.publicId)).toBe(false);
  r = await serviceRead();
  r = await addPhoto(r);
  await photos.cleanup(100, new Date(Date.now() + 21 * 60000));
  expect(assets.size).toBe(1);
  async function serviceRead() {
    return (await call("get", `/records/${date}`)).body.data;
  }
});
it("replays lost upload and attachment responses but rejects reused payloads", async () => {
  const r = await draft();
  const initKey = randomUUID();
  const init = await photos.init(user._id, date, "front", { version: r.version }, initKey);
  const replay = await photos.init(user._id, date, "front", { version: r.version }, initKey);
  expect(replay.attempt.id).toBe(init.attempt.id);
  await photos.upload(user._id, init.attempt.id, jpeg, "image/jpeg");
  expect((await photos.upload(user._id, init.attempt.id, jpeg, "image/jpeg")).state).toBe("ready");
  await expect(
    photos.upload(user._id, init.attempt.id, Buffer.from("other"), "image/jpeg")
  ).rejects.toThrow("another image");
  const key = randomUUID();
  const body = { version: init.record.version, attemptId: init.attempt.id };
  const first = await photos.attach(user._id, date, "front", body, key);
  const again = await photos.attach(user._id, date, "front", body, key);
  expect(again.version).toBe(first.version);
  expect(await Attempt.countDocuments({ ownerId: user._id })).toBe(1);
});
it("concurrent draft creation is unique and deletion recomputes from latest remaining completion", async () => {
  const body = { version: 0, measurements: { weightKg: 79 } };
  const key = randomUUID();
  const responses = await Promise.all([
    call("put", `/checkins/${date}`, body, key),
    call("put", `/checkins/${date}`, body, key),
  ]);
  expect(responses.map((r) => r.status)).toEqual([200, 200]);
  let r = responses[0].body.data;
  for (const s of ["front", "side", "back"]) r = await addPhoto(r, s);
  r = await complete(r);
  await complete(await full("2026-09-09"));
  await call("delete", `/checkins/${date}`, { version: r.version });
  expect((await call("get", "/summary")).body.data).toMatchObject({
    latestCompletedDate: "2026-09-09",
    nextDueDate: "2026-09-16",
    state: "overdue",
  });
});
it("does not serve a photo removed while its provider download is in flight", async () => {
  const r = await addPhoto(await draft());
  let release, entered;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const arrived = new Promise((resolve) => {
    entered = resolve;
  });
  provider.download.mockImplementationOnce(async () => {
    entered();
    await gate;
    return jpeg;
  });
  const delivery = photos.deliver(user._id, date, "front", "original").catch((e) => e);
  await arrived;
  await photos.remove(user._id, date, "front", { version: r.version }, randomUUID());
  release();
  expect((await delivery).statusCode).toBe(404);
});
it("persistently enforces the daily upload budget and requires weight after photos", async () => {
  let r = await full();
  r = (await call("put", `/checkins/${date}`, { version: r.version, measurements: {} })).body.data;
  expect((await call("post", `/checkins/${date}/complete`, { version: r.version })).status).toBe(
    409
  );
  await Budget.updateOne(
    { ownerId: user._id },
    { day: new Date().toISOString().slice(0, 10), count: 24, pending: [] }
  );
  expect(
    (await call("post", `/checkins/${date}/photos/front/init`, { version: r.version })).status
  ).toBe(429);
});
it("retries database bookkeeping failure after provider deletion without leaking quota", async () => {
  const r = await draft();
  const init = await photos.init(user._id, date, "front", { version: r.version }, randomUUID());
  const failing = jest
    .spyOn(Budget, "updateOne")
    .mockRejectedValueOnce(new Error("Temporary database failure"));
  const later = new Date(Date.now() + 21 * 60000);
  const first = await photos.cleanup(100, later);
  expect(first.failed).toBe(1);
  expect((await Attempt.findOne({ ownerId: user._id, id: init.attempt.id })).state).toBe("cleanup");
  expect((await Budget.findOne({ ownerId: user._id })).pending).toHaveLength(1);
  failing.mockRestore();
  const second = await photos.cleanup(100, new Date(later.getTime() + 120000));
  expect(second.deleted).toBe(1);
  expect((await Budget.findOne({ ownerId: user._id })).pending).toHaveLength(0);
});
