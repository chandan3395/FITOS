import useInView from "./useInView";
import CountUp from "./CountUp";
import {
  UsersIcon, DumbbellIcon, ChartBarIcon, FlameIcon, CheckCircleIcon,
  CalendarIcon, TargetIcon, BoltIcon, HomeIcon,
} from "../design-system/Icons";

/* ───────────────────────────────────────────────────────────────
 * Marketing product mockups — self-contained mini-UIs rendered in the
 * exact FITOS dashboard palette. Each animates the moment it scrolls into
 * view (bars fill, rings draw, rows stagger), so the product itself is the
 * hero visual — no stock imagery.
 * ─────────────────────────────────────────────────────────────── */

/** Ambient lime radial orb for depth behind sections. Decorative. */
export const BrandOrb = ({ className = "", animate = true }) => (
  <div
    aria-hidden="true"
    className={`pointer-events-none absolute rounded-full blur-[120px] bg-primary/20 ${animate ? "animate-glow-pulse" : ""} ${className}`}
  />
);

/** Frame chrome shared by the larger mockups (browser-style top bar). */
const Frame = ({ children, label = "app.fitos.com", className = "" }) => (
  <div className={`rounded-2xl border border-border bg-card shadow-card-lg overflow-hidden ${className}`}>
    <div className="flex items-center gap-2 px-4 h-10 border-b border-border bg-surface">
      <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
      <span className="ml-3 text-[11px] text-text-muted font-mono truncate">{label}</span>
    </div>
    {children}
  </div>
);

const Avatar = ({ name, tone = "sky" }) => {
  const tones = {
    sky: "bg-sky-500/20 text-sky-300",
    violet: "bg-violet-500/20 text-violet-300",
    amber: "bg-amber-500/20 text-amber-300",
    emerald: "bg-emerald-500/20 text-emerald-300",
    primary: "bg-primary/20 text-primary",
  };
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("");
  return (
    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${tones[tone]}`}>
      {initials}
    </span>
  );
};

const Pill = ({ children, tone = "emerald" }) => {
  const tones = {
    emerald: "bg-emerald-400/10 text-emerald-300",
    amber: "bg-amber-400/10 text-amber-300",
    primary: "bg-primary/10 text-primary",
    sky: "bg-sky-400/10 text-sky-300",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${tones[tone]}`}>{children}</span>;
};

/* ── Client Management ───────────────────────────────────────── */
const CLIENTS = [
  { name: "Priya Sharma", goal: "Fat loss · 12 wk", tone: "sky", status: "Active", adh: 94 },
  { name: "Marcus Lee", goal: "Muscle gain", tone: "violet", status: "Active", adh: 88 },
  { name: "Aisha Khan", goal: "Recomp · 16 wk", tone: "amber", status: "Pending", adh: 0 },
  { name: "David Okoye", goal: "Strength", tone: "emerald", status: "Active", adh: 76 },
];

