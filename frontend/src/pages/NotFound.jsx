import { Link } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import Button from "../components/ui/Button";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 text-center animate-fade-in">
        <p className="text-8xl font-black gradient-text mb-4">404</p>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">Page not found</h1>
        <p className="text-text-secondary mb-8 max-w-xs mx-auto text-sm">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link to={ROUTES.HOME}>
          <Button>Go home</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
