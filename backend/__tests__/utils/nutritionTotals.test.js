"use strict";

const {
  sumMacros,
  dayTotals,
  weeklyTotals,
  consumedFromEntries,
  scheduleMealCountErrors,
  weekdayOf,
} = require("../../src/utils/nutritionTotals");

describe("sumMacros", () => {
  it("sums macros and treats missing/invalid as 0", () => {
    expect(sumMacros([{ calories: 100, protein: 10 }, { calories: 50, carbs: 5 }, {}])).toEqual({
      calories: 150,
      protein: 10,
      carbs: 5,
      fats: 0,
    });
  });
  it("returns zeros for empty/undefined", () => {
    expect(sumMacros()).toEqual({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  });
});

describe("dayTotals (daily target = sum of that day's meals)", () => {
  it("sums every meal in the day", () => {
    const day = {
      day: "Monday",
      meals: [
        { mealType: "Breakfast", calories: 300, protein: 30, carbs: 40, fats: 8 },
        { mealType: "Lunch", calories: 600, protein: 50, carbs: 60, fats: 20 },
      ],
    };
    expect(dayTotals(day)).toEqual({ calories: 900, protein: 80, carbs: 100, fats: 28 });
  });
  it("zeros for a day with no meals", () => {
    expect(dayTotals({ day: "Tuesday", meals: [] })).toEqual({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  });
});

describe("weeklyTotals", () => {
  it("sums across all days", () => {
    const schedule = [
      { day: "Monday", meals: [{ calories: 100, protein: 10 }] },
      { day: "Tuesday", meals: [{ calories: 200, fats: 5 }] },
    ];
    expect(weeklyTotals(schedule)).toEqual({ calories: 300, protein: 10, carbs: 0, fats: 5 });
  });
});

describe("consumedFromEntries (reviewed-only)", () => {
  const entries = [
    { status: "reviewed", plannedMacros: { calories: 300, protein: 30 } },
    { status: "pending", plannedMacros: { calories: 500, protein: 40 } },
    { status: "action_required", plannedMacros: { calories: 400, protein: 35 } },
    { status: "reviewed", plannedMacros: { calories: 200, carbs: 10 } },
  ];
  it("counts ONLY reviewed entries", () => {
    expect(consumedFromEntries(entries)).toEqual({ calories: 500, protein: 30, carbs: 10, fats: 0 });
  });
  it("zeros when nothing is reviewed", () => {
    expect(consumedFromEntries([{ status: "pending", plannedMacros: { calories: 999 } }])).toEqual({
      calories: 0, protein: 0, carbs: 0, fats: 0,
    });
  });
});

describe("scheduleMealCountErrors (publish rule — mealsPerDay is a CEILING)", () => {
  it("flags ONLY days that EXCEED mealsPerDay (fewer is valid)", () => {
    const schedule = [
      { day: "Monday", meals: [{}, {}, {}] },       // 3 — ok (== cap)
      { day: "Tuesday", meals: [{}, {}] },          // 2 — ok (under cap, now VALID)
      { day: "Wednesday", meals: [] },              // 0 — ok (unpopulated)
      { day: "Thursday", meals: [{}, {}, {}, {}] }, // 4 — bad (over cap)
    ];
    expect(scheduleMealCountErrors(schedule, 3)).toEqual([{ day: "Thursday", count: 4 }]);
  });
  it("allows 1..mealsPerDay meals and empty days", () => {
    const schedule = [
      { day: "Monday", meals: [{}] },     // 1 — ok (under cap)
      { day: "Friday", meals: [{}, {}] }, // 2 — ok (== cap)
      { day: "Sunday", meals: [] },       // 0 — ok
    ];
    expect(scheduleMealCountErrors(schedule, 2)).toEqual([]);
  });
});

describe("weekdayOf", () => {
  it("maps UTC dates to Monday-first weekday names", () => {
    expect(weekdayOf(new Date("2024-01-01T00:00:00Z"))).toBe("Monday"); // Mon
    expect(weekdayOf(new Date("2024-01-06T00:00:00Z"))).toBe("Saturday");
    expect(weekdayOf(new Date("2024-01-07T00:00:00Z"))).toBe("Sunday");
  });
});
