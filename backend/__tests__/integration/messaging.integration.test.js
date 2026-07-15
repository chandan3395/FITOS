"use strict";

/**
 * Messaging REST integration — real app + real in-memory Mongo.
 *
 * Exercises the persist-then-emit conversation service through the REST
 * surface (POST /send, GET /:id/messages, POST /:id/read, GET /resolve),
 * which shares the EXACT ownership + state path the Socket.IO handlers use.
 * Assertions check persisted state (messages, preview, per-role unread,
 * message status), not just HTTP codes.
 */

const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../../src/app");
const { Conversation } = require("../../src/schemas/Conversation.schema");
const { Message } = require("../../src/schemas/Message.schema");
const {
  startMemoryMongo,
  stopMemoryMongo,
  tokenFor,
  makeTrainer,
  makeClient,
} = require("./_setup");

jest.setTimeout(120000);

let mongod;

beforeAll(async () => {
  mongod = await startMemoryMongo();
});

afterAll(async () => {
  await stopMemoryMongo(mongod);
});

afterEach(async () => {
  await Promise.all([Conversation.deleteMany({}), Message.deleteMany({})]);
});

const auth = (t) => ({ Authorization: `Bearer ${t}` });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scenario() {
  const trainer = await makeTrainer();
  const { user: clientUser, client } = await makeClient(trainer);
  return {
    trainer,
    trainerToken: tokenFor(trainer),
    clientUser,
    client,
    clientToken: tokenFor(clientUser),
  };
}

describe("send persists + updates preview + increments RECIPIENT unread", () => {
  it("trainer→client send creates a message, sets preview, bumps client unread only", async () => {
    const { trainerToken, client } = await scenario();

    const res = await request(app)
      .post("/api/conversations/send")
      .set(auth(trainerToken))
      .send({ clientId: String(client._id), body: "Hello there" });

    expect(res.status).toBe(201);
    const conversationId = res.body.data.conversationId;

    // Message persisted with sender role + "sent" status.
    const msgs = await Message.find({ conversationId }).lean();
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ body: "Hello there", senderRole: "trainer", status: "sent" });

    // Conversation preview + unread reflect a message the CLIENT must read.
    const convo = await Conversation.findById(conversationId).lean();
    expect(convo.lastMessage).toMatchObject({ body: "Hello there", senderRole: "trainer" });
    expect(convo.unread).toMatchObject({ trainer: 0, client: 1 });
  });

  it("client→trainer send bumps trainer unread only", async () => {
    const { clientToken } = await scenario();

    const res = await request(app)
      .post("/api/conversations/send")
      .set(auth(clientToken))
      .send({ body: "Hi coach" });

    expect(res.status).toBe(201);
    const convo = await Conversation.findById(res.body.data.conversationId).lean();
    expect(convo.unread).toMatchObject({ trainer: 1, client: 0 });
  });
});

describe("history: ownership-checked + paginated", () => {
  it("paginates newest-last with a working `before` cursor and no gaps/dupes", async () => {
    const { trainerToken, client } = await scenario();

    const bodies = ["m1", "m2", "m3", "m4", "m5"];
    let conversationId;
    for (const body of bodies) {
      const r = await request(app)
        .post("/api/conversations/send")
        .set(auth(trainerToken))
        .send({ clientId: String(client._id), body });
      conversationId = r.body.data.conversationId;
      await sleep(5); // keep createdAt strictly increasing for the cursor
    }

    // Page 1: newest 2, returned chronologically.
    const p1 = await request(app)
      .get(`/api/conversations/${conversationId}/messages?limit=2`)
      .set(auth(trainerToken));
    expect(p1.status).toBe(200);
    expect(p1.body.data.messages.map((m) => m.body)).toEqual(["m4", "m5"]);
    expect(p1.body.data.hasMore).toBe(true);
    expect(p1.body.data.nextBefore).toBeTruthy();

    // Page 2: older 2 via the cursor.
    const p2 = await request(app)
      .get(`/api/conversations/${conversationId}/messages?limit=2&before=${encodeURIComponent(p1.body.data.nextBefore)}`)
      .set(auth(trainerToken));
    expect(p2.body.data.messages.map((m) => m.body)).toEqual(["m2", "m3"]);
    expect(p2.body.data.hasMore).toBe(true);

    // Page 3: the last remaining one.
    const p3 = await request(app)
      .get(`/api/conversations/${conversationId}/messages?limit=2&before=${encodeURIComponent(p2.body.data.nextBefore)}`)
      .set(auth(trainerToken));
    expect(p3.body.data.messages.map((m) => m.body)).toEqual(["m1"]);
    expect(p3.body.data.hasMore).toBe(false);

    // Every message seen exactly once across pages.
    const seen = [...p1.body.data.messages, ...p2.body.data.messages, ...p3.body.data.messages].map((m) => m.body);
    expect(seen.sort()).toEqual([...bodies].sort());
  });

  it("a SECOND trainer gets 403 on another trainer's conversation history", async () => {
    const { trainerToken, client } = await scenario();
    const otherTrainer = await makeTrainer();

    const sent = await request(app)
      .post("/api/conversations/send")
      .set(auth(trainerToken))
      .send({ clientId: String(client._id), body: "private" });
    const conversationId = sent.body.data.conversationId;

    const res = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set(auth(tokenFor(otherTrainer)));
    expect(res.status).toBe(403);
  });

  it("an unrelated CLIENT gets 403 on a conversation that isn't theirs", async () => {
    const { trainerToken, client } = await scenario();
    const otherTrainer = await makeTrainer();
    const { user: otherClientUser } = await makeClient(otherTrainer);

    const sent = await request(app)
      .post("/api/conversations/send")
      .set(auth(trainerToken))
      .send({ clientId: String(client._id), body: "private" });

    const res = await request(app)
      .get(`/api/conversations/${sent.body.data.conversationId}/messages`)
      .set(auth(tokenFor(otherClientUser)));
    expect(res.status).toBe(403);
  });
});

