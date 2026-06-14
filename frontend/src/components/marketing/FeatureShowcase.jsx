import { useEffect, useState } from "react";
import useInView from "./useInView";
import Reveal from "./Reveal";
import {
  BellIcon, IdCardIcon, DumbbellIcon, MealIcon, TrendingIcon,
  ClipboardCheckIcon, RadarIcon, ChatIcon, GridIcon, HeartPulseIcon,
} from "./MarketingIcons";
import { CheckCircleIcon, FlameIcon, BoltIcon } from "../design-system/Icons";

const INTERVAL = 3200;

const FEATURES = [
  { title: "Automatic Reminders", icon: BellIcon, desc: "Automatically follow up with clients who miss workouts, check-ins or meal logs." },
  { title: "Client Management", icon: IdCardIcon, desc: "Manage client profiles, health history, goals, notes and progress from one place." },
  { title: "Workout Planning", icon: DumbbellIcon, desc: "Create structured workout plans and assign them to clients in seconds." },
  { title: "Nutrition Management", icon: MealIcon, desc: "Build meal plans and monitor adherence with daily tracking." },
  { title: "Progress Tracking", icon: TrendingIcon, desc: "Compare progress photos, measurements and trends over time." },
  { title: "Check-ins", icon: ClipboardCheckIcon, desc: "Track sleep, stress, energy and adherence every week." },
  { title: "Alert Mechanism", icon: RadarIcon, desc: "The Automated Hound Mechanism detects inactivity and enforces accountability." },
  { title: "In-App Messaging", icon: ChatIcon, desc: "Communicate directly with clients without relying on external apps." },
  { title: "Organized Dashboard", icon: GridIcon, desc: "Everything coaches need in a single dashboard." },
  { title: "Better Retention", icon: HeartPulseIcon, desc: "Increase accountability and improve long-term client retention." },
];

/* ── tiny screen primitives ──────────────────────────────────── */
const SHead = ({ kicker, title }) => (
  <div className="mb-3">
    <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">{kicker}</p>
    {title && <p className="text-[14px] font-bold text-text-primary mt-0.5">{title}</p>}
  </div>
);
const Bar = ({ label, pct, val, tone = "bg-primary" }) => (
  <div>
    <div className="flex justify-between text-[10.5px] mb-1"><span className="text-text-muted">{label}</span><span className="text-text-secondary">{val ?? `${pct}%`}</span></div>
    <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden"><div className={`h-full ${tone} rounded-full`} style={{ width: `${pct}%` }} /></div>
  </div>
);
const Card = ({ children, className = "" }) => (
  <div className={`rounded-xl border border-border bg-card/70 p-3 ${className}`}>{children}</div>
);
const Spark = ({ d, className = "" }) => (
  <svg viewBox="0 0 100 36" className={`w-full h-10 ${className}`} preserveAspectRatio="none">
    <polyline points={d} fill="none" stroke="#A6CE39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Ring = ({ pct, center, sub }) => {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div className="relative w-[76px] h-[76px] shrink-0">
      <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle cx="38" cy="38" r={r} fill="none" stroke="#A6CE39" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-text-primary leading-none">{center}</span>
        {sub && <span className="text-[8px] text-text-muted mt-0.5">{sub}</span>}
      </div>
    </div>
  );
};

