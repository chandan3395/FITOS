"use strict";

const { validateWorkoutPayload } = require("../../src/validators/workoutPayload.validator");

const okPayload = () => ({
  planName: "Strength Foundation",
  goal: "Build full-body strength",
  durationWeeks: 8,
  notes: "Progress load only when form is consistent.",
  exercises: [
    {
      name: "Goblet Squat",
      sets: 4,
      reps: 10,
      weight: 24,
      restSeconds: 90,
      dayNumber: 1,
      order: 1,
      notes: "Pause at depth."
    }
  ]
});

describe("validateWorkoutPayload", () => {
  test("accepts and cleans a full workout plan", () => {
    const res = validateWorkoutPayload(okPayload());

    expect(res.ok).toBe(true);
    expect(res.value.planName).toBe("Strength Foundation");
    expect(res.value.durationWeeks).toBe(8);
    expect(res.value.exercises[0].sets).toBe(4);
  });

  test("requires a plan name for creates", () => {
    const body = okPayload();
    delete body.planName;

    const res = validateWorkoutPayload(body);

    expect(res.ok).toBe(false);
    expect(res.errors.planName).toBe("Plan name is required.");
  });

  test("partial mode allows plan-level patches without a plan name", () => {
    const res = validateWorkoutPayload({ notes: "Updated notes" }, { partial: true });

    expect(res.ok).toBe(true);
    expect(res.value.notes).toBe("Updated notes");
  });

  test("requires exercise names even during partial plan updates", () => {
    const res = validateWorkoutPayload({ exercises: [{ sets: 3, reps: 10 }] }, { partial: true });

    expect(res.ok).toBe(false);
    expect(res.errors["exercises[0].name"]).toBe("Exercise name is required.");
  });

  test.each([
    ["sets", 0],
    ["sets", 21],
    ["reps", 0],
    ["reps", 101],
    ["weight", -1],
    ["restSeconds", -1],
    ["restSeconds", 601]
  ])("rejects out-of-range %s=%p", (field, badValue) => {
    const body = okPayload();
    body.exercises[0][field] = badValue;

    const res = validateWorkoutPayload(body);

    expect(res.ok).toBe(false);
    expect(res.errors[`exercises[0].${field}`]).toBeDefined();
  });

  test("normalizes status values", () => {
    const res = validateWorkoutPayload({ status: "archived" }, { partial: true });

    expect(res.ok).toBe(true);
    expect(res.value.status).toBe("ARCHIVED");
  });
});
