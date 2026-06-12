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
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-glow-sm">
            <span className="text-black font-extrabold text-lg leading-none">F</span>
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white">FITOS</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-glow animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
