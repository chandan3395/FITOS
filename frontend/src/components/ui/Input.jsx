const Input = ({
  label,
  id,
  type = "text",
  placeholder = "",
  value,
  onChange,
  error,
  hint,
  disabled = false,
  required = false,
  className = "",
  icon: Icon,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
          {required && <span className="text-primary ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            <Icon size={16} />
          </span>
        )}

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={[
            "w-full h-11 bg-surface-elevated border rounded-xl",
            "text-sm text-text-primary placeholder:text-text-muted",
            "transition-all duration-150 outline-none",
            "focus:border-primary focus:ring-2 focus:ring-primary/25",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20" : "border-border",
            Icon ? "pl-9 pr-4" : "px-4",
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
};

export default Input;
