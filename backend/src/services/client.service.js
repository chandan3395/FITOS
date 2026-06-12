"use strict";

const crypto = require("crypto");
const mongoose = require("mongoose");
const { Client } = require("../schemas/Client.schema");
const { ClientInvite } = require("../schemas/ClientInvite.schema");
const { User } = require("../schemas/User.schema");
const ApiError = require("../utils/ApiError");
const { env } = require("../config/env");
const { validateClientPayload } = require("../validators/clientPayload.validator");
const activityService = require("./activity.service");
const whatsappService = require("./whatsapp.service");

const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

/**
 * Mint a fresh activation invite for a client and return the shareable URL.
 * Centralised so create + (re)send share identical token/expiry semantics.
 */
async function issueInvite(client) {
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const expiresAt   = new Date(Date.now() + INVITE_TTL_MS);

  await ClientInvite.create({
    trainerId:  client.trainerId,
    clientId:   client._id,
    clientName: client.name,
    phone:      client.phone,
    email:      client.email,
    inviteToken,
    expiresAt,
  });

  const activationUrl = `${env.CLIENT_ORIGIN}/activate/${inviteToken}`;
  return { token: inviteToken, expiresAt, activationUrl };
}

/** Build the activation WhatsApp/text message body for a client. */
function buildInviteMessage(client, activationUrl) {
  const firstName = (client.name || "there").trim().split(/\s+/)[0];
  return (
    `Hi ${firstName},\n\n` +
    `Your FITOS account is ready.\n\n` +
    `Activate your account:\n${activationUrl}\n\n` +
    `This link expires in 72 hours.`
  );
}

// Single source of truth for fields the wizard collects AND the schema
// persists. The validator gates every field before it gets here; the
// service simply copies. Keep this list aligned with `Client.schema.js`
// — the `clientFields.contract.test.js` suite enforces the alignment.
const PERSISTED_CLIENT_FIELDS = [
  // Identity
  "name", "phone", "email", "gender", "dob", "age", "city", "occupation",

  // Body
  "height", "startingWeight", "bodyFat",

  // Health history
  "medicalConditions", "medications", "pastInjuries", "allergies",

  // Goal & program
  "goal", "targetWeight", "targetBodyFat", "timeline", "goalDescription",
  "startDate", "duration", "sessionFrequency",

  // Nutrition
  "diet", "calories", "protein", "carbs", "fats",
  "mealsPerDay", "waterTarget", "cheatMeals",
  "foodDislikes", "eatingHabits",

  // Trainer notes
  "privateNotes",
];

// Editing any of these after an invite was issued means the existing invite
// link may no longer represent the client → flag it for regeneration.
const ACTIVATION_FIELDS = ["email", "name", "phone"];

/**
 * Guard against duplicate emails before a client is created (or its email
 * changed). An email may belong to at most one account across the platform —
 * any User (admin/trainer/activated client) or any non-deleted Client record.
 * Throws 409 with a trainer-facing message; callers must let it propagate so
 * no client/invite is created on conflict.
 */
async function assertEmailAvailable(email, { excludeClientId, excludeUserId } = {}) {
  if (!email) return;
  const normalized = String(email).toLowerCase().trim();
  if (!normalized) return;

  const CONFLICT_MSG =
    "This email is already associated with another account. Please use a different email.";

  // A match on the client's OWN linked Google user isn't a conflict — e.g. the
  // trainer is aligning the profile email with the account the client signed
  // in with. Any other User match is a genuine duplicate.
  const userMatch = await User.findOne({ email: normalized }).select("_id");
  if (userMatch && String(userMatch._id) !== String(excludeUserId || "")) {
    throw new ApiError(409, CONFLICT_MSG);
  }

  const clientQuery = { email: normalized, isDeleted: { $ne: true } };
  if (excludeClientId) clientQuery._id = { $ne: excludeClientId };
  const clientMatch = await Client.findOne(clientQuery).select("_id");
  if (clientMatch) throw new ApiError(409, CONFLICT_MSG);
}

/**
 * Load a client the caller is allowed to write: the owning TRAINER, or any
 * ADMIN. Centralises the ownership + soft-delete + admin-fallback pattern.
 */
