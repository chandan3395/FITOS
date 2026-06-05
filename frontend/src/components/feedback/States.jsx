// Shared loading / empty / error renderers used by data-fetching pages.
// These are thin compositions of existing Card + theme tokens — they
// do not introduce any new colors, spacing, or typography.

import Card from "../ui/Card";
import Button from "../ui/Button";

/** Animated skeleton block — uses the existing pulse-slow keyframe. */
export const Skeleton = ({ className = "" }) => (
  <div className={`bg-surface-elevated/60 rounded-md animate-pulse-slow ${className}`} />
);

/** Grid of skeleton cards — for list views. */
export const SkeletonGrid = ({ count = 6, columns = "lg:grid-cols-3 xl:grid-cols-4" }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 ${columns} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <div className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      </Card>
    ))}
  </div>
);

/** Stacked detail-view skeleton. */
export const SkeletonDetail = () => (
  <div className="space-y-4">
    <Card>
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </Card>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <Skeleton className="h-3 w-1/3 mb-3" />
          <Skeleton className="h-6 w-1/2" />
        </Card>
      ))}
    </div>
  </div>
);

/** Centered empty state with optional CTA. */
export const EmptyState = ({ title = "Nothing here yet", description, action }) => (
  <Card>
    <div className="py-12 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-muted">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-base font-semibold text-text-primary">{title}</p>
      {description && <p className="text-sm text-text-secondary mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  </Card>
);

/** Error state with retry. */
export const ErrorState = ({ title = "Couldn't load this", message, onRetry }) => (
  <Card>
    <div className="py-10 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-300">
          <path d="M12 8v5M12 16.5h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <p className="text-base font-semibold text-text-primary">{title}</p>
      {message && <p className="text-sm text-text-secondary mt-1 max-w-md">{message}</p>}
      {onRetry && (
        <Button size="sm" variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  </Card>
);

/** Tiny inline toast for success/error feedback. */
export const Toast = ({ kind = "success", message, onDismiss }) => {
  if (!message) return null;
  const meta = kind === "success"
    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
    : "bg-red-500/10 border-red-500/30 text-red-300";
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-[13px] font-medium shadow-card-lg animate-slide-up ${meta}`}>
      <div className="flex items-center gap-3">
        <span>{message}</span>
        {onDismiss && (
          <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity text-base leading-none">
            ×
          </button>
        )}
      </div>
    </div>
  );
};
