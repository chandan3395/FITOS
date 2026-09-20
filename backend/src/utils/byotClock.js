"use strict";
// Injectable in isolated tests; no HTTP or environment clock override.
module.exports = { now: () => new Date() };
