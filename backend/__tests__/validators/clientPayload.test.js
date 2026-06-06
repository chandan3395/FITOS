"use strict";

const { validateClientPayload, RANGES } = require("../../src/validators/clientPayload.validator");

/**
 * The validator is a pure function — no DB, no Express. Every backend
 * write path for clients runs through this, so it's the right place to
 * catch regressions cheaply.
 */

// A payload that should pass — useful as a baseline to mutate.
const okPayload = () => ({
  name:           "Priya Sharma",
  phone:          "+91 98765 43210",
  email:          "priya@example.com",
  gender:         "FEMALE",
  age:            28,
  city:           "Bengaluru",
  height:         165,
  startingWeight: 68,
  targetWeight:   62,
  goal:           "Weight Loss",
});

describe("validateClientPayload — happy path", () => {
  test("accepts a well-formed payload", () => {
    const res = validateClientPayload(okPayload());
    expect(res.ok).toBe(true);
    expect(res.value.name).toBe("Priya Sharma");
    expect(res.value.email).toBe("priya@example.com");        // lowercased
    expect(res.value.gender).toBe("FEMALE");                  // upper-cased
    expect(typeof res.value.height).toBe("number");
    expect(res.value.height).toBe(165);
  });

  test("optional fields are skipped silently when omitted", () => {
    const { city, gender, age, ...minimal } = okPayload();
    const res = validateClientPayload(minimal);
    expect(res.ok).toBe(true);
    expect(res.value.city).toBeUndefined();
    expect(res.value.gender).toBeUndefined();
  });

  test("partial mode allows missing required fields", () => {
    const res = validateClientPayload({ goal: "New goal" }, { partial: true });
    expect(res.ok).toBe(true);
    expect(res.value.goal).toBe("New goal");
  });

  test("partial mode still enforces format on present fields", () => {
    const res = validateClientPayload({ email: "not-an-email" }, { partial: true });
    expect(res.ok).toBe(false);
    expect(res.errors.email).toBeDefined();
  });
});

describe("validateClientPayload — missing required fields", () => {
  test.each([
    ["name",           "Name is required."],
    ["phone",          "Phone is required."],
    ["height",         "Height is required."],
    ["startingWeight", "Starting weight is required."],
    ["targetWeight",   "Target weight is required."],
    ["goal",           "Primary goal is required."],
  ])("rejects when %s is missing", (field, message) => {
    const body = okPayload();
    delete body[field];
    const res = validateClientPayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors[field]).toBe(message);
  });

  test("rejects empty-string required fields too", () => {
    const res = validateClientPayload({ ...okPayload(), name: "" });
    expect(res.ok).toBe(false);
    expect(res.errors.name).toBe("Name is required.");
  });

  test("collects ALL missing-required errors in one pass", () => {
    const res = validateClientPayload({});
    expect(res.ok).toBe(false);
    expect(Object.keys(res.errors).sort()).toEqual(
      ["goal", "height", "name", "phone", "startingWeight", "targetWeight"].sort()
    );
  });
});

describe("validateClientPayload — invalid email", () => {
  test.each([
    "not-an-email",
    "missing@tld",
    "no@dot",
    "@nothing.com",
    "spaces in@email.com",
    "two@@signs.com",
  ])("rejects %s", (email) => {
    const res = validateClientPayload({ ...okPayload(), email });
    expect(res.ok).toBe(false);
    expect(res.errors.email).toMatch(/valid email/i);
  });

  test("accepts and lower-cases a valid email", () => {
    const res = validateClientPayload({ ...okPayload(), email: "Mixed.Case@FITOS.app" });
    expect(res.ok).toBe(true);
    expect(res.value.email).toBe("mixed.case@fitos.app");
  });
});

describe("validateClientPayload — invalid phone", () => {
  test.each([
    "abc",
    "123",                        // too short
    "letters-only-here",
    "5".repeat(25),               // too long
    "9876@5432",                  // illegal char
  ])("rejects %s", (phone) => {
    const res = validateClientPayload({ ...okPayload(), phone });
    expect(res.ok).toBe(false);
    expect(res.errors.phone).toMatch(/7.?20.*chars|Phone is required/);
  });

  test.each([
    "+91 98765 43210",
    "9876543210",
    "(555) 123-4567",
    "+1-555-0100",
  ])("accepts %s", (phone) => {
    const res = validateClientPayload({ ...okPayload(), phone });
    expect(res.ok).toBe(true);
    expect(res.value.phone).toBe(phone.trim());
  });
});

