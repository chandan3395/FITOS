import { SpinnerIcon } from "./Icons";

const sizes = {
  sm: "h-9 px-4 text-[13px] rounded-xl gap-1.5",
  md: "h-11 px-6 text-sm   rounded-xl gap-2",
  lg: "h-13 px-8 text-base rounded-2xl gap-2",
};

/**
 * SecondaryButton — transparent fill, zinc border, white text.
 *
 * Props
 *   size        "sm" | "md" | "lg"           default "md"
 *   loading     boolean                       default false
 *   disabled    boolean                       default false
 *   fullWidth   boolean                       default false
 *   destructive boolean — red tint variant    default false
 *   icon        ReactNode (left icon)
 *   iconRight   ReactNode (right icon)
 */
const SecondaryButton = ({
  children,
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  destructive = false,
  icon,
  iconRight,
  type = "button",
  onClick,
  className = "",
  ...props
}) => {
  const colorClasses = destructive
    ? "border-red-500/30 text-red-400 hover:bg-red-500/8 hover:border-red-500/50 active:bg-red-500/12"
    : "border-[#2a2a2a] text-white hover:bg-white/[0.04] hover:border-[#3a3a3a] active:bg-white/[0.06]";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-medium select-none",
        "bg-transparent border",
        "active:scale-[0.97] transition-all duration-150 ease-out",
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100",
        fullWidth ? "w-full" : "",
        colorClasses,
        sizes[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? (
        <SpinnerIcon size={15} className="border-white/25 border-t-white" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
};

export default SecondaryButton;
