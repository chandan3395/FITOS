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
    default: "bg-white",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger:  "bg-red-400",
  };

  const pctColors = {
    default: "text-white",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger:  "text-red-400",
  };

  return (
    <div className={`card p-6 flex flex-col gap-5 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-zinc-500">
            {icon ?? <TargetIcon size={15} />}
          </span>
          <div>
            <p className="text-[14px] font-semibold text-white leading-tight">
              {label}
            </p>
            {description && (
              <p className="text-[12px] text-zinc-500 mt-0.5">{description}</p>
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
          <span className="text-[12px] text-zinc-500">
            {current}
            {unit && <span className="ml-0.5">{unit}</span>}
            <span className="mx-1 text-zinc-700">/</span>
            {target}
            {unit && <span className="ml-0.5">{unit}</span>}
          </span>
          {streak !== undefined && (
            <span className="inline-flex items-center gap-1 text-[12px] text-amber-400">
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
