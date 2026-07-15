"use strict";

/**
 * Socket.IO runtime integration — the REAL initSocket server driven by
 * socket.io-client over a live HTTP server + in-memory Mongo. Two authenticated
 * users (a trainer and their assigned client) plus an unrelated "outsider"
 * trainer verify end-to-end delivery, read receipts, typing scoping, presence,
 * and delivered-flush-on-connect — and that a non-participant receives nothing.
 */

const http = require("http");
const mongoose = require("mongoose");
const { io: ioClient } = require("socket.io-client");

const app = require("../../src/app");
const { initSocket } = require("../../src/socket");
const presence = require("../../src/socket/presence");
const { Conversation } = require("../../src/schemas/Conversation.schema");
const { Message } = require("../../src/schemas/Message.schema");
const { startMemoryMongo, stopMemoryMongo, tokenFor, makeTrainer, makeClient } = require("./_setup");

jest.setTimeout(120000);

let mongod;
let httpServer;
let io;
let port;
const openSockets = [];

beforeAll(async () => {
  mongod = await startMemoryMongo();
  httpServer = http.createServer(app);
  io = initSocket(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  port = httpServer.address().port;
});

afterAll(async () => {
  if (io) io.close();
  await new Promise((resolve) => httpServer.close(resolve));
  await stopMemoryMongo(mongod);
});

afterEach(async () => {
  while (openSockets.length) {
    const s = openSockets.pop();
    if (s.connected) s.disconnect();
  }
  presence._reset();
  await Promise.all([Conversation.deleteMany({}), Message.deleteMany({})]);
  await sleep(60); // let server-side disconnect handlers settle
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${port}`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
    });
    openSockets.push(socket);
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (e) => reject(e));
  });
}

// Resolve with the first payload for `event`, or reject on timeout.
function once(socket, event, ms = 3000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), ms);
    socket.once(event, (data) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

// Resolve if NO `event` arrives within `ms` (used to prove non-delivery).
function expectSilence(socket, event, ms = 500) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    socket.once(event, (d) => {
      clearTimeout(t);
      reject(new Error(`unexpected "${event}": ${JSON.stringify(d)}`));
    });
  });
}

async function pair() {
  const trainer = await makeTrainer();
  const { user: clientUser, client } = await makeClient(trainer);
  return { trainer, clientUser, client };
}

describe("rejects unauthenticated handshakes", () => {
  it("connect_error without a token", async () => {
    await expect(connect(undefined)).rejects.toBeTruthy();
    await expect(connect("not-a-jwt")).rejects.toBeTruthy();
  });
});

describe("message:send delivers to the recipient's socket", () => {
  it("client receives message:new; an outsider trainer receives nothing", async () => {
    const { trainer, clientUser, client } = await pair();
    const outsider = await makeTrainer();

    const trainerSock = await connect(tokenFor(trainer));
    const clientSock = await connect(tokenFor(clientUser));
    const outsiderSock = await connect(tokenFor(outsider));
    await sleep(150); // let room joins settle

    const gotMessage = once(clientSock, "message:new");
    const outsiderSilent = expectSilence(outsiderSock, "message:new", 600);

    trainerSock.emit("message:send", { clientId: String(client._id), body: "yo" });

    const payload = await gotMessage;
    expect(payload.message).toMatchObject({ body: "yo", senderRole: "trainer" });
    await outsiderSilent;

    // Persisted as well (Mongo is the source of truth).
    expect(await Message.countDocuments({ body: "yo" })).toBe(1);
  });
});

describe("conversation:read emits a read receipt to the sender", () => {
  it("trainer receives message:read after the client reads", async () => {
    const { trainer, clientUser, client } = await pair();
    const trainerSock = await connect(tokenFor(trainer));
    const clientSock = await connect(tokenFor(clientUser));
    await sleep(150);

    // Trainer sends; client receives, then reads.
    const delivered = once(clientSock, "message:new");
    trainerSock.emit("message:send", { clientId: String(client._id), body: "please read" });
    const { conversationId } = await delivered;

    const receipt = once(trainerSock, "message:read");
    clientSock.emit("conversation:read", { conversationId });

    const data = await receipt;
    expect(data.conversationId).toBeTruthy();
    expect(data.readerRole).toBe("client");
    expect(Array.isArray(data.messageIds)).toBe(true);
    expect(data.messageIds.length).toBeGreaterThan(0);
  });
});

describe("typing indicators only reach conversation participants", () => {
  it("the client sees typing; an outsider does not", async () => {
    const { trainer, clientUser, client } = await pair();
    const outsider = await makeTrainer();

    const trainerSock = await connect(tokenFor(trainer));
    const clientSock = await connect(tokenFor(clientUser));
    const outsiderSock = await connect(tokenFor(outsider));
    await sleep(150);

    // Materialize the conversation so its room exists for both participants.
    const created = once(clientSock, "message:new");
    trainerSock.emit("message:send", { clientId: String(client._id), body: "hi" });
    const { conversationId } = await created;
    await sleep(80);

    const clientTyping = once(clientSock, "typing");
    const outsiderSilent = expectSilence(outsiderSock, "typing", 600);

    trainerSock.emit("typing:start", { conversationId });

    const t = await clientTyping;
    expect(t).toMatchObject({ conversationId, role: "trainer", typing: true });
    await outsiderSilent;
  });
});

describe("presence + delivered-flush on connect", () => {
  it("a pre-existing 'sent' message flushes to delivered when the recipient connects, and presence goes online", async () => {
    const { trainer, clientUser, client } = await pair();

    // Pre-seed a materialized conversation + one undelivered trainer message.
    const convo = await Conversation.create({ trainerId: trainer._id, clientId: client._id, lastActivityAt: new Date() });
    await Message.create({
      conversationId: convo._id,
      senderId: trainer._id,
      senderRole: "trainer",
      body: "sent while offline",
      status: "sent",
    });

    // Trainer connects first (joins the existing conversation room).
    const trainerSock = await connect(tokenFor(trainer));
    await sleep(120);

    const presenceOnline = once(trainerSock, "presence:update");
    const deliveredReceipt = once(trainerSock, "message:delivered");

    // Client connects → server marks online + flushes deliveries.
    const clientSock = await connect(tokenFor(clientUser));

    const pres = await presenceOnline;
    expect(pres).toMatchObject({ userId: String(clientUser._id), online: true });

    const receipt = await deliveredReceipt;
    expect(receipt.messageIds.length).toBeGreaterThan(0);
    // Persisted transition sent → delivered.
    const msg = await Message.findOne({ conversationId: convo._id });
    expect(msg.status).toBe("delivered");

    // Now disconnect the client → trainer sees an offline presence update.
    const presenceOffline = once(trainerSock, "presence:update");
    clientSock.disconnect();
    const off = await presenceOffline;
    expect(off).toMatchObject({ userId: String(clientUser._id), online: false });
  });
});
