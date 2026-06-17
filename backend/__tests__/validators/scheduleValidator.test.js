"use strict";

const { validateSchedule } = require("../../src/validators/scheduleValidator");

describe("validateSchedule", () => {
  it("accepts a valid schedule and cleans dishes + parses macros", () => {
    const { value, errors } = validateSchedule([
      {
        day: "Monday",
        meals: [
          { mealType: "Breakfast", dishes: [" Rice ", "Chicken", ""], calories: "300", protein: 30 },
        ],
      },
    ]);
    expect(errors).toEqual({});
    expect(value[0].day).toBe("Monday");
    expect(value[0].meals[0].dishes).toEqual(["Rice", "Chicken"]); // trimmed, empties dropped
    expect(value[0].meals[0].calories).toBe(300); // string parsed
    expect(value[0].meals[0].carbs).toBe(0); // unset macro → 0
    expect(value[0].meals[0].fats).toBe(0);
  });

  it("allows fewer meals than mealsPerDay (DRAFT-friendly) and empty days", () => {
    const { value, errors } = validateSchedule([{ day: "Tuesday", meals: [] }]);
    expect(errors).toEqual({});
    expect(value[0].meals).toEqual([]);
  });

  it("rejects a non-array schedule", () => {
    const { errors } = validateSchedule("nope");
    expect(errors.schedule).toBeDefined();
  });

  it("rejects duplicate weekdays", () => {
    const { errors } = validateSchedule([
      { day: "Monday", meals: [] },
      { day: "Monday", meals: [] },
    ]);
    expect(errors["schedule[1].day"]).toMatch(/Duplicate/);
  });

  it("rejects an invalid weekday", () => {
    const { errors } = validateSchedule([{ day: "Funday", meals: [] }]);
    expect(errors["schedule[0].day"]).toBeDefined();
  });

  it("rejects an invalid mealType", () => {
    const { errors } = validateSchedule([{ day: "Monday", meals: [{ mealType: "Brunch" }] }]);
    expect(errors["schedule[0].meals[0].mealType"]).toBeDefined();
  });

  it("rejects out-of-range per-meal macros", () => {
    const { errors } = validateSchedule([
      { day: "Monday", meals: [{ mealType: "Lunch", calories: 99999 }] },
    ]);
    expect(errors["schedule[0].meals[0].calories"]).toBeDefined();
  });

  it("rejects non-string dishes", () => {
    const { errors } = validateSchedule([
      { day: "Monday", meals: [{ mealType: "Snack", dishes: [42] }] },
    ]);
    expect(errors["schedule[0].meals[0].dishes"]).toBeDefined();
  });
});
