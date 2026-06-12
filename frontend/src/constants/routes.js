export const ROUTES = {
  // Public
  HOME:             "/",
  LOGIN:            "/login",
  GOOGLE_CALLBACK:  "/auth/google/callback",
  ACTIVATE:         "/activate/:token",
  ACTIVATE_LINK:    "/activate/:token/link",

  // Admin
  ADMIN:           "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_TRAINERS:  "/admin/trainers",
  ADMIN_ADMINS:    "/admin/admins",

  // Trainer
  TRAINER:           "/trainer",
  TRAINER_DASHBOARD: "/trainer/dashboard",
  TRAINER_CLIENTS:   "/trainer/clients",
  TRAINER_CLIENT:    "/trainer/client/:id",
  TRAINER_CHECKINS:  "/trainer/check-ins",
  TRAINER_SCHEDULE:  "/trainer/schedule",
  TRAINER_TEMPLATES: "/trainer/templates",

  // Client
  CLIENT:           "/client",
  CLIENT_DASHBOARD: "/client/dashboard",
  CLIENT_NUTRITION: "/client/nutrition",
  CLIENT_PROGRESS:  "/client/progress",
  CLIENT_WORKOUT:   "/client/workout",

  // Misc
  DESIGN_SYSTEM: "/design-system",
  NOT_FOUND:     "/not-found",
};
