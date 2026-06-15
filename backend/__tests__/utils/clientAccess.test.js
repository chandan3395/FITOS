"use strict";

// Mock the Client schema so we can drive findById / findOne without a DB.
jest.mock("../../src/schemas/Client.schema", () => ({
  Client: { findById: jest.fn(), findOne: jest.fn() },
}));

const { Client } = require("../../src/schemas/Client.schema");
const ApiError = require("../../src/utils/ApiError");
const {
  assertObjectId,
  assertTrainer,
  resolveClientForUser,
  assertClientAccess,
  resolveCurrentClient,
} = require("../../src/utils/clientAccess");

const OID = "507f1f77bcf86cd799439011"; // valid ObjectId string
const TRAINER_ID = "607f1f77bcf86cd799439022";
const CLIENT_USER_ID = "707f1f77bcf86cd799439033";

const trainer = { _id: TRAINER_ID, role: "TRAINER" };
const admin = { _id: "a07f1f77bcf86cd799439044", role: "ADMIN" };
const clientUser = { _id: CLIENT_USER_ID, role: "CLIENT" };

const makeClient = (over = {}) => ({
  _id: OID,
  trainerId: TRAINER_ID,
  userId: CLIENT_USER_ID,
  isDeleted: false,
  ...over,
});

const expectStatus = async (promise, status) => {
  await expect(promise).rejects.toMatchObject({ statusCode: status });
  await expect(promise).rejects.toBeInstanceOf(ApiError);
};

beforeEach(() => {
  Client.findById.mockReset();
  Client.findOne.mockReset();
});

describe("assertObjectId", () => {
  it("throws 400 on invalid id", () => {
    expect(() => assertObjectId("not-an-id", "clientId")).toThrow(ApiError);
    try { assertObjectId("bad", "clientId"); } catch (e) { expect(e.statusCode).toBe(400); }
  });
  it("passes on valid id", () => {
    expect(() => assertObjectId(OID, "clientId")).not.toThrow();
  });
});

describe("assertTrainer", () => {
  it("throws 403 for non-trainer", () => {
    try { assertTrainer(clientUser); } catch (e) { expect(e.statusCode).toBe(403); }
    expect(() => assertTrainer(admin)).toThrow(ApiError);
  });
  it("passes for trainer", () => {
    expect(() => assertTrainer(trainer)).not.toThrow();
  });
});

describe("resolveClientForUser", () => {
  it("400 on invalid id (no DB hit)", async () => {
    await expectStatus(resolveClientForUser(trainer, "bad"), 400);
    expect(Client.findById).not.toHaveBeenCalled();
  });

  it("404 when client missing", async () => {
    Client.findById.mockResolvedValue(null);
    await expectStatus(resolveClientForUser(trainer, OID), 404);
  });

  it("404 when soft-deleted AND excludeDeleted=true", async () => {
    Client.findById.mockResolvedValue(makeClient({ isDeleted: true }));
    await expectStatus(resolveClientForUser(trainer, OID, { excludeDeleted: true }), 404);
  });

  it("does NOT 404 on soft-deleted when excludeDeleted=false (returns to owner)", async () => {
    Client.findById.mockResolvedValue(makeClient({ isDeleted: true }));
    await expect(resolveClientForUser(trainer, OID, { excludeDeleted: false })).resolves.toBeTruthy();
  });

  it("trainer who owns passes; non-owning trainer 403", async () => {
    Client.findById.mockResolvedValue(makeClient());
    await expect(resolveClientForUser(trainer, OID)).resolves.toBeTruthy();

    Client.findById.mockResolvedValue(makeClient({ trainerId: "999f1f77bcf86cd799439099" }));
    await expectStatus(resolveClientForUser(trainer, OID), 403);
  });

  it("admin gated by allowAdmin", async () => {
    Client.findById.mockResolvedValue(makeClient());
    await expectStatus(resolveClientForUser(admin, OID, { allowAdmin: false }), 403);
    Client.findById.mockResolvedValue(makeClient());
    await expect(resolveClientForUser(admin, OID, { allowAdmin: true })).resolves.toBeTruthy();
  });

  it("client gated by allowClient + ownership", async () => {
    Client.findById.mockResolvedValue(makeClient());
    await expectStatus(resolveClientForUser(clientUser, OID, { allowClient: false }), 403);

    Client.findById.mockResolvedValue(makeClient());
    await expect(resolveClientForUser(clientUser, OID, { allowClient: true })).resolves.toBeTruthy();

    Client.findById.mockResolvedValue(makeClient({ userId: "111f1f77bcf86cd799439011" }));
    await expectStatus(resolveClientForUser(clientUser, OID, { allowClient: true }), 403);
  });
});

describe("assertClientAccess (checkin/meal/progress variant)", () => {
  it("admin always allowed", async () => {
    Client.findById.mockResolvedValue(makeClient());
    await expect(assertClientAccess(OID, admin)).resolves.toBeTruthy();
  });
  it("owning client allowed; non-owner 403", async () => {
    Client.findById.mockResolvedValue(makeClient());
    await expect(assertClientAccess(OID, clientUser)).resolves.toBeTruthy();
    Client.findById.mockResolvedValue(makeClient({ userId: "111f1f77bcf86cd799439011" }));
    await expectStatus(assertClientAccess(OID, clientUser), 403);
  });
  it("404 missing, no isDeleted filtering", async () => {
    Client.findById.mockResolvedValue(null);
    await expectStatus(assertClientAccess(OID, admin), 404);
    // soft-deleted is NOT filtered for this variant
    Client.findById.mockResolvedValue(makeClient({ isDeleted: true }));
    await expect(assertClientAccess(OID, admin)).resolves.toBeTruthy();
  });
});

describe("resolveCurrentClient", () => {
  it("403 for non-client role", async () => {
    await expectStatus(resolveCurrentClient(trainer), 403);
    expect(Client.findOne).not.toHaveBeenCalled();
  });
  it("404 when no client record", async () => {
    Client.findOne.mockResolvedValue(null);
    await expectStatus(resolveCurrentClient(clientUser), 404);
  });
  it("queries by userId only when excludeDeleted=false", async () => {
    Client.findOne.mockResolvedValue(makeClient());
    await resolveCurrentClient(clientUser, { excludeDeleted: false });
    expect(Client.findOne).toHaveBeenCalledWith({ userId: CLIENT_USER_ID });
  });
  it("adds isDeleted filter when excludeDeleted=true", async () => {
    Client.findOne.mockResolvedValue(makeClient());
    await resolveCurrentClient(clientUser, { excludeDeleted: true });
    expect(Client.findOne).toHaveBeenCalledWith({ userId: CLIENT_USER_ID, isDeleted: { $ne: true } });
  });
});
