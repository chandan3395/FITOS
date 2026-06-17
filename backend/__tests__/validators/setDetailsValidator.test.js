"use strict";

const { validateSetDetails } = require("../../src/validators/setDetailsValidator");

describe("validateSetDetails", () => {
  it("accepts a valid array and parses numbers", () => {
    const { value, errors } = validateSetDetails([
      { setNumber: 1, weight: "50", reps: "10", restSeconds: "90" },
      { setNumber: 2, weight: 60, reps: 8 },
    ]);
    expect(errors).toEqual({});
    expect(value[0]).toEqual({ setNumber: 1, weight: 50, reps: 10, restSeconds: 90 });
    expect(value[1]).toEqual({ setNumber: 2, weight: 60, reps: 8, restSeconds: 0 });
  });

  it("auto-assigns setNumber from position when omitted", () => {
    const { value, errors } = validateSetDetails([{ weight: 40, reps: 12 }, { weight: 45, reps: 10 }]);
    expect(errors).toEqual({});
    expect(value.map((s) => s.setNumber)).toEqual([1, 2]);
  });

  it("defaults missing weight/reps/restSeconds to 0 (DRAFT-friendly)", () => {
    const { value, errors } = validateSetDetails([{ setNumber: 1 }]);
    expect(errors).toEqual({});
    expect(value[0]).toEqual({ setNumber: 1, weight: 0, reps: 0, restSeconds: 0 });
  });

  it("rejects a non-array", () => {
    expect(validateSetDetails("nope").errors.setDetails).toBeDefined();
  });

  it("rejects more than 20 sets", () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ setNumber: i + 1, weight: 10, reps: 5 }));
    expect(validateSetDetails(many).errors.setDetails).toBeDefined();
  });

  it("rejects a negative weight", () => {
    const { errors } = validateSetDetails([{ setNumber: 1, weight: -5, reps: 10 }]);
    expect(errors["setDetails[0].weight"]).toBeDefined();
  });

  it("rejects out-of-range reps", () => {
    const { errors } = validateSetDetails([{ setNumber: 1, weight: 50, reps: 999 }]);
    expect(errors["setDetails[0].reps"]).toBeDefined();
  });

  it("rejects an invalid setNumber", () => {
    const { errors } = validateSetDetails([{ setNumber: 0, weight: 50, reps: 10 }]);
    expect(errors["setDetails[0].setNumber"]).toBeDefined();
  });
});
