"use strict";

const presence = require("../../src/socket/presence");

const USER_A = "507f1f77bcf86cd799439011";
const USER_B = "607f1f77bcf86cd799439022";

beforeEach(() => presence._reset());

describe("presence registry", () => {
  it("reports a user offline until a socket connects", () => {
    expect(presence.isOnline(USER_A)).toBe(false);
  });

  it("addConnection returns true only on the offline→online transition", () => {
    expect(presence.addConnection(USER_A, "s1")).toBe(true); // first socket → came online
    expect(presence.isOnline(USER_A)).toBe(true);
    expect(presence.addConnection(USER_A, "s2")).toBe(false); // second socket, still online
  });

  it("stays online until the LAST socket disconnects (ref-counted)", () => {
    presence.addConnection(USER_A, "s1");
    presence.addConnection(USER_A, "s2");

    expect(presence.removeConnection(USER_A, "s1")).toBe(false); // still has s2
    expect(presence.isOnline(USER_A)).toBe(true);

    expect(presence.removeConnection(USER_A, "s2")).toBe(true); // now fully offline
    expect(presence.isOnline(USER_A)).toBe(false);
  });

  it("removing an unknown socket is a safe no-op", () => {
    expect(presence.removeConnection(USER_A, "ghost")).toBe(false);
    expect(presence.isOnline(USER_A)).toBe(false);
  });

  it("tracks multiple users independently", () => {
    presence.addConnection(USER_A, "s1");
    presence.addConnection(USER_B, "s2");
    expect(presence.onlineUserIds().sort()).toEqual([USER_A, USER_B].sort());

    presence.removeConnection(USER_A, "s1");
    expect(presence.isOnline(USER_A)).toBe(false);
    expect(presence.isOnline(USER_B)).toBe(true);
    expect(presence.onlineUserIds()).toEqual([USER_B]);
  });

  it("accepts ObjectId-ish values by stringifying the key", () => {
    const oid = { toString: () => USER_A };
    presence.addConnection(oid, "s1");
    expect(presence.isOnline(USER_A)).toBe(true);
    expect(presence.isOnline(oid)).toBe(true);
  });
});