/* ── the ten app screens ─────────────────────────────────────── */
const Screen = ({ index }) => {
  switch (index) {
    case 0: // Automatic Reminders
      return (
        <>
          <SHead kicker="Automated" title="Reminders" />
          <div className="space-y-2">
            {[["Missed workout", "Nudge sent", true], ["Meal log missing", "Reminder queued", false], ["Check-in due", "Sent", true]].map(([t, s, done]) => (
              <Card key={t} className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-primary/12 text-primary" : "bg-amber-400/10 text-amber-300"}`}>
                  {done ? <CheckCircleIcon size={15} /> : <BellIcon size={15} />}
                </span>
                <div className="min-w-0 flex-1"><p className="text-[12px] font-semibold text-text-primary truncate">{t}</p><p className="text-[10.5px] text-text-muted truncate">{s}</p></div>
              </Card>
            ))}
          </div>
        </>
      );
    case 1: // Client Management
      return (
        <>
          <SHead kicker="Profile" title="Priya Sharma" />
          <Card className="flex items-center gap-3 mb-2.5">
            <span className="w-11 h-11 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[12px] font-bold">PS</span>
            <div><p className="text-[12.5px] font-semibold text-text-primary">Fat loss · 12 wk</p><p className="text-[10.5px] text-text-muted">Member since Jan 2026</p></div>
          </Card>
          <div className="grid grid-cols-3 gap-2 mb-2.5">
            {[["Weight", "−6.2kg"], ["Adherence", "92%"], ["Streak", "18d"]].map(([l, v]) => (
              <Card key={l} className="text-center"><p className="text-[13px] font-bold text-text-primary">{v}</p><p className="text-[9px] text-text-muted mt-0.5">{l}</p></Card>
            ))}
          </div>
          <Card><p className="text-[10.5px] text-text-muted">Notes</p><p className="text-[11.5px] text-text-secondary mt-1">Prefers morning sessions · knee history</p></Card>
        </>
      );
    case 2: // Workout Planning
      return (
        <>
          <SHead kicker="Push Day · Wk 3" title="Workout" />
          <div className="space-y-2 mb-3">
            {[["Bench Press", "4 × 10", true], ["Incline Press", "3 × 12", true], ["Cable Fly", "3 × 15", false], ["Triceps", "4 × 12", false]].map(([n, s, done]) => (
              <Card key={n} className="flex items-center gap-2.5 py-2.5">
                <span className={`w-4 h-4 rounded-[5px] flex items-center justify-center shrink-0 ${done ? "bg-primary text-black" : "border border-text-muted/50"}`}>{done && <CheckCircleIcon size={11} />}</span>
                <span className="text-[12px] font-medium text-text-primary flex-1">{n}</span>
                <span className="text-[10.5px] text-text-muted font-mono">{s}</span>
              </Card>
            ))}
          </div>
          <Bar label="Completion" pct={50} val="2 / 4" />
        </>
      );
    case 3: // Nutrition
      return (
        <>
          <SHead kicker="Today" title="Nutrition" />
          <Card className="flex items-center gap-4 mb-2.5">
            <Ring pct={84} center="2,240" sub="kcal" />
            <div className="flex-1 space-y-2.5">
              <Bar label="Protein" pct={92} val="180g" />
              <Bar label="Carbs" pct={74} val="220g" tone="bg-sky-400" />
              <Bar label="Fats" pct={58} val="60g" tone="bg-amber-400" />
            </div>
          </Card>
          <div className="flex gap-2">
            <span className="flex-1 text-center rounded-lg border border-border bg-card/70 py-2 text-[10.5px] text-text-secondary">💧 3.0 L</span>
            <span className="flex-1 text-center rounded-lg border border-border bg-card/70 py-2 text-[10.5px] text-text-secondary">5 meals</span>
          </div>
        </>
      );
    case 4: // Progress Tracking
      return (
        <>
          <SHead kicker="Transformation" title="Progress" />
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {[["Week 1", "rgba(110,110,110,0.35)"], ["Week 8", "rgba(166,206,57,0.30)"]].map(([w, hue]) => (
              <div key={w} className="relative rounded-xl border border-border overflow-hidden bg-surface-elevated aspect-[3/4]">
                <div className="absolute inset-0" style={{ background: `radial-gradient(80% 60% at 50% 30%, ${hue}, transparent 70%)` }} />
                <svg viewBox="0 0 80 110" className="absolute inset-0 w-full h-full opacity-70"><path d="M40 14c5 0 8 4 8 9s-3 8-3 12l4 18-3 22 2 24h-4l-2-22-2 22h-4l2-24-3-22 4-18c0-4-3-7-3-12s3-9 7-9z" fill="rgba(255,255,255,0.10)" /></svg>
                <span className="absolute top-1.5 left-1.5 text-[8.5px] font-bold text-primary">{w}</span>
              </div>
            ))}
          </div>
          <Card><div className="flex items-center justify-between mb-1"><span className="text-[10.5px] text-text-muted">Weight trend</span><span className="text-[11px] font-bold text-primary">−6.2 kg</span></div><Spark d="0,30 16,26 32,27 48,20 64,16 80,12 100,8" /></Card>
        </>
      );
    case 5: // Check-ins
      return (
        <>
          <SHead kicker="This week" title="Check-in" />
          <Card className="space-y-3">
            <Bar label="Sleep" pct={82} val="7.4h" tone="bg-sky-400" />
            <Bar label="Energy" pct={80} val="4 / 5" tone="bg-emerald-400" />
            <Bar label="Stress" pct={30} val="Low" tone="bg-amber-400" />
            <Bar label="Adherence" pct={92} val="92%" />
          </Card>
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-emerald-300"><CheckCircleIcon size={12} /> Reviewed by coach</div>
        </>
      );
    case 6: // Alert Mechanism
      return (
        <>
          <SHead kicker="Automated Hound" title="Alert" />
          <Card className="border-primary/25 bg-primary/[0.05] mb-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center"><BoltIcon size={17} /></span>
              <div><p className="text-[12.5px] font-bold text-text-primary">Missed workout detected</p><p className="text-[10.5px] text-text-muted">Marcus Lee · 2 days inactive</p></div>
            </div>
          </Card>
          <div className="space-y-2">
            {[["Reminder triggered", true], ["Trainer notified", true], ["Client re-engaged", false]].map(([t, done]) => (
              <div key={t} className="flex items-center gap-2.5 px-1">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-primary/15 text-primary" : "border border-border text-text-muted"}`}>{done ? <CheckCircleIcon size={12} /> : <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-glow-pulse" />}</span>
                <span className={`text-[12px] ${done ? "text-text-primary" : "text-text-muted"}`}>{t}</span>
              </div>
            ))}
          </div>
        </>
      );
    case 7: // Messaging
      return (
        <>
          <SHead kicker="Conversation" title="Messages" />
          <div className="space-y-2">
            {[["client", "Hit all my workouts this week 💪"], ["coach", "Amazing, Priya! Macros on point too."], ["client", "Add cardio on rest days?"], ["coach", "Let's do 2 × 20-min walks."]].map(([from, text], i) => (
              <div key={i} className={`flex ${from === "coach" ? "justify-end" : "justify-start"}`}>
                <span className={`max-w-[82%] px-3 py-2 text-[11.5px] leading-snug rounded-2xl ${from === "coach" ? "bg-primary text-black rounded-br-sm" : "bg-surface-elevated border border-border text-text-primary rounded-bl-sm"}`}>{text}</span>
              </div>
            ))}
          </div>
        </>
      );
    case 8: // Dashboard
      return (
        <>
          <SHead kicker="Overview" title="Dashboard" />
          <div className="grid grid-cols-3 gap-2 mb-2.5">
            {[["Clients", "24"], ["Due", "6"], ["Adher.", "91%"]].map(([l, v]) => (
              <Card key={l} className="text-center"><p className="text-[15px] font-bold text-text-primary">{v}</p><p className="text-[8.5px] text-text-muted mt-0.5">{l}</p></Card>
            ))}
          </div>
          <Card>
            <p className="text-[10px] text-text-muted mb-2">Check-ins reviewed</p>
            <div className="flex items-end gap-1.5 h-16">
              {[44, 66, 52, 80, 61, 90, 73].map((h, i) => <div key={i} className="flex-1 rounded-t bg-primary" style={{ height: `${h}%` }} />)}
            </div>
          </Card>
        </>
      );
    case 9: // Better Retention
      return (
        <>
          <SHead kicker="Last 12 months" title="Retention" />
          <Card className="flex items-center gap-4 mb-2.5">
            <Ring pct={92} center="92%" sub="retained" />
            <div className="flex-1">
              <p className="text-[11px] text-text-secondary leading-relaxed">Clients staying past 6 months</p>
              <p className="text-[11px] font-bold text-emerald-300 mt-1 flex items-center gap-1"><FlameIcon size={12} className="text-amber-300" /> +37% vs last year</p>
            </div>
          </Card>
          <Card><Spark d="0,32 16,30 32,24 48,22 64,15 80,11 100,6" /></Card>
        </>
      );
    default:
      return null;
  }
};

