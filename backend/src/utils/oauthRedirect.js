"use strict";

/**
 * Build the post-OAuth redirect URL for the client platform that started the
 * flow. One shared OAuth pipeline serves two destinations:
 *
 *   - web (default): the existing React callback page receives the token on the
 *     URL FRAGMENT (`#token=...&role=...`) — unchanged behaviour.
 *   - mobile (Flutter): the token is delivered as QUERY params on the
 *     `fitos://auth-callback` custom scheme so the in-app browser sheet
 *     deep-links back into the app.
 *
 * Pure string-building (no Express / env access) so it can be unit-tested.
 *
 * @param {Object}  args
 * @param {string} [args.platform]      "mobile" selects the deep link; anything else → web
 * @param {string}  args.accessToken    JWT access token to hand to the client
 * @param {string}  args.role           the user's role (carried for client routing)
 * @param {string}  args.clientOrigin   web frontend origin (CLIENT_ORIGIN)
 * @param {string}  args.mobileCallback mobile custom-scheme callback (MOBILE_CALLBACK)
 * @returns {string} the absolute redirect URL
 */
function buildOAuthRedirectUrl({ platform, accessToken, role, clientOrigin, mobileCallback }) {
  const params = new URLSearchParams({ token: accessToken, role });
  if (platform === "mobile") {
    return `${mobileCallback}?${params.toString()}`;
  }
  return `${clientOrigin}/auth/google/callback#${params.toString()}`;
}

module.exports = { buildOAuthRedirectUrl };
