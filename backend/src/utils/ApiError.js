"use strict";

/**
 * ApiError — structured error for the express pipeline.
 *
 * @param statusCode  HTTP status to send.
 * @param message     Human-readable summary (always sent in the response).
 * @param errors      Optional `{ fieldName: "message" }` map. When present,
 *                    the global error handler surfaces it alongside the
 *                    success/message envelope so the client can render
 *                    per-field validation errors without parsing strings.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = undefined) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    if (errors && typeof errors === "object") {
      this.errors = errors;
    }
  }

  /** Sugar for the most common case — 400 validation failure. */
  static validation(errors, message = "Validation failed") {
    return new ApiError(400, message, errors);
  }
}

module.exports = ApiError;