describe("resolve: a client only ever resolves their OWN conversation", () => {
  it("ignores a spoofed ?clientId and resolves the caller's own pairing", async () => {
    const { clientToken, client } = await scenario();
    const victimTrainer = await makeTrainer();
    const { client: victimClient } = await makeClient(victimTrainer);

    const res = await request(app)
      .get(`/api/conversations/resolve?clientId=${victimClient._id}`)
      .set(auth(clientToken));

    expect(res.status).toBe(200);
    // Resolved to the caller's own client id, never the spoofed one.
    expect(String(res.body.data.conversation.clientId)).toBe(String(client._id));
    expect(String(res.body.data.conversation.clientId)).not.toBe(String(victimClient._id));
  });
});

describe("markRead flips only the OTHER side's messages + zeroes reader unread", () => {
  it("client read marks trainer messages read, leaves the client's own message, zeroes client unread", async () => {
    const { trainerToken, clientToken, client } = await scenario();

    // Client sends one, trainer sends two.
    await request(app).post("/api/conversations/send").set(auth(clientToken)).send({ body: "from client" });
    await request(app).post("/api/conversations/send").set(auth(trainerToken)).send({ clientId: String(client._id), body: "t1" });
    const last = await request(app).post("/api/conversations/send").set(auth(trainerToken)).send({ clientId: String(client._id), body: "t2" });
    const conversationId = last.body.data.conversationId;

    const read = await request(app)
      .post(`/api/conversations/${conversationId}/read`)
      .set(auth(clientToken));
    expect(read.status).toBe(200);
    // Exactly the two trainer messages were flipped.
    expect(read.body.data.readMessageIds).toHaveLength(2);

    const trainerMsgs = await Message.find({ conversationId, senderRole: "trainer" }).lean();
    expect(trainerMsgs.every((m) => m.status === "read" && m.readAt)).toBe(true);

    const clientMsg = await Message.findOne({ conversationId, senderRole: "client" }).lean();
    expect(clientMsg.status).not.toBe("read"); // the reader's own message is untouched

    const convo = await Conversation.findById(conversationId).lean();
    expect(convo.unread.client).toBe(0);
  });
});

describe("soft-deleted client is excluded from messaging", () => {
  it("a trainer cannot open/send to a soft-deleted client's conversation (404)", async () => {
    const trainer = await makeTrainer();
    const { client } = await makeClient(trainer, { clientOverrides: { isDeleted: true } });

    const res = await request(app)
      .get(`/api/conversations/resolve?clientId=${client._id}`)
      .set(auth(tokenFor(trainer)));
    expect(res.status).toBe(404);

    const send = await request(app)
      .post("/api/conversations/send")
      .set(auth(tokenFor(trainer)))
      .send({ clientId: String(client._id), body: "hi" });
    expect(send.status).toBe(404);
  });

  it("a soft-deleted client's own conversation list reads as gone (404)", async () => {
    const trainer = await makeTrainer();
    const { token } = await makeClient(trainer, { clientOverrides: { isDeleted: true } });

    // listConversations resolves the caller's Client with excludeDeleted:true,
    // so a soft-deleted client's profile is treated as not found.
    const res = await request(app).get("/api/conversations").set(auth(token));
    expect(res.status).toBe(404);
  });
});

describe("message body + id edge cases", () => {
  it("rejects an empty/whitespace body with 400 and persists nothing", async () => {
    const { trainerToken, client } = await scenario();
    const res = await request(app)
      .post("/api/conversations/send")
      .set(auth(trainerToken))
      .send({ clientId: String(client._id), body: "   " });
    expect(res.status).toBe(400);
    expect(await Message.countDocuments({})).toBe(0);
  });

  it("rejects an over-length body (>5000 chars) with 400", async () => {
    const { trainerToken, client } = await scenario();
    const res = await request(app)
      .post("/api/conversations/send")
      .set(auth(trainerToken))
      .send({ clientId: String(client._id), body: "x".repeat(5001) });
    expect(res.status).toBe(400);
  });

  it("returns 400 on an invalid conversation ObjectId and 404 on a well-formed missing one", async () => {
    const { trainerToken } = await scenario();
    const bad = await request(app).get("/api/conversations/not-an-id/messages").set(auth(trainerToken));
    expect(bad.status).toBe(400);

    const missing = await request(app)
      .get(`/api/conversations/${new mongoose.Types.ObjectId()}/messages`)
      .set(auth(trainerToken));
    expect(missing.status).toBe(404);
  });

  it("admin is never a messaging participant (403)", async () => {
    const { client } = await scenario();
    const { makeAdmin } = require("./_setup");
    const admin = await makeAdmin();
    const res = await request(app)
      .get(`/api/conversations/resolve?clientId=${client._id}`)
      .set(auth(tokenFor(admin)));
    expect(res.status).toBe(403);
  });
});
