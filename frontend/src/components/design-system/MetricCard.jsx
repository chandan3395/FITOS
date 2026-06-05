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
    up:      { color: "text-emerald-400", Icon: TrendUpIcon },
    down:    { color: "text-red-400",     Icon: TrendDownIcon },
    neutral: { color: "text-zinc-500",    Icon: null },
  };

  const { color, Icon: TrendIcon } = trendMeta[trend] ?? trendMeta.neutral;

  return (
    <div
      onClick={onClick}
      className={[
        "card p-6 flex flex-col gap-5",
        onClick ? "card-hover cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-zinc-500 tracking-wide">
          {label}
        </span>
        {icon && (
          <span className="text-zinc-600 -mt-0.5">{icon}</span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-[2.25rem] font-bold text-white tracking-tight leading-none">
          {value}
        </p>
      </div>

      {/* Delta */}
      {delta && (
        <div className="flex items-center gap-1.5">
          {TrendIcon && (
            <TrendIcon size={13} className={color} />
          )}
          <span className={`text-[13px] font-medium ${color}`}>{delta}</span>
          {deltaLabel && (
            <span className="text-[13px] text-zinc-600">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default MetricCard;
