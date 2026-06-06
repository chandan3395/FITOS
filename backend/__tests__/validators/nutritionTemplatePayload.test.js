"use strict";

const { validateNutritionTemplatePayload } = require("../../src/validators/nutritionTemplatePayload.validator");

const ok = () => ({
  name: "Cut Template 2200",
  description: "Standard cut",
  calories: 2200,
  protein: 180,
  carbs: 220,
  fats: 70,
  waterTarget: 3.2,
  mealsPerDay: 4,
  cheatMeals: 1,
  dietType: "Omnivore",
  foodRestrictions: "Shellfish",
  eatingHabits: "Skips breakfast",
});

describe("validateNutritionTemplatePayload", () => {
  test("accepts a full payload", () => {
    const res = validateNutritionTemplatePayload(ok());
    expect(res.ok).toBe(true);
    expect(res.value.name).toBe("Cut Template 2200");
    expect(res.value.mealsPerDay).toBe(4);
  });

  test("requires template name on create", () => {
    const body = ok(); delete body.name;
    const res = validateNutritionTemplatePayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors.name).toBeDefined();
  });

  test("status normalizes to uppercase, rejects DRAFT", () => {
    const a = validateNutritionTemplatePayload({ status: "active" }, { partial: true });
    expect(a.ok).toBe(true);
    expect(a.value.status).toBe("ACTIVE");

    const b = validateNutritionTemplatePayload({ status: "DRAFT" }, { partial: true });
    expect(b.ok).toBe(false);
  });

  test.each([
    ["calories", 799],
    ["calories", 6001],
    ["mealsPerDay", 9],
    ["cheatMeals", 8],
    ["waterTarget", 0.4],
  ])("rejects out-of-range %s=%p", (field, badValue) => {
    const body = ok(); body[field] = badValue;
    const res = validateNutritionTemplatePayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors[field]).toBeDefined();
  });

  test("mealsPerDay must be integer", () => {
    const body = ok(); body.mealsPerDay = 3.5;
    const res = validateNutritionTemplatePayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors.mealsPerDay).toMatch(/integer/);
  });

  test("trims string fields", () => {
    const res = validateNutritionTemplatePayload({ dietType: "  Keto  " }, { partial: true });
    expect(res.ok).toBe(true);
    expect(res.value.dietType).toBe("Keto");
  });
});
