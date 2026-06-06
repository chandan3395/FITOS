"use strict";

const uploadService = require("../services/upload.service");
const ApiResponse = require("../utils/ApiResponse");

async function sign(req, res, next) {
  try {
    const payload = await uploadService.signProgressPhoto(req.user, req.body);
    return ApiResponse.ok(res, "Upload signed", payload);
  } catch (e) { next(e); }
}

module.exports = { sign };
