"use strict";
const { AsyncLocalStorage } = require("node:async_hooks");
const { User } = require("../schemas/User.schema");
const ApiError = require("./ApiError");
const scope = new AsyncLocalStorage();
// Missing versions deliberately mean zero for pre-migration accounts/tokens.
const versionOf = (user) => user.sessionVersion ?? 0;
const matches = (user, token) =>
  Number.isSafeInteger(token.sv ?? 0) && (token.sv ?? 0) === versionOf(user);
const versionFilter = (version) =>
  version === 0
    ? { $or: [{ sessionVersion: 0 }, { sessionVersion: { $exists: false } }] }
    : { sessionVersion: version };
async function assertCurrent() {
  const session = scope.getStore();
  // Background cleanup has no browser session and never grants API access.
  if (!session) return;
  if (
    !(await User.exists({
      _id: session.id,
      role: session.role,
      isActive: true,
      ...versionFilter(session.version),
    }))
  )
    throw new ApiError(401, "Session revoked or account disabled. Please sign in again.");
}
module.exports = { scope, versionOf, matches, versionFilter, assertCurrent };
