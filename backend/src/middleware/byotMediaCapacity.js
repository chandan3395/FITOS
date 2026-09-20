"use strict";
// Bound buffered image work per web process; no unbounded in-memory wait queue.
module.exports = (limit) => {
  let active = 0;
  return (_req, res, next) => {
    if (active >= limit)
      return res
        .set("Retry-After", "5")
        .status(503)
        .json({
          success: false,
          message: "Photo service is busy. Your saved photos are safe; retry shortly.",
        });
    active++;
    let released = false;
    const release = () => {
      if (!released) {
        active--;
        released = true;
      }
    };
    res.once("finish", release);
    // Handlers release after processing, including when the browser disconnects.
    res.locals.releaseMediaCapacity = release;
    next();
  };
};
