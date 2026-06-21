"use strict";

const { buildOAuthRedirectUrl } = require("../../src/utils/oauthRedirect");

const BASE = {
  accessToken: "jwt.abc.123",
  role: "TRAINER",
  clientOrigin: "https://app.fitos.com",
  mobileCallback: "fitos://auth-callback",
};

describe("buildOAuthRedirectUrl", () => {
  it("web (default): token + role on the URL FRAGMENT of the React callback", () => {
    const url = buildOAuthRedirectUrl({ ...BASE });
    expect(url).toBe("https://app.fitos.com/auth/google/callback#token=jwt.abc.123&role=TRAINER");
  });

  it("treats an absent/unknown platform as web (unchanged behaviour)", () => {
    expect(buildOAuthRedirectUrl({ ...BASE, platform: undefined })).toContain("/auth/google/callback#");
    expect(buildOAuthRedirectUrl({ ...BASE, platform: "desktop" })).toContain("/auth/google/callback#");
  });

  it("mobile: token + role as QUERY params on the fitos:// deep link", () => {
    const url = buildOAuthRedirectUrl({ ...BASE, platform: "mobile" });
    expect(url).toBe("fitos://auth-callback?token=jwt.abc.123&role=TRAINER");
  });

  it("mobile carries the CLIENT role for invite-link sign-in", () => {
    const url = buildOAuthRedirectUrl({ ...BASE, role: "CLIENT", platform: "mobile" });
    expect(url).toBe("fitos://auth-callback?token=jwt.abc.123&role=CLIENT");
  });

  it("url-encodes token + role into the params", () => {
    const url = buildOAuthRedirectUrl({ ...BASE, accessToken: "a b/c+d", role: "TRAINER", platform: "mobile" });
    expect(url).toBe("fitos://auth-callback?token=a+b%2Fc%2Bd&role=TRAINER");
  });
});
