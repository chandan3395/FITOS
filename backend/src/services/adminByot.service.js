"use strict";
const { User } = require("../schemas/User.schema");
const ApiError = require("../utils/ApiError");
const projection = { _id: 1, name: 1, email: 1, createdAt: 1, lastActiveAt: 1, isActive: 1 };
const row = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  createdAt: u.createdAt,
  lastActiveAt: u.lastActiveAt ?? null,
  isActive: u.isActive,
});
const fail = (message) => {
  throw new ApiError(400, message);
};
function integer(value, fallback, max) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
    fail("Invalid pagination");
  return Number(value);
}
async function list(query) {
  if (Object.keys(query).some((k) => !["page", "limit", "search", "status"].includes(k)))
    fail("Unsupported query field");
  const page = integer(query.page, 1, 10000);
  const limit = integer(query.limit, 20, 100);
  if (query.search !== undefined && (typeof query.search !== "string" || query.search.length > 100))
    fail("Search must be at most 100 characters");
  const status = query.status ?? "all";
  if (!["all", "active", "disabled"].includes(status)) fail("Invalid status filter");
  const filter = { role: "BYOT" };
  if (status !== "all") filter.isActive = status === "active";
  const search = query.search?.trim();
  if (search) {
    const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["name", "email"].map((k) => ({ [k]: { $regex: literal, $options: "i" } }));
  }
  const [users, total] = await Promise.all([
    User.find(filter)
      .select(projection)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .maxTimeMS(5000)
      .lean(),
    User.countDocuments(filter).maxTimeMS(5000),
  ]);
  return { items: users.map(row), total, page, limit, pages: Math.ceil(total / limit) };
}
async function setActive(id, body) {
  if (!/^[a-f\d]{24}$/i.test(id)) fail("Invalid account ID");
  if (
    !body ||
    Array.isArray(body) ||
    Object.keys(body).length !== 2 ||
    Object.keys(body).some((k) => !["isActive", "expectedIsActive"].includes(k)) ||
    typeof body.isActive !== "boolean" ||
    typeof body.expectedIsActive !== "boolean"
  )
    fail("isActive and expectedIsActive must be booleans; no other fields are accepted");
  await require("../utils/session").assertCurrent();
  const update = { $set: { isActive: body.isActive, refreshToken: null } };
  if (!body.isActive) update.$inc = { sessionVersion: 1 };
  // Desired-state retry does not revoke a freshly established session again.
  const saved =
    body.isActive !== body.expectedIsActive &&
    (await User.findOneAndUpdate(
      { _id: id, role: "BYOT", isActive: body.expectedIsActive },
      update,
      { returnDocument: "after", projection }
    ).lean());
  if (saved) return row(saved);
  const current = await User.findOne({ _id: id, role: "BYOT" }).select(projection).lean();
  if (!current) throw new ApiError(404, "BYOT account not found");
  if (current.isActive === body.isActive) return row(current);
  throw new ApiError(409, "Account status changed. Reload the list before trying again.");
}
module.exports = { list, setActive };
