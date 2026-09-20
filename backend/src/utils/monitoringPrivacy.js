"use strict";

// Authentication and personal tracking requests must never reach external
// monitoring, including validation failures and onboarding bodies.
const sensitiveUrl = value => typeof value === "string" &&
  /(?:\/api\/(?:auth|byot|admin\/byot-users)(?:\/|\?|$)|cloudinary\.com)/i.test(value);

function beforeBreadcrumb(breadcrumb) {
  return sensitiveUrl(breadcrumb.data?.url) ? null : breadcrumb;
}

function beforeSend(event) {
  if (sensitiveUrl(event.request?.url)) return null;
  // Strip credentials/body data even on unrelated routes. This is defence in
  // depth; hosting access logs and monitoring integrations need separate checks.
  if (event.request) {
    event.request = { method: event.request.method,
      url: typeof event.request.url === "string" ? event.request.url.split(/[?#]/)[0] : undefined };
  }
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.filter(beforeBreadcrumb);
  return event;
}

module.exports = { beforeSend, beforeBreadcrumb };
