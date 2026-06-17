"use strict";

const {
  exerciseSetCount,
  exerciseWeights,
  weightSummary,
  exerciseSummary,
  setDetailsPublishErrors,
  cloneSetDetails,
} = require("../../src/utils/workoutSets");

const setDetailed = {
  name: "Bench Press",
  sets: 3,
  setDetails: [
    { setNumber: 1, weight: 50, reps: 10, restSeconds: 90 },
    { setNumber: 2, weight: 60, reps: 8, restSeconds: 90 },
    { setNumber: 3, weight: 70, reps: 6, restSeconds: 120 },
  ],
};
const equalWeights = {
  name: "Squat",
  setDetails: [
    { setNumber: 1, weight: 100, reps: 5 },
    { setNumber: 2, weight: 100, reps: 5 },
  ],
};
const flat = { name: "Deadlift", sets: 4, reps: 5, weight: 120 };
const flatNoWeight = { name: "Plank", sets: 3, reps: 1 };

describe("exerciseSetCount", () => {
  it("uses setDetails length when present", () => {
    expect(exerciseSetCount(setDetailed)).toBe(3);
  });
  it("falls back to the flat sets field", () => {
    expect(exerciseSetCount(flat)).toBe(4);
    expect(exerciseSetCount({ name: "x" })).toBe(0);
  });
});

describe("exerciseWeights", () => {
  it("reads every set weight from setDetails", () => {
    expect(exerciseWeights(setDetailed)).toEqual([50, 60, 70]);
  });
  it("falls back to the single flat weight, or [] when none", () => {
    expect(exerciseWeights(flat)).toEqual([120]);
    expect(exerciseWeights(flatNoWeight)).toEqual([]);
  });
});

describe("weightSummary", () => {
  it("returns a min–max RANGE when set weights differ", () => {
    expect(weightSummary(setDetailed)).toEqual({ min: 50, max: 70, varies: true, display: "50–70" });
  });
  it("returns a SINGLE value when all set weights are equal", () => {
    expect(weightSummary(equalWeights)).toEqual({ min: 100, max: 100, varies: false, display: "100" });
  });
  it("returns a single value for a flat exercise", () => {
    expect(weightSummary(flat)).toEqual({ min: 120, max: 120, varies: false, display: "120" });
  });
  it("returns null when there is no weight info", () => {
    expect(weightSummary(flatNoWeight)).toBeNull();
  });
});

describe("exerciseSummary", () => {
  it("combines set count + weight summary", () => {
    expect(exerciseSummary(setDetailed)).toEqual({
      setCount: 3,
      weight: { min: 50, max: 70, varies: true, display: "50–70" },
    });
  });
});

describe("setDetailsPublishErrors", () => {
  it("returns [] for a valid set-detailed exercise", () => {
    expect(setDetailsPublishErrors(setDetailed)).toEqual([]);
  });
  it("returns [] for a FLAT exercise (back-compat — governed by the old rule)", () => {
    expect(setDetailsPublishErrors(flat)).toEqual([]);
    expect(setDetailsPublishErrors(flatNoWeight)).toEqual([]);
  });
  it("flags a set with negative weight", () => {
    const ex = { name: "x", setDetails: [{ setNumber: 1, weight: -5, reps: 10 }] };
    expect(setDetailsPublishErrors(ex)).toEqual([{ setNumber: 1, reason: "weight" }]);
  });
  it("flags a set with reps < 1", () => {
    const ex = { name: "x", setDetails: [{ setNumber: 1, weight: 50, reps: 0 }] };
    expect(setDetailsPublishErrors(ex)).toEqual([{ setNumber: 1, reason: "reps" }]);
  });
  it("flags both reasons and uses positional setNumber fallback", () => {
    const ex = { name: "x", setDetails: [{ weight: -1, reps: 0 }] };
    expect(setDetailsPublishErrors(ex)).toEqual([
      { setNumber: 1, reason: "weight" },
      { setNumber: 1, reason: "reps" },
    ]);
  });
});

describe("cloneSetDetails", () => {
  it("snapshots by value without _id, undefined for flat exercises", () => {
    expect(cloneSetDetails(equalWeights)).toEqual([
      { setNumber: 1, weight: 100, reps: 5, restSeconds: undefined },
      { setNumber: 2, weight: 100, reps: 5, restSeconds: undefined },
    ]);
    expect(cloneSetDetails(flat)).toBeUndefined();
  });
});
