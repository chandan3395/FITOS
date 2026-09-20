import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import FitosWordmark from "../components/branding/FitosWordmark";
import Button from "../components/ui/Button";
import { useAuthContext } from "../contexts/AuthContext";
import { ROUTES } from "../constants/routes";

const dashboardFor = (role) => {
  if (role === "ADMIN") return ROUTES.ADMIN_DASHBOARD;
  if (role === "TRAINER") return ROUTES.TRAINER_DASHBOARD;
  if (role === "CLIENT") return ROUTES.CLIENT_DASHBOARD;
  if (role === "BYOT") return "/byot/dashboard";
  return ROUTES.LOGIN;
};

const developmentDetails = (error) => {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText || "Route error"}`;
  }
  if (error instanceof Error) return error.stack || error.message;
  return String(error || "Unknown route error");
};

const RouteErrorPage = () => {
  const error = useRouteError();
  const { user } = useAuthContext();

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10 text-text-primary">
      <section
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-card sm:p-10"
        aria-labelledby="route-error-title"
      >
        <FitosWordmark className="text-2xl text-primary" />
        <h1 id="route-error-title" className="mt-8 text-2xl font-bold tracking-tight sm:text-3xl">
          Something went wrong while loading this page.
        </h1>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">
            Try again
          </Button>
          <Link
            to={dashboardFor(user?.role)}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-surface-elevated px-5 text-sm font-semibold text-text-primary transition-colors hover:border-primary hover:bg-primary/5 sm:w-auto"
          >
            Go to dashboard
          </Link>
        </div>

        {import.meta.env.DEV && (
          <details className="mt-8 rounded-xl border border-border bg-surface-elevated p-4 text-left">
            <summary className="cursor-pointer text-sm font-semibold">Development details</summary>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-text-secondary">
              {developmentDetails(error)}
            </pre>
          </details>
        )}
      </section>
    </main>
  );
};

export default RouteErrorPage;
