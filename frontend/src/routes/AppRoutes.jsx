import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";

import LoginPage          from "../pages/auth/LoginPage";
import GoogleCallbackPage from "../pages/auth/GoogleCallbackPage";
import ActivatePage       from "../pages/auth/ActivatePage";
import LinkAccountPage     from "../pages/auth/LinkAccountPage";
import DesignSystemPage   from "../pages/DesignSystemPage";
import NotFound           from "../pages/NotFound";

// Layouts
import AdminLayout   from "../components/layouts/AdminLayout";
import TrainerLayout from "../components/layouts/TrainerLayout";
import ClientLayout  from "../components/layouts/ClientLayout";

// Admin pages
import AdminDashboard    from "../pages/admin/AdminDashboard";
import AdminTrainersPage from "../pages/admin/AdminTrainersPage";
import AdminAdminsPage   from "../pages/admin/AdminAdminsPage";

// Trainer pages
import TrainerDashboard         from "../pages/trainer/TrainerDashboard";
import TrainerClientsPage       from "../pages/trainer/TrainerClientsPage";
import TrainerAddClientPage     from "../pages/trainer/TrainerAddClientPage";
import TrainerClientDetailPage  from "../pages/trainer/TrainerClientDetailPage";
import TrainerCheckinsPage      from "../pages/trainer/TrainerCheckinsPage";
import TrainerTemplatesPage     from "../pages/trainer/TrainerTemplatesPage";
import TrainerStubPage          from "../pages/trainer/TrainerStubPage";

// Client pages
import ClientDashboard      from "../pages/client/ClientDashboard";
import ClientNutritionPage  from "../pages/client/ClientNutritionPage";
import ClientProgressPage   from "../pages/client/ClientProgressPage";
import ClientWorkoutPage    from "../pages/client/ClientWorkoutPage";

// Auth guard
import { RequireAuth } from "../contexts/AuthContext";

const AppRoutes = () => (
  <Routes>
    {/* The root is the unified login page. */}
    <Route path={ROUTES.HOME}            element={<LoginPage />} />
    <Route path={ROUTES.LOGIN}           element={<LoginPage />} />
    <Route path={ROUTES.GOOGLE_CALLBACK} element={<GoogleCallbackPage />} />
    <Route path={ROUTES.ACTIVATE}        element={<ActivatePage />} />
    <Route path={ROUTES.ACTIVATE_LINK}   element={<LinkAccountPage />} />
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
);

export default AppRoutes;