async function loadOwnedClient(id, user) {
  return getClientForTrainer(id, user).catch(async (err) => {
    if (user.role === "ADMIN") {
      if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid client id");
      const c = await Client.findById(id);
      if (!c || c.isDeleted) throw new ApiError(404, "Client not found");
      return c;
    }
    throw err;
  });
}

async function resolveTrainerId(user, body) {
  if (user.role === "ADMIN") {
    if (!body.trainerId) {
      throw new ApiError(400, "trainerId is required when admin creates a client");
    }
    if (!mongoose.isValidObjectId(body.trainerId)) {
      throw new ApiError(400, "Invalid trainerId");
    }
    const trainer = await User.findOne({ _id: body.trainerId, role: "TRAINER" });
    if (!trainer) {
      throw new ApiError(404, "Trainer not found");
    }
    return trainer._id;
  }

  // TRAINER — never trust request body
  return user._id;
}

async function createClient(user, body) {
  // Authoritative validation — backend NEVER trusts the frontend.
  const result = validateClientPayload(body);
  if (!result.ok) {
    throw ApiError.validation(result.errors);
  }
  const value = result.value;

  // Block duplicate emails before anything is persisted — no client record
  // and no invite are created on conflict.
  await assertEmailAvailable(value.email);

  // resolveTrainerId still consults the raw body for `trainerId` (admin
  // case) — that field intentionally bypasses the client validator
  // because it's an authorization concern, not a client-data concern.
  const trainerId = await resolveTrainerId(user, body);

  // New clients start PENDING. They flip to ACTIVE only once they activate
  // their invite by linking a Google account (see accountLinking.service).
  const data = { trainerId, status: "PENDING" };
  PERSISTED_CLIENT_FIELDS.forEach((field) => {
    if (value[field] !== undefined) data[field] = value[field];
  });

  const client = await Client.create(data);

  // Auto-issue an activation invite. The trainer shares the resulting URL
  // (or sends it over WhatsApp via the dedicated invite endpoint).
  const invite = await issueInvite(client);

  // Two activity events: the client record itself, and the invite that
  // automatically follows. They share a transaction in the user's mind
  // even though they're two distinct domain operations.
  await activityService.record({
    trainerId,
    clientId:  client._id,
    actorId:   user._id,
    actorRole: user.role,
    type:      "CLIENT_CREATED",
    entityId:  client._id,
    summary:   `Added ${client.name} as a client`,
  });
  await activityService.record({
    trainerId,
    clientId:  client._id,
    actorId:   user._id,
    actorRole: user.role,
    type:      "INVITE_SENT",
    entityId:  client._id,
    summary:   `Activation link generated for ${client.name}`,
    metadata:  { expiresAt: invite.expiresAt },
  });

  return { client, invite };
}

// Phase 5 — Privacy rule:
// Admins are platform operators and MUST NOT access individual client records.
// Only the owning TRAINER may list or retrieve clients. CLIENT role is forbidden.

async function listClientsForTrainer(trainerUser) {
  // Soft-deleted clients are hidden from the active list and from search.
  return Client.find({ trainerId: trainerUser._id, isDeleted: { $ne: true } }).sort({ createdAt: -1 });
}

async function getClientForTrainer(clientId, trainerUser) {
  if (!mongoose.isValidObjectId(clientId)) {
    throw new ApiError(400, "Invalid client id");
  }

  const client = await Client.findById(clientId);
  // A soft-deleted client behaves as if it no longer exists.
  if (!client || client.isDeleted) {
    throw new ApiError(404, "Client not found");
  }

  // Ownership check — trainer can only see their own clients.
  if (String(client.trainerId) !== String(trainerUser._id)) {
    throw new ApiError(403, "Forbidden");
  }

  return client;
}

/**
 * PATCH /api/clients/:id
 * Update editable client fields. Ownership: trainer can only touch
 * their own client; admin can touch any. Trainer cannot reassign
 * `trainerId` via this endpoint.
 */
