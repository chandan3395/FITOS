"use strict";
jest.mock("pino-http", () => ({ pinoHttp: jest.fn((options) => options) }));
const options = require("../../src/middleware/requestLogger");
it("redacts progress routes, photo paths, query secrets and bodies from request logs", () => {
  const req = {
    id: "safe-id",
    method: "POST",
    url: "/api/byot/progress/checkins/2026-09-20/photos/front/original?token=secret",
    body: { notes: "private" },
    headers: { authorization: "secret" },
  };
  const result = options.serializers.req(req);
  expect(result).toEqual({ id: "safe-id", method: "POST", url: "/api/byot/progress/[private]" });
  expect(options.customSuccessMessage(req, { statusCode: 200 })).toBe(
    "POST /api/byot/progress/[private] 200"
  );
  expect(options.serializers.err({ type: "Error", message: "private-url" })).toEqual({
    type: "Error",
    message: "Request failed",
  });
  const res = { setHeader: jest.fn() };
  const id = options.genReqId({ ...req, headers: { "x-request-id": "private-payload" } }, res);
  expect(id).not.toContain("private-payload");
});