export const ClientsPanel = () => {
  const [ref, inView] = useInView();
  return (
    <Frame label="fitos · clients" className="max-w-md">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UsersIcon size={18} className="text-primary" />
            <span className="text-sm font-semibold text-text-primary">Clients</span>
          </div>
          <span className="text-[11px] text-text-muted">24 active</span>
        </div>
        <div ref={ref} className="space-y-2.5">
          {CLIENTS.map((c, i) => (
            <div
              key={c.name}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated/60 px-3 py-2.5"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "none" : "translateX(18px)",
                transition: `all .55s cubic-bezier(.22,1,.36,1) ${i * 110}ms`,
              }}
            >
              <Avatar name={c.name} tone={c.tone} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-text-primary truncate">{c.name}</p>
                <p className="text-[11px] text-text-muted truncate">{c.goal}</p>
              </div>
              {c.status === "Pending"
                ? <Pill tone="amber">Pending</Pill>
                : <span className="text-[11px] font-semibold text-text-secondary">{c.adh}%</span>}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
};

/* ── Workout Planning ────────────────────────────────────────── */
const EXERCISES = [
  { n: "Bench Press", s: "4 × 10", done: true },
  { n: "Incline DB Press", s: "3 × 12", done: true },
  { n: "Cable Fly", s: "3 × 15", done: true },
  { n: "Triceps Pushdown", s: "4 × 12", done: false },
];

export const WorkoutBuilder = () => {
  const [ref, inView] = useInView();
  const doneCount = EXERCISES.filter((e) => e.done).length;
  const pct = Math.round((doneCount / EXERCISES.length) * 100);
  return (
    <Frame label="fitos · workout builder" className="max-w-md">
      <div className="p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <DumbbellIcon size={18} className="text-primary" />
            <span className="text-sm font-semibold text-text-primary">Push Day · Week 3</span>
          </div>
          <Pill tone="primary">Assigned</Pill>
        </div>
        <p className="text-[11px] text-text-muted mb-4">Hypertrophy block · Priya Sharma</p>

        <div ref={ref} className="space-y-2">
          {EXERCISES.map((e, i) => (
            <div
              key={e.n}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-elevated/60 px-3 py-2.5"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "none" : "translateY(14px)",
                transition: `all .5s cubic-bezier(.22,1,.36,1) ${i * 130}ms`,
              }}
            >
              <span className={`w-4 h-4 rounded-[5px] flex items-center justify-center shrink-0 ${e.done ? "bg-primary text-black" : "border border-text-muted/50"}`}>
                {e.done && <CheckCircleIcon size={12} />}
              </span>
              <span className="text-[13px] font-medium text-text-primary flex-1">{e.n}</span>
              <span className="text-[11px] text-text-muted font-mono">{e.s}</span>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-text-muted">Completion</span>
            <span className="text-primary font-semibold">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
            <div className="h-full bg-primary" style={{ width: inView ? `${pct}%` : "0%", transition: "width 1s cubic-bezier(.22,1,.36,1) .3s" }} />
          </div>
        </div>
      </div>
    </Frame>
  );
};

/* ── Nutrition (macro rings) ─────────────────────────────────── */
const Ring = ({ pct = 75, inView }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90">
      <circle cx="46" cy="46" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
      <circle
        cx="46" cy="46" r={r} fill="none" stroke="#A6CE39" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={inView ? c * (1 - pct / 100) : c}
        style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(.22,1,.36,1) .2s" }}
      />
    </svg>
  );
};

const MACROS = [
  { label: "Protein", val: 180, unit: "g", pct: 90, color: "bg-primary" },
  { label: "Carbs", val: 220, unit: "g", pct: 70, color: "bg-sky-400" },
  { label: "Fats", val: 60, unit: "g", pct: 55, color: "bg-amber-400" },
];

export const MacroRings = () => {
  const [ref, inView] = useInView();
  return (
    <Frame label="fitos · nutrition" className="max-w-md">
      <div ref={ref} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FlameIcon size={18} className="text-primary" />
          <span className="text-sm font-semibold text-text-primary">Nutrition Plan</span>
          <Pill tone="primary">Active</Pill>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <Ring pct={82} inView={inView} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <CountUp end={2240} duration={1500} className="text-lg font-bold text-text-primary" />
              <span className="text-[10px] text-text-muted">kcal / day</span>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            {MACROS.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-text-secondary">{m.label}</span>
                  <span className="text-text-primary font-semibold">
                    <CountUp end={m.val} duration={1400} suffix={m.unit} />
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                  <div className={`h-full ${m.color}`} style={{ width: inView ? `${m.pct}%` : "0%", transition: "width 1.1s cubic-bezier(.22,1,.36,1) .3s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Pill tone="sky">💧 3.0 L water</Pill>
          <Pill tone="amber">5 meals / day</Pill>
        </div>
      </div>
    </Frame>
  );
};

/* ── Progress & Accountability ───────────────────────────────── */
export const ProgressCompare = () => {
  const [ref, inView] = useInView();
  const Figure = ({ label, week, hue }) => (
    <div className="relative flex-1 rounded-xl border border-border overflow-hidden bg-surface-elevated aspect-[3/4]">
      <div className="absolute inset-0" style={{ background: `radial-gradient(80% 60% at 50% 30%, ${hue}, transparent 70%)` }} />
      <svg viewBox="0 0 80 110" className="absolute inset-0 w-full h-full opacity-70">
        <path d="M40 14c5 0 8 4 8 9s-3 8-3 12l4 18-3 22 2 24h-4l-2-22-2 22h-4l2-24-3-22 4-18c0-4-3-7-3-12s3-9 7-9z" fill="rgba(255,255,255,0.10)" />
      </svg>
      <span className="absolute top-2 left-2"><Pill tone="primary">{week}</Pill></span>
      <span className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-text-secondary font-medium">{label}</span>
    </div>
  );
  return (
    <Frame label="fitos · progress" className="max-w-md">
      <div ref={ref} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ChartBarIcon size={18} className="text-primary" />
            <span className="text-sm font-semibold text-text-primary">Transformation</span>
          </div>
          <span className="text-[11px] font-bold text-primary">−6.2 kg</span>
        </div>
        <div className="flex gap-3"
          style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "scale(.96)", transition: "all .7s cubic-bezier(.22,1,.36,1)" }}>
          <Figure label="Front" week="Week 1" hue="rgba(110,110,110,0.35)" />
          <Figure label="Front" week="Week 8" hue="rgba(166,206,57,0.30)" />
        </div>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Side-by-side compare · weekly timeline
        </div>
      </div>
    </Frame>
  );
};

/* ── Check-ins (metrics fill) ────────────────────────────────── */
const METRICS = [
  { label: "Adherence", val: "92%", pct: 92, tone: "bg-primary" },
  { label: "Sleep", val: "7.4h", pct: 82, tone: "bg-sky-400" },
  { label: "Energy", val: "4 / 5", pct: 80, tone: "bg-emerald-400" },
  { label: "Stress", val: "Low", pct: 30, tone: "bg-amber-400" },
];

export const CheckinMetrics = () => {
  const [ref, inView] = useInView();
  return (
    <Frame label="fitos · check-ins" className="max-w-md">
      <div ref={ref} className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BoltIcon size={18} className="text-primary" />
            <span className="text-sm font-semibold text-text-primary">Weekly Check-in</span>
          </div>
          <Pill tone="emerald">Reviewed</Pill>
        </div>
        <div className="space-y-3.5">
          {METRICS.map((m, i) => (
            <div key={m.label}>
              <div className="flex justify-between text-[12px] mb-1.5">
                <span className="text-text-secondary">{m.label}</span>
                <span className="text-text-primary font-semibold">{m.val}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
                <div className={`h-full ${m.tone}`} style={{ width: inView ? `${m.pct}%` : "0%", transition: `width 1s cubic-bezier(.22,1,.36,1) ${i * 120}ms` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
};

/* ── Communication (chat) ────────────────────────────────────── */
const MESSAGES = [
  { from: "client", text: "Hit all my workouts this week! 💪" },
  { from: "coach", text: "Amazing work Priya. Macros looking great too." },
  { from: "client", text: "Should I add cardio on rest days?" },
  { from: "coach", text: "Let's do 2 × 20-min walks. I'll update your plan." },
];

export const ChatThread = () => {
  const [ref, inView] = useInView();
  return (
    <Frame label="fitos · messages" className="max-w-md">
      <div className="px-5 pt-4 pb-3 border-b border-border flex items-center gap-3">
        <Avatar name="Priya Sharma" tone="sky" />
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-text-primary">Priya Sharma</p>
          <p className="text-[11px] text-primary flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Active now</p>
        </div>
        <Pill tone="emerald">WhatsApp</Pill>
      </div>
      <div ref={ref} className="p-5 space-y-2.5 bg-bg/30">
        {MESSAGES.map((m, i) => {
          const coach = m.from === "coach";
          return (
            <div key={i} className={`flex ${coach ? "justify-end" : "justify-start"}`}
              style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(10px)", transition: `all .5s ease ${i * 220}ms` }}>
              <div className={`max-w-[78%] px-3.5 py-2 text-[12.5px] leading-relaxed rounded-2xl ${coach ? "bg-primary text-black rounded-br-md" : "bg-surface-elevated border border-border text-text-primary rounded-bl-md"}`}>
                {m.text}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};

/* ── Full dashboard composite (overview payoff) ──────────────── */
const ACTIVITY = [
  { dot: "bg-primary", text: "Workout plan published for Marcus", t: "2m" },
  { dot: "bg-emerald-400", text: "Priya submitted a check-in", t: "18m" },
  { dot: "bg-violet-400", text: "Aisha uploaded progress photos", t: "1h" },
  { dot: "bg-sky-400", text: "Meal photo logged by David", t: "3h" },
];

export const DashboardMockup = ({ className = "" }) => {
  const [ref, inView] = useInView();
  const bars = [42, 64, 51, 78, 60, 88, 72];
  return (
    <Frame label="app.fitos.com/trainer/dashboard" className={className}>
      <div ref={ref} className="flex">
        {/* Sidebar */}
        <div className="hidden sm:flex flex-col gap-1 w-14 shrink-0 border-r border-border bg-surface py-4 px-2">
          {[HomeIcon, UsersIcon, DumbbellIcon, ChartBarIcon, CalendarIcon].map((Icon, i) => (
            <span key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 0 ? "bg-primary/15 text-primary" : "text-text-muted"}`}>
              <Icon size={18} />
            </span>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-4 sm:p-5 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[13px] sm:text-sm font-semibold text-text-primary">Good morning, Coach 👋</p>
              <p className="text-[11px] text-text-muted">Here&apos;s your roster today</p>
            </div>
            <span className="hidden sm:inline"><Pill tone="primary">Pro</Pill></span>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {[
              { label: "Active clients", end: 24, icon: UsersIcon },
              { label: "Check-ins due", end: 6, icon: BoltIcon },
              { label: "Avg adherence", end: 91, suffix: "%", icon: TargetIcon },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-surface-elevated/60 p-3">
                <s.icon size={15} className="text-primary mb-1.5" />
                <p className="text-base sm:text-lg font-bold text-text-primary leading-none">
                  <CountUp end={s.end} suffix={s.suffix || ""} duration={1500} />
                </p>
                <p className="text-[10px] text-text-muted mt-1 truncate">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Mini chart */}
            <div className="rounded-xl border border-border bg-surface-elevated/60 p-3">
              <p className="text-[11px] text-text-muted mb-3">Check-ins reviewed</p>
              <div className="flex items-end gap-1.5 h-20">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-primary/80"
                    style={{ height: inView ? `${h}%` : "0%", transition: `height .9s cubic-bezier(.22,1,.36,1) ${i * 80}ms` }} />
                ))}
              </div>
            </div>
            {/* Activity */}
            <div className="rounded-xl border border-border bg-surface-elevated/60 p-3">
              <p className="text-[11px] text-text-muted mb-2.5">Recent activity</p>
              <div className="space-y-2">
                {ACTIVITY.map((a, i) => (
                  <div key={i} className="flex items-center gap-2"
                    style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateX(10px)", transition: `all .5s ease ${300 + i * 120}ms` }}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.dot}`} />
                    <span className="text-[11px] text-text-secondary truncate flex-1">{a.text}</span>
                    <span className="text-[10px] text-text-muted">{a.t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
};
