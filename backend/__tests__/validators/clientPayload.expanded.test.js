"use strict";

const { validateClientPayload } = require("../../src/validators/clientPayload.validator");

const baseline = () => ({
  name: "Test Client",
  phone: "+91 99999 88888",
  email: "test.client@fitos.app",
  height: 170,
  startingWeight: 70,
  targetWeight: 65,
  goal: "Weight Loss",
});

describe("validator — newly-persisted fields accepted end-to-end", () => {
  test("accepts the full onboarding payload", () => {
    const fullBody = {
      ...baseline(),
      // Identity
      email: "test@fitos.app",
      gender: "FEMALE",
      dob: "1996-04-12",
      city: "Bengaluru",
      occupation: "Software Engineer",
      // Body
      bodyFat: 28,
      // Health
      medicalConditions: "Hypertension",
      medications: "Metformin 500mg",
      pastInjuries: "ACL repair 2018",
      allergies: "Peanuts",
      // Goal
      targetBodyFat: 22,
      timeline: "12 weeks",
      goalDescription: "Get back to pre-pregnancy weight while staying strong.",
      // Program
      startDate: "2026-06-15",
      duration: "16 weeks",
      sessionFrequency: "4 / week",
      // Nutrition
      diet: "Vegetarian",
      calories: 1800, protein: 120, carbs: 200, fats: 60,
      mealsPerDay: 4, waterTarget: 3.0, cheatMeals: 1,
      foodDislikes: "Broccoli",
      eatingHabits: "Skips breakfast, snacks late at night",
      // Notes
      privateNotes: "Highly motivated, responds well to numeric goals.",
    };

    const res = validateClientPayload(fullBody);
    expect(res.ok).toBe(true);

    // Every onboarding field made it through the validator.
    const expectedKeys = [
      "name", "phone", "email", "gender", "dob", "age", "city", "occupation",
      "height", "startingWeight", "bodyFat",
      "medicalConditions", "medications", "pastInjuries", "allergies",
      "goal", "targetWeight", "targetBodyFat", "timeline", "goalDescription",
      "startDate", "duration", "sessionFrequency",
      "diet", "calories", "protein", "carbs", "fats",
      "mealsPerDay", "waterTarget", "cheatMeals",
      "foodDislikes", "eatingHabits",
      "privateNotes",
    ];
    for (const k of expectedKeys) {
      expect(res.value).toHaveProperty(k);
    }
    expect(res.value.email).toBe("test@fitos.app");
    // Backend derives age from dob when age is omitted.
    expect(typeof res.value.age).toBe("number");
    expect(res.value.dob instanceof Date).toBe(true);
  });

  test("computes age from dob automatically", () => {
    // 30 years ago — should resolve to 29 or 30 depending on leap years.
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
    const res = validateClientPayload({ ...baseline(), dob: thirtyYearsAgo.toISOString() });
    expect(res.ok).toBe(true);
    expect(res.value.age).toBeGreaterThanOrEqual(29);
    expect(res.value.age).toBeLessThanOrEqual(30);
  });

  test("rejects future dob", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const res = validateClientPayload({ ...baseline(), dob: future.toISOString() });
    expect(res.ok).toBe(false);
    expect(res.errors.dob).toBeDefined();
  });

  test("rejects oversized free-text fields", () => {
    const oversized = "x".repeat(2001);
    const res = validateClientPayload({ ...baseline(), goalDescription: oversized });
    expect(res.ok).toBe(false);
    expect(res.errors.goalDescription).toBeDefined();
  });

  test("rejects oversized privateNotes", () => {
    const res = validateClientPayload({ ...baseline(), privateNotes: "x".repeat(4001) });
    expect(res.ok).toBe(false);
    expect(res.errors.privateNotes).toBeDefined();
  });

  test("accepts privateNotes at the limit", () => {
    const res = validateClientPayload({ ...baseline(), privateNotes: "x".repeat(4000) });
    expect(res.ok).toBe(true);
    expect(res.value.privateNotes.length).toBe(4000);
  });

  test("drops empty optional text fields silently", () => {
    const res = validateClientPayload({
      ...baseline(),
      medicalConditions: "",
      privateNotes: "   ",
    });
    expect(res.ok).toBe(true);
    expect(res.value.medicalConditions).toBeUndefined();
    expect(res.value.privateNotes).toBeUndefined();
  });
});
