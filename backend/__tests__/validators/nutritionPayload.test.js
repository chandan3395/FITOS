"use strict";

const { validateNutritionPayload } = require("../../src/validators/nutritionPayload.validator");

const okPayload = () => ({
  planName: "Cut 2200",
  notes: "Aggressive fat-loss block.",
  calories: 2200,
  protein: 180,
  carbs: 220,
  fats: 70,
  waterTarget: 3.2,
  mealsPerDay: 4,
  cheatMeals: 1,
  dietType: "Omnivore",
  foodAvoidances: "Shellfish",
  eatingHabits: "Skips breakfast on weekdays.",
});

describe("validateNutritionPayload", () => {
  test("accepts and cleans a full payload", () => {
    const res = validateNutritionPayload(okPayload());
    expect(res.ok).toBe(true);
    expect(res.value.planName).toBe("Cut 2200");
    expect(res.value.calories).toBe(2200);
    expect(res.value.mealsPerDay).toBe(4);
  });

  test("requires plan name on creates", () => {
    const body = okPayload();
    delete body.planName;
    const res = validateNutritionPayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors.planName).toBe("Plan name is required.");
  });

  test("partial mode allows patches without plan name", () => {
    const res = validateNutritionPayload({ notes: "Updated" }, { partial: true });
    expect(res.ok).toBe(true);
    expect(res.value.notes).toBe("Updated");
  });

  test.each([
    ["calories", 799],
    ["calories", 6001],
    ["protein", 19],
    ["protein", 501],
    ["carbs", 19],
    ["carbs", 1001],
    ["fats", 9],
    ["fats", 301],
    ["waterTarget", 0.4],
    ["waterTarget", 10.1],
    ["mealsPerDay", 0],
    ["mealsPerDay", 9],
    ["cheatMeals", -1],
    ["cheatMeals", 8],
  ])("rejects out-of-range %s=%p", (field, badValue) => {
    const body = okPayload();
    body[field] = badValue;
    const res = validateNutritionPayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors[field]).toBeDefined();
  });

  test("mealsPerDay must be an integer", () => {
    const body = okPayload();
    body.mealsPerDay = 3.5;
    const res = validateNutritionPayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors.mealsPerDay).toMatch(/integer/);
  });

  test("normalizes status values", () => {
    const res = validateNutritionPayload({ status: "active" }, { partial: true });
    expect(res.ok).toBe(true);
    expect(res.value.status).toBe("ACTIVE");
  });

  test("rejects invalid status values", () => {
    const res = validateNutritionPayload({ status: "PUBLISHED" }, { partial: true });
    expect(res.ok).toBe(false);
    expect(res.errors.status).toMatch(/DRAFT/);
  });

  test("string fields respect max length", () => {
    const long = "x".repeat(2001);
    const res = validateNutritionPayload({ eatingHabits: long }, { partial: true });
    expect(res.ok).toBe(false);
    expect(res.errors.eatingHabits).toBeDefined();
  });

  test("trims string fields", () => {
    const res = validateNutritionPayload({ dietType: "  Keto  " }, { partial: true });
    expect(res.ok).toBe(true);
    expect(res.value.dietType).toBe("Keto");
  });
});
