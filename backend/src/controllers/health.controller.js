"use strict";

const ApiResponse = require("../utils/ApiResponse");

const getHealth = (_req, res) => {
  ApiResponse.ok(res, "FITOS backend running");
};

module.exports = { getHealth };