describe("validateClientPayload — invalid height", () => {
  const { min, max } = RANGES.height;
  test.each([
    "abc",
    "twelve",
    "12abc",
    "@@@",
    String(min - 1),
    String(max + 1),
    "-50",
  ])("rejects %s", (height) => {
    const res = validateClientPayload({ ...okPayload(), height });
    expect(res.ok).toBe(false);
    expect(res.errors.height).toMatch(new RegExp(`${min}.*${max}`));
  });

  test("accepts boundary values", () => {
    expect(validateClientPayload({ ...okPayload(), height: min }).ok).toBe(true);
    expect(validateClientPayload({ ...okPayload(), height: max }).ok).toBe(true);
  });

  test("accepts numeric strings", () => {
    const res = validateClientPayload({ ...okPayload(), height: "170.5" });
    expect(res.ok).toBe(true);
    expect(res.value.height).toBe(170.5);
  });
});

describe("validateClientPayload — invalid weight", () => {
  const { min, max } = RANGES.startingWeight;
  test.each([
    "abc",
    String(min - 1),
    String(max + 1),
    "0",
  ])("rejects startingWeight=%s", (startingWeight) => {
    const res = validateClientPayload({ ...okPayload(), startingWeight });
    expect(res.ok).toBe(false);
    expect(res.errors.startingWeight).toBeDefined();
  });

  test("rejects out-of-range targetWeight", () => {
    const res = validateClientPayload({ ...okPayload(), targetWeight: 5 });
    expect(res.ok).toBe(false);
    expect(res.errors.targetWeight).toBeDefined();
  });
});

describe("validateClientPayload — invalid nutritional fields", () => {
  test.each([
    ["calories", 100],          // below 800
    ["calories", 99999],
    ["calories", "abc"],
    ["protein",  10],           // below 20
    ["carbs",    5000],         // above 1000
    ["fats",     3],
    ["mealsPerDay", 0],         // below 1
    ["mealsPerDay", 99],
    ["mealsPerDay", 3.5],       // not integer
    ["waterTarget", 0.1],
    ["waterTarget", 25],
    ["cheatMeals",  -1],
    ["cheatMeals",  10],
  ])("rejects %s=%p", (field, badValue) => {
    const res = validateClientPayload({ ...okPayload(), [field]: badValue });
    expect(res.ok).toBe(false);
    expect(res.errors[field]).toBeDefined();
  });

  test("accepts good nutritional values", () => {
    const res = validateClientPayload({
      ...okPayload(),
      calories: 1800, protein: 120, carbs: 200, fats: 60,
      mealsPerDay: 4, waterTarget: 3.0, cheatMeals: 1,
      bodyFat: 28, targetBodyFat: 22,
    });
    expect(res.ok).toBe(true);
    expect(res.value.calories).toBe(1800);
    expect(res.value.mealsPerDay).toBe(4);
  });
});

describe("validateClientPayload — gender + status enums", () => {
  test("rejects unknown gender", () => {
    const res = validateClientPayload({ ...okPayload(), gender: "Robot" });
    expect(res.ok).toBe(false);
    expect(res.errors.gender).toBeDefined();
  });

  test("accepts lower-case gender and normalises", () => {
    const res = validateClientPayload({ ...okPayload(), gender: "male" });
    expect(res.ok).toBe(true);
    expect(res.value.gender).toBe("MALE");
  });

  test("rejects unknown status (PATCH path)", () => {
    const res = validateClientPayload({ ...okPayload(), status: "DELETED" }, { partial: true });
    expect(res.ok).toBe(false);
    expect(res.errors.status).toBeDefined();
  });
});

describe("validateClientPayload — body shape guards", () => {
  test.each([null, undefined, "string", 5])("rejects non-object body: %p", (body) => {
    const res = validateClientPayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors._root).toBeDefined();
  });
});
