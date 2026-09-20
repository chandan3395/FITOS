import FitosWordmark from "../branding/FitosWordmark";

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(600px,100vw)] h-[600px] bg-bronze/5 rounded-full blur-[120px]" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <FitosWordmark className="text-2xl text-text-primary" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-glow animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
