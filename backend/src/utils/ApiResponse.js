"use strict";

class ApiResponse {
  static ok(res, message = "Operation successful", data = {}) {
    return res.status(200).json({ success: true, message, data });
  }

  static created(res, message = "Created successfully", data = {}) {
    return res.status(201).json({ success: true, message, data });
  }

  static send(res, statusCode, message, data = {}) {
    return res.status(statusCode).json({ success: true, message, data });
  }
}

module.exports = ApiResponse;
