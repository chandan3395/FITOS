"use strict";

const { validateActivationPayload, PASSWORD_MIN } = require("../../src/validators/activationPayload.validator");

describe("validateActivationPayload", () => {
  test("accepts a valid password", () => {
    const res = validateActivationPayload({ password: "correcthorse" });
    expect(res.ok).toBe(true);
    expect(res.value.password).toBe("correcthorse");
  });

  test("accepts an optional name and trims it", () => {
    const res = validateActivationPayload({ name: "  Priya  ", password: "correcthorse" });
    expect(res.ok).toBe(true);
    expect(res.value.name).toBe("Priya");
  });

  test.each([null, undefined, ""])("rejects empty password (%p)", (password) => {
    const res = validateActivationPayload({ password });
    expect(res.ok).toBe(false);
    expect(res.errors.password).toBe("Password is required.");
  });

  test("rejects password shorter than the min", () => {
    const res = validateActivationPayload({ password: "a".repeat(PASSWORD_MIN - 1) });
    expect(res.ok).toBe(false);
    expect(res.errors.password).toMatch(new RegExp(`at least ${PASSWORD_MIN}`));
  });

  test("rejects non-string password", () => {
    const res = validateActivationPayload({ password: 12345678 });
    expect(res.ok).toBe(false);
    expect(res.errors.password).toMatch(/string/i);
  });

  test("rejects name that's too short", () => {
    const res = validateActivationPayload({ name: "A", password: "correcthorse" });
    expect(res.ok).toBe(false);
    expect(res.errors.name).toBeDefined();
  });

  test.each([null, undefined, 5, "x"])("rejects non-object body: %p", (body) => {
    const res = validateActivationPayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors._root).toBeDefined();
  });
});
