"use strict";

/**
 * Account linking — attach a Google account to an existing (trainer-created)
 * Client profile.
 *
 * The Client profile is the source of truth. The client may have been invited
 * with one email (`client.email` / `invite.email`) but sign in with a Google
 * account under a DIFFERENT email. Rather than rejecting or creating a second
 * profile, we attach the Google User to the existing profile.
 *
 * Invariants:
 *   - Relationships are keyed by clientId / userId — NEVER by email.
 *   - A Google User can be linked to at most ONE client profile.
 *   - A client profile can be linked to at most ONE Google User.
 *   - No new Client document is ever created here.
 */

const jwt = require("jsonwebtoken");
const { Client } = require("../schemas/Client.schema");
const { ClientInvite } = require("../schemas/ClientInvite.schema");
const { User } = require("../schemas/User.schema");
const ApiError = require("../utils/ApiError");
const { env } = require("../config/env");
const activityService = require("./activity.service");

const LINK_TOKEN_PURPOSE = "client_account_link";
const LINK_TOKEN_TTL = "15m";

const norm = (e) => String(e || "").trim().toLowerCase();

/**
 * Resolve an invite token to its { invite, client }, validating the token and
 * expiry. Throws ApiError on any problem. Resolves the client by the
 * authoritative clientId reference (legacy fallback to clientName).
 */
async function resolveInviteAndClient(inviteToken) {
  const invite = await ClientInvite.findOne({ inviteToken });
  if (!invite) throw new ApiError(404, "Invitation not found");
  if (invite.expiresAt < new Date()) throw new ApiError(410, "Invitation has expired");

  let client = null;
  if (invite.clientId) {
    client = await Client.findById(invite.clientId);
  }
  if (!client) {
    client = await Client.findOne({ trainerId: invite.trainerId, name: invite.clientName });
  }
  if (!client) throw new ApiError(404, "Linked client record was not found");

  return { invite, client };
}

/**
 * Security: a single Google account may only ever back one client profile.
 * Throws 409 if another client (not this one) already points at this user.
 */
async function assertGoogleNotLinkedElsewhere(googleUserId, clientId) {
  const other = await Client.findOne({
    userId: googleUserId,
    _id: { $ne: clientId },
  }).select("_id name");
  if (other) {
    throw new ApiError(409, "This Google account is already linked to another client profile.");
  }
}

/** The email the client was invited with (profile is source of truth). */
function invitedEmailOf(invite, client) {
  return norm(invite?.email || client?.email);
}

/**
 * Attach `googleUser` to `client`. Idempotent when already linked to the same
 * user. Records ACCOUNT_LINKED, plus EMAIL_MISMATCH_DETECTED + a trainer-facing
 * mismatch notification when the invited and Google emails differ.
 *
 * Returns { user, mismatch, invitedEmail, googleEmail }.
 */
async function performLink({ invite, client, googleUser }) {
  // Only a CLIENT Google account may back a client profile.
  if (googleUser.role !== "CLIENT") {
    throw new ApiError(409, "This Google account can't be used to activate a client profile.");
  }

  await assertGoogleNotLinkedElsewhere(googleUser._id, client._id);

  // Already linked to a DIFFERENT account → refuse (don't silently relink).
  if (client.userId && String(client.userId) !== String(googleUser._id)) {
    throw new ApiError(409, "This client profile is already linked to a different account.");
  }

  const invitedEmail = invitedEmailOf(invite, client);
  const googleEmail = norm(googleUser.email);
  const mismatch = Boolean(invitedEmail) && invitedEmail !== googleEmail;

  const alreadyLinked = client.userId && String(client.userId) === String(googleUser._id);

  if (!alreadyLinked) {
    // Attach — keyed by userId, never by email. All existing client
    // resources (workouts, nutrition, check-ins, photos, notes, activity)
    // continue to reference this same clientId, so nothing is detached.
    client.userId = googleUser._id;
    client.googleLinked = true;
    client.googleEmail = googleEmail;
    // Snapshot the invited address so a later trainer edit to `email`
    // doesn't retroactively erase the mismatch record. Fall back to the
    // current profile email when the invite carried none.
    if (invitedEmail) client.invitedEmail = invitedEmail;
    client.linkedAt = new Date();
    client.status = "ACTIVE";
    await client.save();

    if (invite) {
      invite.isUsed = true;
      await invite.save();
    }

    await activityService.record({
      trainerId: client.trainerId,
      clientId:  client._id,
      actorId:   googleUser._id,
      actorRole: "CLIENT",
      type:      "ACCOUNT_LINKED",
      entityId:  client._id,
      summary:   `${client.name} linked their Google account and activated`,
      metadata:  { invitedEmail, googleEmail, mismatch },
    });

    // Trainer-facing informational notification (surfaces in Recent Activity).
    if (mismatch) {
      await activityService.record({
        trainerId: client.trainerId,
        clientId:  client._id,
        actorId:   googleUser._id,
        actorRole: "CLIENT",
        type:      "EMAIL_MISMATCH_DETECTED",
        entityId:  client._id,
        summary:   `Email mismatch — ${client.name} was invited as ${invitedEmail} but linked Google ${googleEmail}`,
        metadata:  {
          invitedEmail,
          googleEmail,
          clientName: client.name,
          status: "Account Linked Successfully",
        },
      });
    }
  }

  return { user: googleUser, mismatch, invitedEmail, googleEmail };
}

// ── Short-lived link confirmation token ──────────────────────────────
// When emails differ we don't link immediately — we hand the browser a
// signed token identifying exactly which client + Google user to link, so
// the confirmation POST can't be tampered with (the client never supplies
// raw ids).

function signLinkToken({ inviteToken, clientId, googleUserId }) {
  return jwt.sign(
    {
      purpose: LINK_TOKEN_PURPOSE,
      inviteToken,
      clientId: String(clientId),
      googleUserId: String(googleUserId),
    },
    env.JWT_SECRET,
    { expiresIn: LINK_TOKEN_TTL }
  );
}

function verifyLinkToken(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new ApiError(400, "This linking session has expired. Please open your invite link again.");
  }
  if (decoded?.purpose !== LINK_TOKEN_PURPOSE) {
    throw new ApiError(400, "Invalid linking session.");
  }
  return decoded;
}

/**
 * Confirm a deferred (email-mismatch) link. Re-validates everything from the
 * signed token — never trusts client-supplied ids — then performs the link.
 * Returns { user, mismatch, invitedEmail, googleEmail }.
 */
async function confirmDeferredLink(linkToken) {
  const { inviteToken, clientId, googleUserId } = verifyLinkToken(linkToken);

  const { invite, client } = await resolveInviteAndClient(inviteToken);
  if (String(client._id) !== String(clientId)) {
    throw new ApiError(400, "Linking session does not match this invite.");
  }

  const googleUser = await User.findById(googleUserId);
  if (!googleUser) throw new ApiError(404, "Google account not found.");
  if (!googleUser.isActive) throw new ApiError(403, "This account is disabled.");

  return performLink({ invite, client, googleUser });
}

module.exports = {
  resolveInviteAndClient,
  assertGoogleNotLinkedElsewhere,
  invitedEmailOf,
  performLink,
  signLinkToken,
  verifyLinkToken,
  confirmDeferredLink,
};
