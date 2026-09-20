"use strict";
const { User } = require("../schemas/User.schema");
module.exports = (action) => async (req, res, next) => {
  try {
    const data = await action(req);
    await require("../utils/session").assertCurrent();
    const now = new Date();
    await User.updateOne(
      {
        _id: req.user._id,
        $or: [{ lastActiveAt: null }, { lastActiveAt: { $lt: new Date(now - 15 * 60 * 1000) } }],
      },
      { $set: { lastActiveAt: now } }
    );
    res.set("Cache-Control", "no-store").json({ success: true, data });
  } catch (err) {
    next(err);
  } finally {
    res.locals.releaseMediaCapacity?.();
  }
};
