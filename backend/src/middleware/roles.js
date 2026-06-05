"use strict";

const ApiError = require("../utils/ApiError");

function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden"));
    }
    next();
  };
}

module.exports = { allowRoles };
