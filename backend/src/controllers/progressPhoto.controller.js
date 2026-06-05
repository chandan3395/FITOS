"use strict";

const progressPhotoService = require("../services/progressPhoto.service");
const ApiResponse = require("../utils/ApiResponse");

async function create(req, res, next) {
  try {
    const doc = await progressPhotoService.create(req.user, req.body, req.files || {});
    return ApiResponse.created(res, "Progress photos uploaded", { photo: doc });
  } catch (e) { next(e); }
}

async function listForClient(req, res, next) {
  try {
    const docs = await progressPhotoService.listForClient(req.params.id, req.user);
    return ApiResponse.ok(res, "Photos fetched", { photos: docs });
  } catch (e) { next(e); }
}

async function comment(req, res, next) {
  try {
    const doc = await progressPhotoService.comment(req.params.id, req.user, req.body);
    return ApiResponse.ok(res, "Comment saved", { photo: doc });
  } catch (e) { next(e); }
}

module.exports = { create, listForClient, comment };