/* ── phone shell ─────────────────────────────────────────────── */
const PhoneShell = ({ active }) => (
  <div className="relative mx-auto w-[268px] sm:w-[288px]">
    <div className="pointer-events-none absolute -inset-10 rounded-full blur-[80px] bg-primary/12" />
    <div className="relative rounded-[2.75rem] bg-[#161616] border border-white/12 p-2.5 shadow-card-lg">
      <span className="absolute -left-[3px] top-24 h-9 w-[3px] rounded-l bg-white/15" />
      <span className="absolute -left-[3px] top-36 h-14 w-[3px] rounded-l bg-white/15" />
      <span className="absolute -right-[3px] top-32 h-16 w-[3px] rounded-r bg-white/15" />
      <div className="relative rounded-[2.25rem] bg-bg overflow-hidden">
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-black z-10 border border-white/10" />
        <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] text-text-secondary font-medium"><span>9:41</span><span>●●●</span></div>
        <div className="relative h-[380px]">
          <div key={active} className="absolute inset-0 px-4 pt-2 pb-4 animate-screen-in">
            <Screen index={active} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ── section ─────────────────────────────────────────────────── */
const FeatureShowcase = () => {
  const [ref, inView] = useInView({ once: false, threshold: 0.25 });
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(null);

  // Auto-cycle only while the section is on screen and nothing is hovered.
  useEffect(() => {
    if (!inView || hovered !== null) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % FEATURES.length), INTERVAL);
    return () => clearInterval(id);
  }, [inView, hovered]);

  return (
    <section id="features" className="relative py-24 sm:py-32 scroll-mt-24 overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full blur-[130px] bg-primary/[0.07]" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11.5px] font-semibold tracking-[0.14em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> The Product
          </span>
          <h2 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight text-text-primary">Built to be felt, not read.</h2>
          <p className="mt-4 text-text-secondary max-w-xl mx-auto leading-relaxed">Hover any feature to see it come alive on the device.</p>
        </Reveal>

        <div ref={ref} className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Phone */}
          <Reveal x={-24} className="flex justify-center order-1">
            <PhoneShell active={active} />
          </Reveal>

          {/* Feature list */}
          <ul className="order-2 -my-1" onMouseLeave={() => setHovered(null)}>
            {FEATURES.map((f, i) => {
              const isActive = active === i;
              const isOpen = hovered === i;
              return (
                <li key={f.title} className="relative">
                  <div
                    tabIndex={0}
                    onMouseEnter={() => { setHovered(i); setActive(i); }}
                    onFocus={() => { setHovered(i); setActive(i); }}
                    className="group flex items-start gap-4 py-3.5 border-b border-border/60 cursor-default outline-none"
                  >
                    <span className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${isActive ? "bg-primary/15 text-primary scale-105" : "bg-surface-elevated text-text-muted"}`}>
                      <f.icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[17px] sm:text-lg font-semibold tracking-tight transition-colors duration-300 ${isActive ? "text-text-primary" : "text-text-muted group-hover:text-text-secondary"}`}>
                          {f.title}
                        </span>
                        <span className={`text-[12px] font-mono transition-colors duration-300 ${isActive ? "text-primary" : "text-text-muted/50"}`}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>

                      {/* Expanding glass context panel (hover only) */}
                      <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                        <div className="overflow-hidden">
                          <div className="mt-2.5 rounded-xl border border-primary/20 bg-primary/[0.05] px-3.5 py-3">
                            <p className="text-[13px] text-text-secondary leading-relaxed">{f.desc}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auto-cycle progress (active row, only while cycling) */}
                  {isActive && hovered === null && (
                    <span
                      key={active}
                      className="absolute left-0 bottom-0 h-[2px] bg-primary animate-progress-grow"
                      style={{ animationDuration: `${INTERVAL}ms` }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
