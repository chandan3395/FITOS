const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl font-bold gradient-text tracking-tight">FITOS</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-glow animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
