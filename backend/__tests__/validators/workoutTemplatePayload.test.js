"use strict";

const { validateWorkoutTemplatePayload } = require("../../src/validators/workoutTemplatePayload.validator");

const ok = () => ({
  name: "Push Pull Legs — Beginner",
  description: "3-day split for new lifters",
  durationWeeks: 6,
  notes: "Add a deload week between phases.",
  exercises: [{ name: "Goblet Squat", sets: 4, reps: 10, weight: 24, restSeconds: 90, dayNumber: 1, order: 1 }],
});

describe("validateWorkoutTemplatePayload", () => {
  test("accepts a full payload", () => {
    const res = validateWorkoutTemplatePayload(ok());
    expect(res.ok).toBe(true);
    expect(res.value.name).toBe("Push Pull Legs — Beginner");
    expect(res.value.exercises[0].sets).toBe(4);
  });

  test("requires template name on create", () => {
    const body = ok(); delete body.name;
    const res = validateWorkoutTemplatePayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors.name).toBe("Template name is required.");
  });

  test("partial mode allows updates without name", () => {
    const res = validateWorkoutTemplatePayload({ notes: "updated" }, { partial: true });
    expect(res.ok).toBe(true);
    expect(res.value.notes).toBe("updated");
  });

  test("status normalizes to uppercase", () => {
    const res = validateWorkoutTemplatePayload({ status: "archived" }, { partial: true });
    expect(res.ok).toBe(true);
    expect(res.value.status).toBe("ARCHIVED");
  });

  test("status rejects DRAFT (templates only have ACTIVE/ARCHIVED)", () => {
    const res = validateWorkoutTemplatePayload({ status: "DRAFT" }, { partial: true });
    expect(res.ok).toBe(false);
    expect(res.errors.status).toBeDefined();
  });

  test("durationWeeks must be within 1..52", () => {
    const res1 = validateWorkoutTemplatePayload({ durationWeeks: 0 }, { partial: true });
    const res2 = validateWorkoutTemplatePayload({ durationWeeks: 53 }, { partial: true });
    expect(res1.ok).toBe(false);
    expect(res2.ok).toBe(false);
  });

  test("exercises must have a name", () => {
    const res = validateWorkoutTemplatePayload({ exercises: [{ sets: 3, reps: 10 }] }, { partial: true });
    expect(res.ok).toBe(false);
    expect(res.errors["exercises[0].name"]).toBeDefined();
  });

  test.each([
    ["sets", 21],
    ["reps", 0],
    ["weight", -1],
    ["restSeconds", 601],
  ])("rejects out-of-range exercise %s=%p", (field, badValue) => {
    const body = ok(); body.exercises[0][field] = badValue;
    const res = validateWorkoutTemplatePayload(body);
    expect(res.ok).toBe(false);
    expect(res.errors[`exercises[0].${field}`]).toBeDefined();
  });
});
