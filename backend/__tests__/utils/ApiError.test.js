"use strict";

const ApiError = require("../../src/utils/ApiError");

describe("ApiError", () => {
  test("attaches statusCode and message", () => {
    const e = new ApiError(404, "Not found");
    expect(e.statusCode).toBe(404);
    expect(e.message).toBe("Not found");
    expect(e.errors).toBeUndefined();
  });

  test("attaches the structured errors map when provided", () => {
    const errs = { email: "Enter a valid email." };
    const e = new ApiError(400, "Validation failed", errs);
    expect(e.errors).toEqual(errs);
  });

  test("ApiError.validation defaults to 400 + Validation failed", () => {
    const e = ApiError.validation({ x: "bad" });
    expect(e.statusCode).toBe(400);
    expect(e.message).toBe("Validation failed");
    expect(e.errors).toEqual({ x: "bad" });
  });

  test("non-object errors are dropped (defensive)", () => {
    const e = new ApiError(400, "X", "not an object");
    expect(e.errors).toBeUndefined();
  });
});
