import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";

import HomePage         from "../pages/HomePage";
import LoginPage        from "../pages/auth/LoginPage";
import AdminPage        from "../pages/admin/AdminPage";
import TrainerPage      from "../pages/trainer/TrainerPage";
import ClientPage       from "../pages/client/ClientPage";
import DesignSystemPage from "../pages/DesignSystemPage";
import NotFound         from "../pages/NotFound";

const AppRoutes = () => (
  <Routes>
    <Route path={ROUTES.HOME}          element={<HomePage />} />
    <Route path={ROUTES.LOGIN}         element={<LoginPage />} />
    <Route path={ROUTES.ADMIN}         element={<AdminPage />} />
    <Route path={ROUTES.TRAINER}       element={<TrainerPage />} />
    <Route path={ROUTES.CLIENT}        element={<ClientPage />} />
    <Route path={ROUTES.DESIGN_SYSTEM} element={<DesignSystemPage />} />
    <Route path={ROUTES.NOT_FOUND}     element={<NotFound />} />
    <Route path="*"                    element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
  </Routes>
);

export default AppRoutes;
