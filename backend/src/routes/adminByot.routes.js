"use strict";
const router = require("express").Router();
const service = require("../services/adminByot.service");
// Mounted after the shared active ADMIN guard. No personal collection imports.
router.use((_req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  next();
});
const handle = (action) => async (req, res, next) => {
  try {
    const data = await action(req);
    await require("../utils/session").assertCurrent();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
router.get(
  "/",
  handle((req) => service.list(req.query))
);
router.patch(
  "/:id",
  handle((req) => service.setActive(req.params.id, req.body))
);
module.exports = router;
