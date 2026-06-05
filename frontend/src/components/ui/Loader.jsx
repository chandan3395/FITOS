const Loader = ({ size = "md", label = "Loading…", fullScreen = false }) => {
  const sizes = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-[3px]",
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={[
          sizes[size],
          "rounded-full border-primary/20 border-t-primary animate-spin-slow",
        ].join(" ")}
        role="status"
        aria-label={label}
      />
      {label && <p className="text-xs text-text-muted animate-pulse-slow">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Loader;
