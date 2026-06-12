const variants = {
  primary:
    "bg-primary hover:bg-primary-hover text-black font-semibold shadow-glow-sm hover:shadow-glow hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
  secondary:
    "bg-surface-elevated hover:bg-line-hover text-text-primary border border-border hover:border-line-hover",
  ghost: "bg-transparent hover:bg-surface-elevated text-text-secondary hover:text-text-primary",
  danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 hover:border-red-500/45",
  outline:
    "bg-transparent border border-primary/60 text-primary hover:bg-primary-muted hover:border-primary",
};

const sizes = {
  sm: "h-9 px-3.5 text-xs rounded-lg",
  md: "h-11 px-5 text-sm rounded-xl",
  lg: "h-12 px-7 text-base rounded-xl",
};

const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  type = "button",
  onClick,
  ...props
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 font-medium",
        "transition-all duration-150 cursor-pointer select-none",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin-slow" />
      )}
      {children}
    </button>
  );
};

export default Button;
