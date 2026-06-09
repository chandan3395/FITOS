"use strict";

const { validateActivationPayload, NAME_MIN } = require("../../src/validators/activationPayload.validator");

describe("validateActivationPayload", () => {
  test("accepts an empty body (no required fields)", () => {
    const res = validateActivationPayload({});
    expect(res.ok).toBe(true);
    expect(res.value).toEqual({});
  });

  test.each([null, undefined])("treats a missing body (%p) as valid", (body) => {
    const res = validateActivationPayload(body);
    expect(res.ok).toBe(true);
    expect(res.value).toEqual({});
  });

  test("accepts an optional name and trims it", () => {
    const res = validateActivationPayload({ name: "  Priya  " });
    expect(res.ok).toBe(true);
    expect(res.value.name).toBe("Priya");
  });

  test("ignores password — it is no longer part of activation", () => {
    const res = validateActivationPayload({ password: "anything" });
    expect(res.ok).toBe(true);
    expect(res.value.password).toBeUndefined();
  });

  test("rejects a name that's too short", () => {
    const res = validateActivationPayload({ name: "A" });
    expect(res.ok).toBe(false);
    expect(res.errors.name).toMatch(new RegExp(`at least ${NAME_MIN}`));
  });

  test.each([5, "x"])("rejects a non-object body: %p", (body) => {
    const res = validateActivationPayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors._root).toBeDefined();
  });
});
