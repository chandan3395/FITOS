"use strict";

const {
  TRAINER,
  CLIENT,
  MESSAGE_STATUSES,
  MAX_BODY_LENGTH,
  otherRole,
  recipientRoleOf,
  isParticipantRole,
  emptyUnread,
  unreadCountFor,
  canAdvanceStatus,
  normalizeBody,
  buildPreview,
  applyIncomingToUnread,
  clearUnreadFor,
} = require("../../src/utils/messaging");

describe("role helpers", () => {
  it("otherRole flips trainer<->client", () => {
    expect(otherRole(TRAINER)).toBe(CLIENT);
    expect(otherRole(CLIENT)).toBe(TRAINER);
  });
  it("recipientRoleOf is the OTHER side of the sender", () => {
    expect(recipientRoleOf(TRAINER)).toBe(CLIENT);
    expect(recipientRoleOf(CLIENT)).toBe(TRAINER);
  });
  it("isParticipantRole only accepts the two roles", () => {
    expect(isParticipantRole(TRAINER)).toBe(true);
    expect(isParticipantRole(CLIENT)).toBe(true);
    expect(isParticipantRole("ADMIN")).toBe(false);
    expect(isParticipantRole(undefined)).toBe(false);
  });
});

describe("unread bookkeeping", () => {
  it("emptyUnread is a fresh zeroed pair", () => {
    expect(emptyUnread()).toEqual({ trainer: 0, client: 0 });
  });

  it("unreadCountFor reads a role's count, defaulting to 0", () => {
    expect(unreadCountFor({ unread: { trainer: 3, client: 0 } }, TRAINER)).toBe(3);
    expect(unreadCountFor({ unread: { trainer: 3, client: 0 } }, CLIENT)).toBe(0);
    expect(unreadCountFor({}, CLIENT)).toBe(0);
    expect(unreadCountFor(null, TRAINER)).toBe(0);
  });

  it("applyIncomingToUnread bumps the RECIPIENT only, immutably", () => {
    const before = { trainer: 1, client: 2 };
    // a message FROM the client increments the TRAINER's unread
    const after = applyIncomingToUnread(before, CLIENT);
    expect(after).toEqual({ trainer: 2, client: 2 });
    expect(before).toEqual({ trainer: 1, client: 2 }); // untouched
  });

  it("applyIncomingToUnread from trainer increments client", () => {
    expect(applyIncomingToUnread({ trainer: 0, client: 0 }, TRAINER)).toEqual({ trainer: 0, client: 1 });
  });

  it("applyIncomingToUnread tolerates a missing unread map", () => {
    expect(applyIncomingToUnread(undefined, CLIENT)).toEqual({ trainer: 1, client: 0 });
  });

  it("clearUnreadFor zeroes one side, immutably, keeping the other", () => {
    const before = { trainer: 5, client: 4 };
    const after = clearUnreadFor(before, TRAINER);
    expect(after).toEqual({ trainer: 0, client: 4 });
    expect(before).toEqual({ trainer: 5, client: 4 });
  });
});

describe("status lifecycle (forward-only)", () => {
  it("exposes the ordered statuses", () => {
    expect(MESSAGE_STATUSES).toEqual(["sent", "delivered", "read"]);
  });
  it("advances only forward", () => {
    expect(canAdvanceStatus("sent", "delivered")).toBe(true);
    expect(canAdvanceStatus("sent", "read")).toBe(true);
    expect(canAdvanceStatus("delivered", "read")).toBe(true);
  });
  it("rejects equal or backwards transitions", () => {
    expect(canAdvanceStatus("sent", "sent")).toBe(false);
    expect(canAdvanceStatus("delivered", "sent")).toBe(false);
    expect(canAdvanceStatus("read", "delivered")).toBe(false);
    expect(canAdvanceStatus("read", "read")).toBe(false);
  });
  it("rejects unknown statuses", () => {
    expect(canAdvanceStatus("sent", "bogus")).toBe(false);
    expect(canAdvanceStatus("bogus", "read")).toBe(false);
  });
});

describe("normalizeBody", () => {
  it("trims and returns a valid body", () => {
    expect(normalizeBody("  hi there  ")).toBe("hi there");
  });
  it("rejects an empty / whitespace-only body", () => {
    expect(() => normalizeBody("   ")).toThrow(/required/i);
    expect(() => normalizeBody("")).toThrow(/required/i);
    try { normalizeBody(""); } catch (e) { expect(e.code).toBe("EMPTY_BODY"); }
  });
  it("rejects a non-string body", () => {
    expect(() => normalizeBody(undefined)).toThrow();
    expect(() => normalizeBody(42)).toThrow();
  });
  it("rejects a body over the max length", () => {
    const tooLong = "x".repeat(MAX_BODY_LENGTH + 1);
    expect(() => normalizeBody(tooLong)).toThrow(/exceeds/i);
    try { normalizeBody(tooLong); } catch (e) { expect(e.code).toBe("BODY_TOO_LONG"); }
  });
  it("accepts a body at exactly the max length", () => {
    const atMax = "x".repeat(MAX_BODY_LENGTH);
    expect(normalizeBody(atMax)).toHaveLength(MAX_BODY_LENGTH);
  });
});

describe("buildPreview", () => {
  it("snapshots body + sender + createdAt", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    expect(buildPreview({ body: "yo", senderId: "u1", senderRole: TRAINER, createdAt })).toEqual({
      body: "yo",
      senderId: "u1",
      senderRole: TRAINER,
      createdAt,
    });
  });
  it("defaults createdAt when absent and returns undefined for no message", () => {
    expect(buildPreview(null)).toBeUndefined();
    const p = buildPreview({ body: "x", senderId: "u1", senderRole: CLIENT });
    expect(p.createdAt).toBeInstanceOf(Date);
  });
});
