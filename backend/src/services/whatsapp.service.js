"use strict";

/**
 * whatsapp.service.js — thin wrapper over the Meta WhatsApp Cloud API.
 *
 * Phase 3A foundation: send a single text message. No reminders,
 * automations, campaigns or broadcasts. All Graph API calls are centralized
 * here so callers never touch HTTP details or secrets.
 *
 * Secrets live in env (backend only) and are never returned to callers:
 *   WHATSAPP_ACCESS_TOKEN     — permanent/system-user token
 *   WHATSAPP_PHONE_NUMBER_ID  — sender phone number id
 *   WHATSAPP_VERIFY_TOKEN     — reserved for the inbound webhook (later)
 *
 * Errors are normalised to ApiError with a meaningful status/message and
 * always logged. The service never throws a raw/unhandled error, so the
 * request flow that calls it can degrade gracefully.
 */

const logger = require("../config/logger");
const { env } = require("../config/env");
const ApiError = require("../utils/ApiError");

const GRAPH_VERSION = "v21.0";
const REQUEST_TIMEOUT_MS = 10_000;

/** True when all credentials needed to send are present. */
function isConfigured() {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Normalise a phone number to the digits-only form the Cloud API expects
 * (E.164 without the leading "+"). Returns "" when nothing usable remains.
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return "";
  // Keep digits only; a leading "+" and spaces/dashes/parens are dropped.
  return phone.replace(/\D/g, "");
}

/**
 * Validate a phone number for WhatsApp delivery. E.164 allows up to 15
 * digits; we require at least 8 to reject obviously-too-short inputs.
 */
function isValidPhone(phone) {
  const digits = normalizePhone(phone);
  return digits.length >= 8 && digits.length <= 15;
}

/**
 * Send a plain text WhatsApp message.
 *
 * @param {{ to: string, body: string }} params
 * @returns {Promise<{ messageId: string|null, to: string }>}
 * @throws {ApiError} 503 not configured · 400 invalid phone · 504 timeout ·
 *                    502 upstream API failure
 */
async function sendTextMessage({ to, body }) {
  if (!isConfigured()) {
    throw new ApiError(503, "WhatsApp is not configured on the server");
  }
  if (!isValidPhone(to)) {
    throw new ApiError(400, "A valid phone number is required to send WhatsApp messages");
  }
  if (!body || !String(body).trim()) {
    throw new ApiError(400, "Message body is required");
  }

  const recipient = normalizePhone(to);
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: { preview_url: true, body: String(body) },
  };

  // Bound the request so a hung upstream can never stall the caller.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      logger.error("[whatsapp] request timed out", { to: recipient });
      throw new ApiError(504, "WhatsApp request timed out. Please try again.");
    }
    logger.error("[whatsapp] network error", { message: err?.message });
    throw new ApiError(502, "Could not reach WhatsApp. Please try again later.");
  }
  clearTimeout(timer);

  // Parse defensively — Meta returns JSON on both success and error.
  let data = null;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const apiMsg = data?.error?.message || `WhatsApp API returned ${res.status}`;
    logger.error("[whatsapp] send failed", {
      status: res.status,
      to: recipient,
      error: data?.error,
    });
    // Map Meta's auth/permission errors to 502 for the caller — it's an
    // upstream/config problem, not the client's request being malformed.
    throw new ApiError(502, `WhatsApp delivery failed: ${apiMsg}`);
  }

  const messageId = data?.messages?.[0]?.id || null;
  logger.info("[whatsapp] message sent", { to: recipient, messageId });
  return { messageId, to: recipient };
}

module.exports = { sendTextMessage, isConfigured, isValidPhone, normalizePhone };
