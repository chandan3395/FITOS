import { TargetIcon, FlameIcon } from "./Icons";

/**
 * ProgressCard — goal / metric progress tile.
 *
 * Props
 *   label        string            e.g. "Weight Goal"
 *   current      number            current value
 *   target       number            target value
 *   unit         string            e.g. "kg"
 *   description  string            optional sub-label
 *   icon         ReactNode         optional icon override
 *   colorScheme  "default" | "success" | "warning" | "danger"
 *   streak       number            optional streak count
 */
const ProgressCard = ({
  label,
  current = 0,
  target = 100,
  unit = "",
  description,
  icon,
  colorScheme = "default",
  streak,
  className = "",
}) => {
  const pct = Math.min(Math.max(Math.round((current / target) * 100), 0), 100);

  const barColors = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger:  "bg-danger",
  };

  const pctColors = {
    default: "text-text-primary",
    success: "text-success",
    warning: "text-warning",
    danger:  "text-danger",
  };

  return (
    <div className={`card p-6 flex flex-col gap-5 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-text-secondary">
            {icon ?? <TargetIcon size={15} />}
          </span>
          <div>
            <p className="text-[14px] font-semibold text-text-primary leading-tight">
              {label}
            </p>
            {description && (
              <p className="text-[12px] text-text-secondary mt-0.5">{description}</p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className={`text-[22px] font-bold tracking-tight leading-none ${pctColors[colorScheme]}`}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="progress-bar">
          <div
            className={`progress-fill ${barColors[colorScheme]}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Value label */}
        <div className="flex justify-between mt-2.5">
          <span className="text-[12px] text-text-secondary">
            {current}
            {unit && <span className="ml-0.5">{unit}</span>}
            <span className="mx-1 text-text-secondary">/</span>
            {target}
            {unit && <span className="ml-0.5">{unit}</span>}
          </span>
          {streak !== undefined && (
            <span className="inline-flex items-center gap-1 text-[12px] text-warning">
              <FlameIcon size={12} />
              {streak} day streak
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressCard;