async function updateClient(id, user, body) {
  // Partial validation — only fields present in the body are checked, but
  // every field present must still satisfy its rules.
  const result = validateClientPayload(body, { partial: true });
  if (!result.ok) {
    throw ApiError.validation(result.errors);
  }
  const value = result.value;

  const client = await getClientForTrainer(id, user).catch(async (err) => {
    if (user.role === "ADMIN") {
      if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid client id");
      const c = await Client.findById(id);
      if (!c || c.isDeleted) throw new ApiError(404, "Client not found");
      return c;
    }
    throw err;
  });

  // PATCH may touch any persisted onboarding field plus `status`.
  // Relationships are keyed by clientId — editing `email` here only rewrites
  // the profile's contact address; it never detaches workouts, nutrition
  // plans, check-ins, photos, or activity, and never spawns a new client.
  const PATCHABLE = [...PERSISTED_CLIENT_FIELDS, "status"];
  const previousEmail = String(client.email || "").toLowerCase();

  // If the email is changing, it must not collide with any other account.
  if (value.email !== undefined) {
    const nextEmail = String(value.email).toLowerCase();
    if (nextEmail !== previousEmail) {
      await assertEmailAvailable(nextEmail, { excludeClientId: client._id, excludeUserId: client.userId });
    }
  }

  // Track which persisted fields the payload actually changes, so the
  // activity feed reflects edits without firing on no-op saves (e.g. an
  // archive request that only carries `status`).
  const changedDetailFields = [];
  for (const k of PATCHABLE) {
    if (value[k] === undefined) continue;
    const before = client[k] instanceof Date ? client[k].getTime() : client[k];
    client[k] = value[k];
    const after = client[k] instanceof Date ? client[k].getTime() : client[k];
    if (k !== "status" && String(before ?? "") !== String(after ?? "")) {
      changedDetailFields.push(k);
    }
  }

  // Editing an activation-relevant field on a not-yet-activated client means
  // the outstanding invite link is stale — flag it so the trainer is prompted
  // to regenerate. (Activated clients no longer use invites.)
  const activationChanged = changedDetailFields.some((f) => ACTIVATION_FIELDS.includes(f));
  if (activationChanged && client.status === "PENDING") {
    client.inviteNeedsRegeneration = true;
  }

  await client.save();

  const newEmail = String(client.email || "").toLowerCase();
  const emailChanged = value.email !== undefined && newEmail !== previousEmail;

  if (emailChanged) {
    await activityService.record({
      trainerId: client.trainerId,
      clientId:  client._id,
      actorId:   user._id,
      actorRole: user.role,
      type:      "CLIENT_EMAIL_UPDATED",
      entityId:  client._id,
      summary:   `Updated ${client.name}'s email to ${client.email}`,
      metadata:  { previousEmail, newEmail },
    });
  }

  // Log a details update for any non-email field change. Email gets its own
  // dedicated event above, so we don't double-count it here.
  const nonEmailChanges = changedDetailFields.filter((f) => f !== "email");
  if (nonEmailChanges.length > 0) {
    await activityService.record({
      trainerId: client.trainerId,
      clientId:  client._id,
      actorId:   user._id,
      actorRole: user.role,
      type:      "CLIENT_DETAILS_UPDATED",
      entityId:  client._id,
      summary:   `Updated ${client.name}'s profile (${nonEmailChanges.join(", ")})`,
      metadata:  { fields: nonEmailChanges },
    });
  }

  return client;
}

/**
 * DELETE /api/clients/:id
 * Soft-delete a client. Non-destructive: the document and all related
 * records (workouts, nutrition, check-ins, photos, activity) remain keyed
 * by clientId, but the client is hidden from lists/detail/search and loses
 * portal access (workout/nutrition reads resolve the client with an
 * isDeleted guard). Reversible by clearing the flag. Records CLIENT_DELETED.
 */
async function deleteClient(id, user) {
  const client = await getClientForTrainer(id, user).catch(async (err) => {
    if (user.role === "ADMIN") {
      if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid client id");
      const c = await Client.findById(id);
      if (!c || c.isDeleted) throw new ApiError(404, "Client not found");
      return c;
    }
    throw err;
  });

  client.isDeleted = true;
  client.deletedAt = new Date();
  client.deletedBy = user._id;
  await client.save();

  await activityService.record({
    trainerId: client.trainerId,
    clientId:  client._id,
    actorId:   user._id,
    actorRole: user.role,
    type:      "CLIENT_DELETED",
    entityId:  client._id,
    summary:   `Deleted client ${client.name}`,
    metadata:  { deletedAt: client.deletedAt },
  });

  return { _id: client._id, deleted: true };
}

