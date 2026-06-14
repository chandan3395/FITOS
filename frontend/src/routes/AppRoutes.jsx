import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";

// Public/auth entry points stay eager — they're small and on the critical
// path (the marketing site, legal pages, and sign-in must paint instantly).
import LandingPage        from "../pages/marketing/LandingPage";
import LegalPage          from "../pages/marketing/LegalPage";
import FAQPage            from "../pages/marketing/FAQPage";
import AboutPage          from "../pages/public/AboutPage";
import ContactPage        from "../pages/public/ContactPage";
import TermsPage          from "../pages/public/TermsPage";
import PrivacyPage        from "../pages/public/PrivacyPage";
import LoginPage          from "../pages/auth/LoginPage";
import GoogleCallbackPage from "../pages/auth/GoogleCallbackPage";
import ActivatePage       from "../pages/auth/ActivatePage";
import LinkAccountPage     from "../pages/auth/LinkAccountPage";
import AccountDisabledPage from "../pages/auth/AccountDisabledPage";
import NotFound           from "../pages/NotFound";

// Auth guard
import { RequireAuth } from "../contexts/AuthContext";

// The authenticated app (admin/trainer/client) is code-split so a visitor
// landing on the public homepage never downloads the dashboard bundles.
const DesignSystemPage       = lazy(() => import("../pages/DesignSystemPage"));
const AdminLayout            = lazy(() => import("../components/layouts/AdminLayout"));
const TrainerLayout          = lazy(() => import("../components/layouts/TrainerLayout"));
const ClientLayout           = lazy(() => import("../components/layouts/ClientLayout"));
const AdminDashboard         = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminTrainersPage      = lazy(() => import("../pages/admin/AdminTrainersPage"));
const AdminAdminsPage        = lazy(() => import("../pages/admin/AdminAdminsPage"));
const TrainerDashboard       = lazy(() => import("../pages/trainer/TrainerDashboard"));
const TrainerClientsPage     = lazy(() => import("../pages/trainer/TrainerClientsPage"));
const TrainerAddClientPage   = lazy(() => import("../pages/trainer/TrainerAddClientPage"));
const TrainerClientDetailPage = lazy(() => import("../pages/trainer/TrainerClientDetailPage"));
const TrainerCheckinsPage    = lazy(() => import("../pages/trainer/TrainerCheckinsPage"));
const TrainerTemplatesPage   = lazy(() => import("../pages/trainer/TrainerTemplatesPage"));
const TrainerStubPage        = lazy(() => import("../pages/trainer/TrainerStubPage"));
const ClientDashboard        = lazy(() => import("../pages/client/ClientDashboard"));
const ClientNutritionPage    = lazy(() => import("../pages/client/ClientNutritionPage"));
const ClientProgressPage     = lazy(() => import("../pages/client/ClientProgressPage"));
const ClientWorkoutPage      = lazy(() => import("../pages/client/ClientWorkoutPage"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin-slow" />
  </div>
);

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Public marketing site is the root; login lives at /login. */}
      <Route path={ROUTES.HOME}            element={<LandingPage />} />
      <Route path={ROUTES.ABOUT}           element={<AboutPage />} />
      <Route path={ROUTES.CONTACT}         element={<ContactPage />} />
      <Route path={ROUTES.PRIVACY}         element={<PrivacyPage />} />
      <Route path={ROUTES.TERMS}           element={<TermsPage />} />
      <Route path={ROUTES.COOKIES}         element={<LegalPage kind="cookies" />} />
      <Route path={ROUTES.FAQ}             element={<FAQPage />} />
      <Route path={ROUTES.LOGIN}           element={<LoginPage />} />
      <Route path={ROUTES.GOOGLE_CALLBACK} element={<GoogleCallbackPage />} />
      <Route path={ROUTES.ACTIVATE}        element={<ActivatePage />} />
      <Route path={ROUTES.ACTIVATE_LINK}   element={<LinkAccountPage />} />
      <Route path={ROUTES.ACCOUNT_DISABLED} element={<AccountDisabledPage />} />
      <Route path={ROUTES.DESIGN_SYSTEM}   element={<DesignSystemPage />} />

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth roles={["ADMIN"]}><AdminLayout /></RequireAuth>}>
        <Route index             element={<Navigate to={ROUTES.ADMIN_DASHBOARD} replace />} />
        <Route path="dashboard"  element={<AdminDashboard />} />
        <Route path="trainers"   element={<AdminTrainersPage />} />
        <Route path="admins"     element={<AdminAdminsPage />} />
      </Route>

      {/* Trainer */}
      <Route path="/trainer" element={<RequireAuth roles={["TRAINER"]}><TrainerLayout /></RequireAuth>}>
        <Route index               element={<Navigate to={ROUTES.TRAINER_DASHBOARD} replace />} />
        <Route path="dashboard"    element={<TrainerDashboard />} />
        <Route path="clients"      element={<TrainerClientsPage />} />
        <Route path="clients/new"  element={<TrainerAddClientPage />} />
        <Route path="client/:id"   element={<TrainerClientDetailPage />} />
        <Route path="check-ins"    element={<TrainerCheckinsPage />} />
        <Route path="schedule"     element={<TrainerStubPage title="Schedule" description="Session calendar — coming in a later pass." />} />
        <Route path="templates"    element={<TrainerTemplatesPage />} />
      </Route>

      {/* Client */}
      <Route path="/client" element={<RequireAuth roles={["CLIENT"]}><ClientLayout /></RequireAuth>}>
        <Route index            element={<Navigate to={ROUTES.CLIENT_DASHBOARD} replace />} />
        <Route path="dashboard" element={<ClientDashboard />} />
        <Route path="nutrition" element={<ClientNutritionPage />} />
        <Route path="progress"  element={<ClientProgressPage />} />
        <Route path="workout"   element={<ClientWorkoutPage />} />
      </Route>

      {/* 404 */}
      <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
      <Route path="*"                element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
