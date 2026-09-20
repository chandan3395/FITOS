import { useState } from "react";
import { InfoIcon, CheckCircleIcon, WarningIcon, XCircleIcon, XIcon } from "./Icons";

const variants = {
  info: {
    bg:     "bg-[--info-bg]",
    border: "border-[--info-line]",
    icon:   "text-info",
    title:  "text-info",
    body:   "text-info",
    Icon:   InfoIcon,
  },
  success: {
    bg:     "bg-[--success-bg]",
    border: "border-[--success-line]",
    icon:   "text-success",
    title:  "text-success",
    body:   "text-success",
    Icon:   CheckCircleIcon,
  },
  warning: {
    bg:     "bg-[--warning-bg]",
    border: "border-[--warning-line]",
    icon:   "text-warning",
    title:  "text-warning",
    body:   "text-warning",
    Icon:   WarningIcon,
  },
  error: {
    bg:     "bg-[--danger-bg]",
    border: "border-[--danger-line]",
    icon:   "text-danger",
    title:  "text-danger",
    body:   "text-danger",
    Icon:   XCircleIcon,
  },
};

/**
 * AlertCard — inline status message.
 *
 * Props
 *   variant    "info" | "success" | "warning" | "error"  default "info"
 *   title      string
 *   message    string
 *   dismissible  boolean                                  default false
 *   onDismiss  fn — called after dismiss (optional)
 *   action     { label, onClick }                         optional CTA
 */
const AlertCard = ({
  variant = "info",
  title,
  message,
  dismissible = false,
  onDismiss,
  action,
  className = "",
}) => {
  const [visible, setVisible] = useState(true);
  const meta = variants[variant] ?? variants.info;
  const { Icon } = meta;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div
      role="alert"
      className={[
        "flex gap-3.5 rounded-2xl border p-4 animate-fade-in",
        meta.bg,
        meta.border,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Icon */}
      <span className={`shrink-0 mt-0.5 ${meta.icon}`}>
        <Icon size={16} />
      </span>

      {/* Body */}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-[13px] font-semibold leading-5 ${meta.title}`}>
            {title}
          </p>
        )}
        {message && (
          <p className={`text-[13px] leading-5 mt-0.5 ${meta.body}`}>
            {message}
          </p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={`mt-2 text-[12px] font-semibold underline underline-offset-2 ${meta.icon} hover:opacity-80 transition-opacity`}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Dismiss */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className={`shrink-0 mt-0.5 ${meta.icon} opacity-60 hover:opacity-100 transition-opacity`}
        >
          <XIcon size={13} />
        </button>
      )}
    </div>
  );
};

export default AlertCard;
