import { CalendarIcon, BoltIcon } from "./Icons";

const statusMeta = {
  active: {
    dot:   "bg-emerald-400",
    label: "Active",
    text:  "text-emerald-800",
    bg:    "bg-emerald-400/10",
  },
  inactive: {
    dot:   "bg-zinc-600",
    label: "Inactive",
    text:  "text-text-secondary",
    bg:    "bg-surface-elevated",
  },
  paused: {
    dot:   "bg-amber-400",
    label: "Paused",
    text:  "text-amber-800",
    bg:    "bg-amber-400/10",
  },
};

/** Deterministic colour from initials */
const avatarColors = [
  "bg-indigo-500/20 text-indigo-700",
  "bg-violet-500/20 text-violet-700",
  "bg-sky-500/20    text-sky-800",
  "bg-rose-500/20   text-rose-700",
  "bg-teal-500/20   text-teal-700",
  "bg-amber-500/20  text-amber-800",
];

const colorFor = (name = "") => {
  const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return avatarColors[code % avatarColors.length];
};

const initials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

/**
 * ClientCard — client profile tile.
 *
 * Props
 *   name         string            e.g. "Sarah Johnson"
 *   goal         string            e.g. "Weight Loss"
 *   status       "active" | "inactive" | "paused"   default "active"
 *   trainer      string            optional trainer name
 *   lastSession  string            e.g. "2 hours ago"
 *   nextSession  string            e.g. "Tomorrow 9 AM"
 *   sessions     number            total sessions count
 *   onClick      fn
 */
const ClientCard = ({
  name = "Client Name",
  goal,
  status = "active",
  trainer,
  lastSession,
  nextSession,
  sessions,
  onClick,
  className = "",
}) => {
  const sm = statusMeta[status] ?? statusMeta.inactive;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick(event);
        }
      } : undefined}
      className={[
        "card p-5 flex flex-col gap-4",
        onClick ? "card-hover cursor-pointer" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-[13px] font-bold ${colorFor(name)}`}
        >
          {initials(name)}
        </div>

        {/* Name + goal */}
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-text-primary leading-tight truncate">
            {name}
          </p>
          {goal && (
            <p className="text-[12px] text-text-secondary mt-0.5">{goal}</p>
          )}
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${sm.text} ${sm.bg}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
          {sm.label}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Meta rows */}
      <div className="flex flex-col gap-2">
        {lastSession && (
          <div className="flex items-center gap-2 text-[12px] text-text-secondary">
            <BoltIcon size={12} className="text-text-secondary shrink-0" />
            <span>Last session</span>
            <span className="ml-auto text-text-secondary">{lastSession}</span>
          </div>
        )}
        {nextSession && (
          <div className="flex items-center gap-2 text-[12px] text-text-secondary">
            <CalendarIcon size={12} className="text-text-secondary shrink-0" />
            <span>Next session</span>
            <span className="ml-auto text-text-secondary">{nextSession}</span>
          </div>
        )}
        {sessions !== undefined && (
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-text-secondary">Total sessions</span>
            <span className="text-text-secondary font-medium">{sessions}</span>
          </div>
        )}
      </div>

      {/* Trainer tag */}
      {trainer && (
        <div className="text-[11px] text-text-secondary pt-0.5">
          Trainer: <span className="text-text-secondary">{trainer}</span>
        </div>
      )}
    </div>
  );
};

export default ClientCard;
