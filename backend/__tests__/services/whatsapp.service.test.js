"use strict";

const whatsapp = require("../../src/services/whatsapp.service");
const { env } = require("../../src/config/env");

describe("whatsapp.service — phone helpers", () => {
  test("normalizePhone strips +, spaces and dashes", () => {
    expect(whatsapp.normalizePhone("+91 99999-88888")).toBe("919999988888");
    expect(whatsapp.normalizePhone("(555) 010-0100")).toBe("5550100100");
    expect(whatsapp.normalizePhone("")).toBe("");
    expect(whatsapp.normalizePhone(null)).toBe("");
  });

  test("isValidPhone accepts E.164-ish, rejects too short/long", () => {
    expect(whatsapp.isValidPhone("+91 99999 88888")).toBe(true);
    expect(whatsapp.isValidPhone("123")).toBe(false);
    expect(whatsapp.isValidPhone("")).toBe(false);
    expect(whatsapp.isValidPhone("1234567890123456")).toBe(false); // 16 digits
  });
});

describe("whatsapp.service — sendTextMessage", () => {
  const ORIG_TOKEN = env.WHATSAPP_ACCESS_TOKEN;
  const ORIG_PID   = env.WHATSAPP_PHONE_NUMBER_ID;

  const configure = () => {
    env.WHATSAPP_ACCESS_TOKEN = "test-token";
    env.WHATSAPP_PHONE_NUMBER_ID = "test-pid";
  };

  afterEach(() => {
    env.WHATSAPP_ACCESS_TOKEN = ORIG_TOKEN;
    env.WHATSAPP_PHONE_NUMBER_ID = ORIG_PID;
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("throws 503 when not configured", async () => {
    env.WHATSAPP_ACCESS_TOKEN = undefined;
    env.WHATSAPP_PHONE_NUMBER_ID = undefined;
    await expect(whatsapp.sendTextMessage({ to: "+919999988888", body: "hi" }))
      .rejects.toMatchObject({ statusCode: 503 });
  });

  test("throws 400 on invalid phone", async () => {
    configure();
    await expect(whatsapp.sendTextMessage({ to: "123", body: "hi" }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test("returns messageId and normalised recipient on success", async () => {
    configure();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: "wamid.ABC" }] }),
    });
    const res = await whatsapp.sendTextMessage({ to: "+91 99999 88888", body: "hi" });
    expect(res).toEqual({ messageId: "wamid.ABC", to: "919999988888" });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("throws 502 on upstream API error", async () => {
    configure();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Invalid OAuth token" } }),
    });
    await expect(whatsapp.sendTextMessage({ to: "+919999988888", body: "hi" }))
      .rejects.toMatchObject({ statusCode: 502 });
  });

  test("throws 504 on timeout / aborted request", async () => {
    configure();
    global.fetch = jest.fn().mockImplementation(() => {
      const err = new Error("aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });
    await expect(whatsapp.sendTextMessage({ to: "+919999988888", body: "hi" }))
      .rejects.toMatchObject({ statusCode: 504 });
  });
});
