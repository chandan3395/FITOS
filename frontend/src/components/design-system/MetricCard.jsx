import { TrendUpIcon, TrendDownIcon } from "./Icons";

/**
 * MetricCard — KPI stat tile.
 *
 * Props
 *   label        string            e.g. "Total Clients"
 *   value        string | number   e.g. "248" or "$4,200"
 *   delta        string            e.g. "+12.5%"
 *   deltaLabel   string            e.g. "vs last month"
 *   trend        "up" | "down" | "neutral"
 *   icon         ReactNode         optional top-right icon
 *   onClick      fn                makes card clickable
 */
const MetricCard = ({
  label,
  value,
  delta,
  deltaLabel = "vs last month",
  trend = "neutral",
  icon,
  onClick,
  className = "",
}) => {
  const trendMeta = {
    up:      { color: "text-primary",  Icon: TrendUpIcon },
    down:    { color: "text-red-400",  Icon: TrendDownIcon },
    neutral: { color: "text-text-muted", Icon: null },
  };

  const { color, Icon: TrendIcon } = trendMeta[trend] ?? trendMeta.neutral;

  return (
    <div
      onClick={onClick}
      className={[
        // Dark card with a soft green accent edge on the left.
        "relative overflow-hidden card p-6 flex flex-col gap-5",
        "before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary/70",
        onClick ? "card-hover cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-text-muted">
          {label}
        </span>
        {icon && (
          <span className="w-9 h-9 -mt-0.5 rounded-xl bg-primary/12 text-primary flex items-center justify-center ring-1 ring-primary/20">
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-[2.6rem] font-extrabold text-white tracking-tight leading-none">
          {value}
        </p>
      </div>

      {/* Delta */}
      {delta && (
        <div className="flex items-center gap-1.5">
          {TrendIcon && (
            <TrendIcon size={13} className={color} />
          )}
          <span className={`text-[13px] font-semibold ${color}`}>{delta}</span>
          {deltaLabel && (
            <span className="text-[13px] text-text-muted">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
