"use strict";
const { EventEmitter } = require("events");
const capacity = require("../../src/middleware/byotMediaCapacity");
const response = () =>
  Object.assign(new EventEmitter(), {
    locals: {},
    set: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  });
it("bounds simultaneous buffered media work and releases reservations exactly once", () => {
  const guard = capacity(2),
    next = jest.fn();
  const a = response(),
    b = response(),
    c = response();
  guard({}, a, next);
  guard({}, b, next);
  guard({}, c, next);
  expect(next).toHaveBeenCalledTimes(2);
  expect(c.status).toHaveBeenCalledWith(503);
  expect(c.set).toHaveBeenCalledWith("Retry-After", "5");
  a.emit("close"); // A disconnect must not permit more processing while Sharp is still working.
  guard({}, response(), next);
  expect(next).toHaveBeenCalledTimes(2);
  a.locals.releaseMediaCapacity();
  a.emit("finish");
  guard({}, response(), next);
  expect(next).toHaveBeenCalledTimes(3);
  guard({}, response(), next);
  expect(next).toHaveBeenCalledTimes(3);
  b.emit("finish");
  guard({}, response(), next);
  expect(next).toHaveBeenCalledTimes(4);
});
