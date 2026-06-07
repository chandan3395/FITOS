import { useEffect } from "react";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className = "",
  // Optional override for the backdrop (e.g. a stronger blur). Defaults to
  // the standard backdrop so existing modals are unchanged.
  backdropClassName = "bg-black/70 backdrop-blur-sm",
}) => {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${backdropClassName}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — flex column capped to the viewport so the BODY scrolls
          internally instead of overflowing the panel / pushing page scroll. */}
      <div
        className={[
          "relative w-full bg-surface border border-border rounded-2xl shadow-glow animate-fade-in",
          "flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden",
          sizes[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Header */}
        {(title || onClose) && (
          <div className="shrink-0 flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
            {title && (
              <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="ml-auto text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-elevated"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M12 4L4 12M4 4l8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body — the single scroll region. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-3 px-6 pb-5 pt-2 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