/**
 * POST /api/clients/:id/invite/regenerate
 * Issue a fresh invite link and invalidate every outstanding one, so the
 * link the trainer shares always reflects the latest client info. No manual
 * DB cleanup required. Records INVITE_INVALIDATED (when prior links existed)
 * and INVITE_REGENERATED, stamps lastInviteSentAt, and clears the
 * needs-regeneration flag.
 */
async function regenerateInvite(id, user) {
  const client = await loadOwnedClient(id, user);

  // 1. Invalidate every still-valid prior invite (expire + mark used) so old
  //    links stop activating. Idempotent; safe if none exist.
  const now = new Date();
  const invalidation = await ClientInvite.updateMany(
    { clientId: client._id, expiresAt: { $gt: now } },
    { $set: { expiresAt: now, isUsed: true } }
  );
  const invalidatedCount = invalidation.modifiedCount || 0;
  if (invalidatedCount > 0) {
    await activityService.record({
      trainerId: client.trainerId,
      clientId:  client._id,
      actorId:   user._id,
      actorRole: user.role,
      type:      "INVITE_INVALIDATED",
      entityId:  client._id,
      summary:   `Invalidated ${invalidatedCount} previous invite link${invalidatedCount === 1 ? "" : "s"} for ${client.name}`,
      metadata:  { count: invalidatedCount },
    });
  }

  // 2-5. Mint a fresh token/URL, persist, refresh timestamps, clear the flag.
  const invite = await issueInvite(client);
  client.inviteNeedsRegeneration = false;
  client.lastInviteSentAt = new Date();
  await client.save();

  // 6. Activity log.
  await activityService.record({
    trainerId: client.trainerId,
    clientId:  client._id,
    actorId:   user._id,
    actorRole: user.role,
    type:      "INVITE_REGENERATED",
    entityId:  client._id,
    summary:   `Generated a fresh invite link for ${client.name}`,
    metadata:  { expiresAt: invite.expiresAt },
  });

  return { client, invite };
}

/**
 * POST /api/clients/:id/invite
 * (Re)send the activation invite to a client over WhatsApp.
 *
 * Validates the client has a usable phone, mints a fresh 72h invite, sends
 * the text via the WhatsApp service, and — only on success — stamps
 * `lastInviteSentAt` and records a WHATSAPP_INVITE_SENT activity. Any
 * delivery failure surfaces as a meaningful ApiError without leaving a
 * misleading "sent" timestamp behind.
 */
async function sendWhatsAppInvite(id, user) {
  const client = await getClientForTrainer(id, user).catch(async (err) => {
    if (user.role === "ADMIN") {
      if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid client id");
      const c = await Client.findById(id);
      if (!c || c.isDeleted) throw new ApiError(404, "Client not found");
      return c;
    }
    throw err;
  });

  // Validation gate — only send when a valid phone exists.
  if (!client.phone) {
    throw new ApiError(400, "This client has no phone number on file");
  }
  if (!whatsappService.isValidPhone(client.phone)) {
    throw new ApiError(400, "The client's phone number is not valid for WhatsApp");
  }

  const invite  = await issueInvite(client);
  const message = buildInviteMessage(client, invite.activationUrl);

  // Delivery — throws a meaningful ApiError on failure/timeout; we let it
  // propagate so the timestamp/activity below only run on success.
  const result = await whatsappService.sendTextMessage({ to: client.phone, body: message });

  client.lastInviteSentAt = new Date();
  await client.save();

  await activityService.record({
    trainerId: client.trainerId,
    clientId:  client._id,
    actorId:   user._id,
    actorRole: user.role,
    type:      "WHATSAPP_INVITE_SENT",
    entityId:  client._id,
    summary:   `WhatsApp activation invite sent to ${client.name}`,
    metadata:  { messageId: result.messageId, expiresAt: invite.expiresAt },
  });

  return {
    client,
    invite,
    whatsapp: { messageId: result.messageId, sentAt: client.lastInviteSentAt },
  };
}

module.exports = {
  createClient,
  listClientsForTrainer,
  getClientForTrainer,
  updateClient,
  deleteClient,
  regenerateInvite,
  sendWhatsAppInvite,
};
