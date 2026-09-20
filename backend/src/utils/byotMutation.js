"use strict";
const { createHash } = require("crypto");
const ApiError = require("./ApiError");
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])])
    );
  return value;
}
// CAS + receipts live in the SAME document: no partial mutation/receipt commit.
// Old retries outside the bounded receipt window still fail their stale version.
async function mutate(Model, query, body, key, operation, build) {
  const hash = createHash("sha256")
    .update(JSON.stringify({ operation, body: canonical(body) }))
    .digest("hex");
  const old = await Model.findOne(query).select("+receipts").lean();
  function replay(doc) {
    const receipt = doc?.receipts.find((item) => item.key === key);
    if (!receipt) return false;
    if (receipt.hash !== hash)
      throw new ApiError(409, "This request key was already used for different changes");
    return true;
  }
  if (replay(old)) return old;
  if ((old?.version || 0) !== body.version)
    throw new ApiError(
      409,
      "A newer version was saved. Your edits are preserved; reload the saved version before editing again."
    );
  const fields = await build(old);
  // Provider work may outlive the request's initial authentication check.
  await require("./session").assertCurrent();
  const receipts = [...(old?.receipts || []), { key, hash }].slice(-100);
  try {
    if (!old) return (await Model.create({ ...query, ...fields, version: 1, receipts })).toObject();
    const saved = await Model.findOneAndUpdate(
      { ...query, version: body.version },
      { $set: { ...fields, receipts }, $inc: { version: 1 } },
      { returnDocument: "after" }
    ).lean();
    if (saved) return saved;
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
  const current = await Model.findOne(query).select("+receipts").lean();
  if (replay(current)) return current;
  throw new ApiError(
    409,
    "A newer version was saved. Reload the saved version before editing again."
  );
}
module.exports = mutate;
