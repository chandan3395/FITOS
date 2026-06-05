import { CalendarIcon, BoltIcon } from "./Icons";

const statusMeta = {
  active: {
    dot:   "bg-emerald-400",
    label: "Active",
    text:  "text-emerald-400",
    bg:    "bg-emerald-400/10",
  },
  inactive: {
    dot:   "bg-zinc-600",
    label: "Inactive",
    text:  "text-zinc-500",
    bg:    "bg-zinc-800",
  },
  paused: {
    dot:   "bg-amber-400",
    label: "Paused",
    text:  "text-amber-400",
    bg:    "bg-amber-400/10",
  },
};

/** Deterministic colour from initials */
const avatarColors = [
  "bg-indigo-500/20 text-indigo-300",
  "bg-violet-500/20 text-violet-300",
  "bg-sky-500/20    text-sky-300",
  "bg-rose-500/20   text-rose-300",
  "bg-teal-500/20   text-teal-300",
  "bg-amber-500/20  text-amber-300",
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
          <p className="text-[14px] font-semibold text-white leading-tight truncate">
            {name}
          </p>
          {goal && (
            <p className="text-[12px] text-zinc-500 mt-0.5">{goal}</p>
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
      <div className="border-t border-[#1f1f1f]" />

      {/* Meta rows */}
      <div className="flex flex-col gap-2">
        {lastSession && (
          <div className="flex items-center gap-2 text-[12px] text-zinc-500">
            <BoltIcon size={12} className="text-zinc-600 shrink-0" />
            <span>Last session</span>
            <span className="ml-auto text-zinc-400">{lastSession}</span>
          </div>
        )}
        {nextSession && (
          <div className="flex items-center gap-2 text-[12px] text-zinc-500">
            <CalendarIcon size={12} className="text-zinc-600 shrink-0" />
            <span>Next session</span>
            <span className="ml-auto text-zinc-400">{nextSession}</span>
          </div>
        )}
        {sessions !== undefined && (
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-zinc-500">Total sessions</span>
            <span className="text-zinc-300 font-medium">{sessions}</span>
          </div>
        )}
      </div>

      {/* Trainer tag */}
      {trainer && (
        <div className="text-[11px] text-zinc-600 pt-0.5">
          Trainer: <span className="text-zinc-400">{trainer}</span>
        </div>
      )}
    </div>
  );
};

export default ClientCard;
