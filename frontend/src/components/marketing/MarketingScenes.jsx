import useInView from "./useInView";
import CountUp from "./CountUp";
import { FlameIcon, CheckCircleIcon, DumbbellIcon, BoltIcon } from "../design-system/Icons";

/* ───────────────────────────────────────────────────────────────
 * Large-format marketing visuals — in the FITOS dashboard palette
 * (dark + lime). Framed product mockups + a realistic device + a
 * concrete "automated follow-up" feed. No abstract orbs/metal.
 * ─────────────────────────────────────────────────────────────── */

/** Premium framed container for a product mockup: soft lime glow + scale-in. */
export const ShowcaseFrame = ({ children, className = "", glow = "primary" }) => {
  const [ref, inView] = useInView();
  const glowColor = glow === "sky" ? "bg-sky-500/12" : "bg-primary/12";
  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className={`pointer-events-none absolute -inset-8 rounded-[40px] blur-[80px] ${glowColor} opacity-70`} />
      <div
        className="relative rounded-[22px] border border-border bg-card p-2.5 shadow-card-lg"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "none" : "translateY(30px) scale(0.975)",
          transition: "opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Automated Hound — a concrete "the system follows up for you" feed. */
const HOUND_ROWS = [
  { trigger: "Missed weekly check-in", client: "Marcus Lee", action: "Nudge sent automatically", done: true },
  { trigger: "No workout logged · 2 days", client: "Aisha Khan", action: "Reminder queued", done: false },
  { trigger: "Plan ending in 3 days", client: "Priya Sharma", action: "Renewal prompt sent", done: true },
  { trigger: "7-day streak hit 🎉", client: "David Okoye", action: "Congrats message sent", done: true },
];

export const AlertFeed = ({ className = "" }) => {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="pointer-events-none absolute -inset-8 rounded-[40px] blur-[80px] bg-primary/12 opacity-70" />
      <div className="relative rounded-[22px] border border-border bg-card shadow-card-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 h-12 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><BoltIcon size={15} /></span>
            <span className="text-sm font-semibold text-text-primary">Automated Hound</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-glow-pulse" /> Active
          </span>
        </div>
        <div className="p-3 sm:p-4 space-y-2.5">
          {HOUND_ROWS.map((r, i) => (
            <div key={r.trigger}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/50 px-3.5 py-3"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "none" : "translateX(20px)",
                transition: `all .55s cubic-bezier(.22,1,.36,1) ${i * 130}ms`,
              }}
            >
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.done ? "bg-primary/12 text-primary" : "bg-amber-400/10 text-amber-300"}`}>
                {r.done ? <CheckCircleIcon size={17} /> : <span className="w-2 h-2 rounded-full bg-amber-300 animate-glow-pulse" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-text-primary truncate">{r.trigger}</p>
                <p className="text-[11.5px] text-text-muted truncate">{r.client} · {r.action}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${r.done ? "bg-primary/10 text-primary" : "bg-amber-400/10 text-amber-300"}`}>
                {r.done ? "Done" : "Queued"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Realistic vertical phone — client mobile app. Not tilted. */
const Ring = ({ pct, inView, size = 104, stroke = 8 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#A6CE39" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={inView ? c * (1 - pct / 100) : c}
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1) .2s" }} />
    </svg>
  );
};

export const PhoneMockup = ({ className = "" }) => {
  const [ref, inView] = useInView();
  const week = [45, 70, 55, 88, 62, 95, 78];
  const macros = [{ l: "Protein", p: 92 }, { l: "Carbs", p: 74 }, { l: "Fats", p: 58 }];
  return (
    <div ref={ref} className={`relative mx-auto w-[260px] sm:w-[280px] ${className}`}>
      <div className="pointer-events-none absolute -inset-10 rounded-full blur-[80px] bg-primary/12" />
      <div className="relative rounded-[2.75rem] bg-[#161616] border border-white/12 p-2.5 shadow-card-lg">
        <span className="absolute -left-[3px] top-24 h-9 w-[3px] rounded-l bg-white/15" />
        <span className="absolute -left-[3px] top-36 h-14 w-[3px] rounded-l bg-white/15" />
        <span className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-white/15" />

        <div className="relative rounded-[2.25rem] bg-bg overflow-hidden">
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-black z-10 border border-white/10" />
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] text-text-secondary font-medium">
            <span>9:41</span><span>●●●</span>
          </div>

          <div className="px-5 pt-4 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Today</p>
                <p className="text-sm font-bold text-text-primary">Priya Sharma</p>
              </div>
              <span className="w-9 h-9 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[11px] font-bold">PS</span>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-4 flex items-center gap-4 mb-3">
              <div className="relative shrink-0">
                <Ring pct={92} inView={inView} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <CountUp end={92} suffix="%" duration={1500} className="text-lg font-bold text-text-primary" />
                  <span className="text-[9px] text-text-muted">adherence</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between"><span className="text-[11px] text-text-muted">Weight</span><span className="text-[12px] font-semibold text-primary">−6.2 kg</span></div>
                <div className="flex items-center justify-between"><span className="text-[11px] text-text-muted">Streak</span><span className="text-[12px] font-semibold text-text-primary flex items-center gap-1"><FlameIcon size={12} className="text-amber-300" /> 18d</span></div>
                <div className="flex items-center justify-between"><span className="text-[11px] text-text-muted">Sessions</span><span className="text-[12px] font-semibold text-text-primary">4 / 5</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-text-secondary font-medium">This week</span>
                <span className="text-[10px] text-emerald-300">+12%</span>
              </div>
              <div className="flex items-end gap-1.5 h-14">
                {week.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-primary" style={{ height: inView ? `${h}%` : "0%", transition: `height .9s cubic-bezier(.22,1,.36,1) ${i * 70}ms` }} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/80 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-text-secondary font-medium flex items-center gap-1.5"><DumbbellIcon size={13} className="text-primary" /> Nutrition</span>
                <span className="text-[10px] text-text-muted">2,240 kcal</span>
              </div>
              <div className="space-y-2.5">
                {macros.map((m, i) => (
                  <div key={m.l}>
                    <div className="flex justify-between text-[10px] mb-1"><span className="text-text-muted">{m.l}</span><span className="text-text-secondary">{m.p}%</span></div>
                    <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: inView ? `${m.p}%` : "0%", transition: `width 1s cubic-bezier(.22,1,.36,1) ${i * 120}ms` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:flex absolute -right-6 top-20 items-center gap-2 px-3 py-2 rounded-xl glass border border-border shadow-card-lg animate-float">
        <CheckCircleIcon size={15} className="text-primary" />
        <span className="text-[11px] font-semibold text-text-primary">Check-in done</span>
      </div>
    </div>
  );
};
