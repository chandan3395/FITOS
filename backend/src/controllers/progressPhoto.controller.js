"use strict";

const progressPhotoService = require("../services/progressPhoto.service");
const ApiResponse = require("../utils/ApiResponse");

async function create(req, res, next) {
  try {
    // Image bytes are uploaded directly to Cloudinary by the browser; the
    // body now carries only metadata (clientId/weekNumber + per-slot publicIds).
    const doc = await progressPhotoService.create(req.user, req.body);
    return ApiResponse.created(res, "Progress photos uploaded", { photo: doc });
  } catch (e) { next(e); }
}

async function listForClient(req, res, next) {
  try {
    const docs = await progressPhotoService.listForClient(req.params.id, req.user);
    return ApiResponse.ok(res, "Photos fetched", { photos: docs });
  } catch (e) { next(e); }
}

async function listForCurrentClient(req, res, next) {
  try {
    const docs = await progressPhotoService.listForCurrentClient(req.user);
    return ApiResponse.ok(res, "Photos fetched", { photos: docs });
  } catch (e) { next(e); }
}

async function comment(req, res, next) {
  try {
    const doc = await progressPhotoService.comment(req.params.id, req.user, req.body);
    return ApiResponse.ok(res, "Comment saved", { photo: doc });
  } catch (e) { next(e); }
}

async function setStatus(req, res, next) {
  try {
    const doc = await progressPhotoService.setStatus(req.params.id, req.user, req.body);
    return ApiResponse.ok(res, "Status updated", { photo: doc });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const result = await progressPhotoService.remove(req.params.id, req.user);
    return ApiResponse.ok(res, "Progress photo deleted", result);
  } catch (e) { next(e); }
}

module.exports = { create, listForClient, listForCurrentClient, comment, setStatus, remove };
