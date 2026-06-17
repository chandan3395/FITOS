"use strict";

// Mock the Mongoose models so the service runs without a DB. `mongoose` itself
// is REAL so isValidObjectId() behaves correctly on the 24-hex ids below.
jest.mock("../../src/schemas/Conversation.schema", () => ({
  Conversation: { findOne: jest.fn(), findById: jest.fn(), create: jest.fn(), find: jest.fn() },
}));
jest.mock("../../src/schemas/Message.schema", () => ({
  Message: { find: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
}));
jest.mock("../../src/schemas/User.schema", () => ({
  User: { find: jest.fn(), findById: jest.fn(), findByIdAndUpdate: jest.fn() },
}));
jest.mock("../../src/schemas/Client.schema", () => ({
  Client: { findById: jest.fn(), findOne: jest.fn() },
}));

const { Conversation } = require("../../src/schemas/Conversation.schema");
const { Message } = require("../../src/schemas/Message.schema");
const { User } = require("../../src/schemas/User.schema");
const { Client } = require("../../src/schemas/Client.schema");
const presence = require("../../src/socket/presence");
const ApiError = require("../../src/utils/ApiError");
const service = require("../../src/services/conversation.service");

const TRAINER_ID = "607f1f77bcf86cd799439022";
const OTHER_TRAINER = "907f1f77bcf86cd799439055";
const CLIENT_ID = "507f1f77bcf86cd799439011"; // Client PROFILE id
const CLIENT_USER_ID = "707f1f77bcf86cd799439033"; // the client's User id
const CONV_ID = "807f1f77bcf86cd799439044";
const OTHER_CLIENT_ID = "111f1f77bcf86cd799439011";

const trainer = { _id: TRAINER_ID, role: "TRAINER" };
const clientUser = { _id: CLIENT_USER_ID, role: "CLIENT" };
const admin = { _id: "a07f1f77bcf86cd799439044", role: "ADMIN" };

const makeClient = (over = {}) => ({
  _id: CLIENT_ID,
  trainerId: TRAINER_ID,
  userId: CLIENT_USER_ID,
  name: "Jane Doe",
  isDeleted: false,
  ...over,
});

const makeConvDoc = (over = {}) => ({
  _id: CONV_ID,
  trainerId: TRAINER_ID,
  clientId: CLIENT_ID,
  unread: { trainer: 0, client: 0 },
  lastMessage: undefined,
  lastActivityAt: new Date(),
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

// Chainable query stub: .sort/.limit/.populate/.select return self; .lean resolves.
const chain = (result) => {
  const obj = {
    sort: jest.fn(() => obj),
    limit: jest.fn(() => obj),
    populate: jest.fn(() => obj),
    select: jest.fn(() => obj),
    lean: jest.fn(() => Promise.resolve(result)),
  };
  return obj;
};

beforeEach(() => {
  jest.clearAllMocks();
  presence._reset();
});

// ── ownership ───────────────────────────────────────────────────────────────
describe("ownership", () => {
  it("trainer who owns the client may send", async () => {
    Client.findById.mockResolvedValue(makeClient());
    Conversation.findOne.mockResolvedValue(makeConvDoc());
    Message.create.mockResolvedValue({
      _id: "m1", body: "hi", senderRole: "trainer", senderId: TRAINER_ID, createdAt: new Date(),
    });
    const res = await service.sendMessage(trainer, { clientId: CLIENT_ID, body: "hi" });
    expect(res.message._id).toBe("m1");
    expect(res.senderRole).toBe("trainer");
  });

  it("trainer CANNOT send to a client that isn't theirs (403)", async () => {
    Client.findById.mockResolvedValue(makeClient({ trainerId: OTHER_TRAINER }));
    await expect(service.sendMessage(trainer, { clientId: CLIENT_ID, body: "hi" }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(Conversation.create).not.toHaveBeenCalled();
  });

  it("admin is never a participant (403) — no trainer↔trainer / client↔client", async () => {
    await expect(service.sendMessage(admin, { clientId: CLIENT_ID, body: "hi" }))
      .rejects.toBeInstanceOf(ApiError);
    await expect(service.sendMessage(admin, { clientId: CLIENT_ID, body: "hi" }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(Client.findById).not.toHaveBeenCalled();
  });

  it("getHistory rejects a client accessing ANOTHER client's conversation (403)", async () => {
    Conversation.findById.mockResolvedValue(makeConvDoc({ clientId: OTHER_CLIENT_ID }));
    Client.findOne.mockResolvedValue(makeClient()); // their profile is CLIENT_ID
    await expect(service.getHistory(clientUser, CONV_ID))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it("getHistory rejects a non-owning trainer (403)", async () => {
    Conversation.findById.mockResolvedValue(makeConvDoc({ trainerId: OTHER_TRAINER }));
    await expect(service.getHistory(trainer, CONV_ID))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it("getHistory 400s on an invalid conversation id (no DB hit)", async () => {
    await expect(service.getHistory(trainer, "not-an-id"))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(Conversation.findById).not.toHaveBeenCalled();
  });
});

// ── materialization ───────────────────────────────────────────────────────
describe("conversation materialization", () => {
  it("openConversation signals 'not started' before the first message", async () => {
    Client.findById.mockResolvedValue(makeClient());
    Conversation.findOne.mockReturnValue(chain(null));
    User.find.mockReturnValue(chain([]));
    const res = await service.openConversation(trainer, { clientId: CLIENT_ID });
    expect(res.started).toBe(false);
    expect(res.conversationId).toBeNull();
    expect(res.clientId).toBe(CLIENT_ID);
    expect(res.unread).toBe(0);
    expect(res.otherParticipant.userId).toBe(CLIENT_USER_ID);
    expect(res.otherParticipant.role).toBe("client");
    expect(res.otherParticipant.online).toBe(false);
  });

  it("openConversation reflects an existing conversation + the viewer's unread", async () => {
    Client.findById.mockResolvedValue(makeClient());
    Conversation.findOne.mockReturnValue(
      chain({ _id: CONV_ID, clientId: CLIENT_ID, trainerId: TRAINER_ID, unread: { trainer: 2, client: 0 }, lastMessage: { body: "x" }, lastActivityAt: new Date() })
    );
    User.find.mockReturnValue(chain([]));
    const res = await service.openConversation(trainer, { clientId: CLIENT_ID });
    expect(res.started).toBe(true);
    expect(res.conversationId).toBe(CONV_ID);
    expect(res.unread).toBe(2);
  });

  it("sendMessage MATERIALIZES the conversation on first message", async () => {
    Client.findById.mockResolvedValue(makeClient());
    Conversation.findOne.mockResolvedValue(null);
    const created = makeConvDoc();
    Conversation.create.mockResolvedValue(created);
    Message.create.mockResolvedValue({
      _id: "m1", body: "hi", senderRole: "trainer", senderId: TRAINER_ID, createdAt: new Date(),
    });
    await service.sendMessage(trainer, { clientId: CLIENT_ID, body: "hi" });
    expect(Conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({ trainerId: TRAINER_ID, clientId: CLIENT_ID })
    );
    expect(created.save).toHaveBeenCalled();
  });

  it("sendMessage REUSES an existing conversation (no second create)", async () => {
    Client.findOne.mockResolvedValue(makeClient());
    const conv = makeConvDoc({ unread: { trainer: 2, client: 0 } });
    Conversation.findOne.mockResolvedValue(conv);
    Message.create.mockResolvedValue({
      _id: "m2", body: "hey", senderRole: "client", senderId: CLIENT_USER_ID, createdAt: new Date(),
    });
    await service.sendMessage(clientUser, { body: "hey" });
    expect(Conversation.create).not.toHaveBeenCalled();
    expect(conv.save).toHaveBeenCalled();
  });

  it("rejects an empty body with 400 before persisting", async () => {
    Client.findById.mockResolvedValue(makeClient());
    await expect(service.sendMessage(trainer, { clientId: CLIENT_ID, body: "   " }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(Message.create).not.toHaveBeenCalled();
  });
});

// ── unread counts ─────────────────────────────────────────────────────────
describe("unread counts", () => {
  it("increments the RECIPIENT's count when a message lands", async () => {
    // trainer → client: the CLIENT's unread goes up
    Client.findById.mockResolvedValue(makeClient());
    const conv = makeConvDoc({ unread: { trainer: 0, client: 0 } });
    Conversation.findOne.mockResolvedValue(conv);
    Message.create.mockResolvedValue({
      _id: "m1", body: "hi", senderRole: "trainer", senderId: TRAINER_ID, createdAt: new Date(),
    });
    const res = await service.sendMessage(trainer, { clientId: CLIENT_ID, body: "hi" });
    expect(conv.unread).toEqual({ trainer: 0, client: 1 });
    expect(res.recipientRole).toBe("client");
    expect(res.recipientUserId).toBe(CLIENT_USER_ID);
  });

  it("client → trainer increments the TRAINER's count; recipient is the trainer User", async () => {
    Client.findOne.mockResolvedValue(makeClient());
    const conv = makeConvDoc({ unread: { trainer: 3, client: 0 } });
    Conversation.findOne.mockResolvedValue(conv);
    Message.create.mockResolvedValue({
      _id: "m2", body: "yo", senderRole: "client", senderId: CLIENT_USER_ID, createdAt: new Date(),
    });
    const res = await service.sendMessage(clientUser, { body: "yo" });
    expect(conv.unread).toEqual({ trainer: 4, client: 0 });
    expect(res.recipientRole).toBe("trainer");
    expect(res.recipientUserId).toBe(TRAINER_ID);
  });

  it("markRead zeroes the caller's unread", async () => {
    const conv = makeConvDoc({ unread: { trainer: 5, client: 0 } });
    Conversation.findById.mockResolvedValue(conv);
    Message.find.mockReturnValue(chain([])); // no pending messages
    await service.markRead(trainer, CONV_ID);
    expect(conv.unread).toEqual({ trainer: 0, client: 0 });
    expect(conv.save).toHaveBeenCalled();
  });
});

// ── tick lifecycle ──────────────────────────────────────────────────────────
describe("tick lifecycle", () => {
  it("new messages are persisted with status 'sent'", async () => {
    Client.findById.mockResolvedValue(makeClient());
    Conversation.findOne.mockResolvedValue(makeConvDoc());
    Message.create.mockResolvedValue({
      _id: "m1", body: "hi", senderRole: "trainer", senderId: TRAINER_ID, createdAt: new Date(),
    });
    await service.sendMessage(trainer, { clientId: CLIENT_ID, body: "hi" });
    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({ status: "sent" }));
  });

  it("markDelivered flips the RECIPIENT's incoming 'sent' messages to 'delivered'", async () => {
    // recipient = client → incoming messages are FROM the trainer
    Message.find.mockReturnValue(chain([{ _id: "m1" }, { _id: "m2" }]));
    Message.updateMany.mockResolvedValue({ modifiedCount: 2 });
    const res = await service.markDelivered(CONV_ID, "client");
    expect(Message.find).toHaveBeenCalledWith(
      { conversationId: CONV_ID, senderRole: "trainer", status: "sent" }, "_id"
    );
    expect(Message.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["m1", "m2"] } },
      { $set: { status: "delivered", deliveredAt: expect.any(Date) } }
    );
    expect(res.messageIds).toEqual(["m1", "m2"]);
  });

  it("markDelivered is a no-op when nothing is pending", async () => {
    Message.find.mockReturnValue(chain([]));
    const res = await service.markDelivered(CONV_ID, "trainer");
    expect(Message.updateMany).not.toHaveBeenCalled();
    expect(res.messageIds).toEqual([]);
  });

  it("markRead flips incoming messages to 'read' with readAt + returns ids", async () => {
    const conv = makeConvDoc({ unread: { trainer: 2, client: 0 } });
    Conversation.findById.mockResolvedValue(conv);
    Message.find.mockReturnValue(chain([{ _id: "m1" }, { _id: "m2" }]));
    Message.updateMany.mockResolvedValue({ modifiedCount: 2 });
    const res = await service.markRead(trainer, CONV_ID);
    expect(Message.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ["m1", "m2"] } },
      { $set: { status: "read", readAt: expect.any(Date) } }
    );
    expect(res.readerRole).toBe("trainer");
    expect(res.incomingRole).toBe("client");
    expect(res.messageIds).toEqual(["m1", "m2"]);
  });

  it("markRead does not write when there are no unread incoming messages", async () => {
    const conv = makeConvDoc();
    Conversation.findById.mockResolvedValue(conv);
    Message.find.mockReturnValue(chain([]));
    const res = await service.markRead(trainer, CONV_ID);
    expect(Message.updateMany).not.toHaveBeenCalled();
    expect(res.messageIds).toEqual([]);
  });
});

// ── history pagination ───────────────────────────────────────────────────
describe("history pagination", () => {
  const m1 = { _id: "m1", createdAt: new Date("2026-01-01T00:00:02Z") };
  const m2 = { _id: "m2", createdAt: new Date("2026-01-01T00:00:01Z") };

  it("returns messages newest-LAST (chronological)", async () => {
    Conversation.findById.mockResolvedValue(makeConvDoc());
    Message.find.mockReturnValue(chain([m1, m2])); // DB returns newest-first
    const res = await service.getHistory(trainer, CONV_ID, { limit: 30 });
    expect(res.messages).toEqual([m2, m1]); // reversed to chronological
    expect(res.hasMore).toBe(false);
    expect(res.nextBefore).toBeNull();
  });

  it("flags hasMore + a nextBefore cursor when the page is full", async () => {
    Conversation.findById.mockResolvedValue(makeConvDoc());
    Message.find.mockReturnValue(chain([m1, m2])); // cap+1 peeked
    const res = await service.getHistory(trainer, CONV_ID, { limit: 1 });
    expect(res.hasMore).toBe(true);
    expect(res.messages).toEqual([m1]); // newest kept, reversed (single)
    expect(res.nextBefore).toEqual(m1.createdAt);
  });
});
