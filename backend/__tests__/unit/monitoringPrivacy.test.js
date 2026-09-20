"use strict";
const { beforeSend, beforeBreadcrumb } = require("../../src/utils/monitoringPrivacy");
jest.mock("pino-http", () => ({ pinoHttp: jest.fn(options => options) }));
const logging = require("../../src/middleware/requestLogger");

test.each(["/api/byot/onboarding", "/api/byot/profile", "/api/byot/progress/checkins",
  "/api/byot/workouts", "/api/byot/nutrition", "/api/admin/byot-users",
  "/api/auth/google/callback?code=synthetic-secret", "/api/auth/invite/synthetic-secret/activate"])(
  "excludes sensitive monitoring request and breadcrumb %s", path => {
    const url = `https://example.test${path}`;
    expect(beforeSend({ request: { url, data: { weight: 70 } } })).toBeNull();
    expect(beforeBreadcrumb({ data: { url } })).toBeNull();
  });
test("unrelated errors retain diagnostics without request credentials, bodies or sensitive breadcrumbs", () => {
  const result = beforeSend({ message: "ordinary failure", request: {
    method: "GET", url: "https://example.test/api/health?secret=synthetic", cookies: "synthetic",
    headers: { authorization: "synthetic" }, data: { private: "synthetic" },
  }, breadcrumbs: [{ data: { url: "https://res.cloudinary.com/private" } }, { message: "safe" }] });
  expect(result).toEqual({ message: "ordinary failure", request: { method: "GET", url: "https://example.test/api/health" }, breadcrumbs: [{ message: "safe" }] });
});
test("invitation paths and caller request IDs cannot leak credentials into request logs", () => {
  const req = { method: "GET", url: "/api/auth/invite/synthetic-secret?code=synthetic", headers: { "x-request-id": "synthetic-secret" } };
  expect(logging.serializers.req(req).url).toBe("/api/auth/invite/[private]");
  // Express routes are case-insensitive by default.
  expect(logging.serializers.req({ ...req, url: "/API/AUTH/INVITE/synthetic-secret" }).url).toBe("/api/auth/invite/[private]");
  expect(logging.customSuccessMessage(req, { statusCode: 200 })).not.toContain("synthetic");
  expect(logging.genReqId(req, { setHeader: jest.fn() })).not.toContain("synthetic");
});
