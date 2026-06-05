import { SpinnerIcon } from "./Icons";

const sizes = {
  sm: "h-9 px-4 text-[13px] rounded-xl gap-1.5",
  md: "h-11 px-6 text-sm   rounded-xl gap-2",
  lg: "h-13 px-8 text-base rounded-2xl gap-2",
};

/**
 * PrimaryButton — white fill, black text. Apple-style.
 *
 * Props
 *   size        "sm" | "md" | "lg"           default "md"
 *   loading     boolean                       default false
 *   disabled    boolean                       default false
 *   fullWidth   boolean                       default false
 *   icon        ReactNode (left icon)
 *   iconRight   ReactNode (right icon)
 */
const PrimaryButton = ({
  children,
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconRight,
  type = "button",
  onClick,
  className = "",
  ...props
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-semibold select-none",
        "bg-white text-black",
        "hover:bg-zinc-100 active:bg-zinc-200 active:scale-[0.97]",
        "transition-all duration-150 ease-out",
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100",
        fullWidth ? "w-full" : "",
        sizes[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {loading ? (
        <SpinnerIcon size={15} className="border-black/25 border-t-black" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
};

export default PrimaryButton;
