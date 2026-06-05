"use strict";

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const ApiError = require("../utils/ApiError");

const UPLOAD_ROOT = path.join(__dirname, "../../uploads");

// Ensure the destination exists at startup; multer will fail otherwise.
if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const rand = crypto.randomBytes(8).toString("hex");
    cb(null, `${Date.now()}-${rand}${ext}`);
  },
});

const ALLOWED_MIME = /^image\/(png|jpe?g|webp|gif)$/i;

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.test(file.mimetype)) {
    return cb(new ApiError(400, "Only image uploads are allowed"));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = { upload, UPLOAD_ROOT };
