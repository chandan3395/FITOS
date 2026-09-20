"use strict";
const { Router, raw } = require("express");
const { rateLimit } = require("express-rate-limit");
const handle = require("../middleware/byotResponse");
const service = require("../services/byotProgress.service");
const photos = require("../services/byotPhoto.service");
const { MAX_BYTES } = require("../services/byotMediaProvider");
const { User } = require("../schemas/User.schema");
const ApiError = require("../utils/ApiError");
const router = Router();
const capacity = require("../middleware/byotMediaCapacity");
const uploadCapacity = capacity(2);
const downloadCapacity = capacity(4);
// Parent router has already enforced bearer authentication and active BYOT role.
router.use((_req, res, next) => {
  res.set({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  next();
});
router.get(
  "/summary",
  handle((req) => service.summary(req.user._id))
);
router.get(
  "/records",
  handle((req) => service.history(req.user._id, req.query))
);
router.get(
  "/records/:date",
  handle((req) => service.read(req.user._id, req.params.date))
);
router.put(
  "/records/:date",
  handle((req) => service.save(req.user._id, req.params.date, req.body, req.get("Idempotency-Key")))
);
router.delete(
  "/records/:date",
  handle((req) =>
    service.remove(req.user._id, req.params.date, req.body, req.get("Idempotency-Key"))
  )
);
router.put(
  "/checkins/:date",
  handle((req) =>
    service.save(req.user._id, req.params.date, req.body, req.get("Idempotency-Key"), true)
  )
);
router.delete(
  "/checkins/:date",
  handle((req) =>
    service.remove(req.user._id, req.params.date, req.body, req.get("Idempotency-Key"), true)
  )
);
router.post(
  "/checkins/:date/complete",
  handle((req) =>
    service.complete(req.user._id, req.params.date, req.body, req.get("Idempotency-Key"))
  )
);
const uploadLimit = rateLimit({
  windowMs: 3600000,
  limit: 60,
  keyGenerator: (req) => String(req.user._id),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many photo requests. Try again later." },
});
router.post(
  "/checkins/:date/photos/:slot/init",
  uploadLimit,
  handle((req) =>
    photos.init(
      req.user._id,
      req.params.date,
      req.params.slot,
      req.body,
      req.get("Idempotency-Key")
    )
  )
);
router.post(
  "/uploads/:id/content",
  uploadLimit,
  uploadCapacity,
  raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: MAX_BYTES }),
  handle((req) =>
    photos.upload(req.user._id, req.params.id, req.body, req.get("Content-Type")?.split(";")[0])
  )
);
router.post(
  "/checkins/:date/photos/:slot/attach",
  handle((req) =>
    photos.attach(
      req.user._id,
      req.params.date,
      req.params.slot,
      req.body,
      req.get("Idempotency-Key")
    )
  )
);
router.delete(
  "/checkins/:date/photos/:slot",
  handle((req) =>
    photos.remove(
      req.user._id,
      req.params.date,
      req.params.slot,
      req.body,
      req.get("Idempotency-Key")
    )
  )
);
router.get("/checkins/:date/photos/:slot/:size", downloadCapacity, async (req, res, next) => {
  try {
    const bytes = await photos.deliver(
      req.user._id,
      req.params.date,
      req.params.slot,
      req.params.size
    );
    // Recheck after a provider request as well, including account disable during download.
    await require("../utils/session").assertCurrent();
    if (!(await User.exists({ _id: req.user._id, role: "BYOT", isActive: true })))
      throw new ApiError(401, "Unauthorized");
    const now = new Date();
    await User.updateOne(
      {
        _id: req.user._id,
        $or: [{ lastActiveAt: null }, { lastActiveAt: { $lt: new Date(now - 900000) } }],
      },
      { $set: { lastActiveAt: now } }
    );
    res.type("image/jpeg").send(bytes);
  } catch (err) {
    next(err);
  } finally {
    res.locals.releaseMediaCapacity?.();
  }
});
module.exports = router;
