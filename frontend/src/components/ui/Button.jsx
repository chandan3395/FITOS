const variants = {
  primary:
    "bg-primary hover:bg-primary-hover text-white shadow-glow-sm hover:shadow-glow active:scale-[0.98]",
  secondary:
    "bg-surface-elevated hover:bg-[#222] text-text-primary border border-border hover:border-[#333]",
  ghost: "bg-transparent hover:bg-surface-elevated text-text-secondary hover:text-text-primary",
  danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40",
  outline:
    "bg-transparent border border-primary text-primary hover:bg-primary-muted",
};

const sizes = {
  sm: "h-8 px-3 text-xs rounded-lg",
  md: "h-10 px-5 text-sm rounded-[10px]",
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
