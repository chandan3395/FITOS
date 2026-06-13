import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MarketingNav, { TRIAL_HREF, DEMO_HREF } from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import Reveal from "../../components/marketing/Reveal";
import CountUp from "../../components/marketing/CountUp";
import {
  BrandOrb, ClientsPanel, WorkoutBuilder, MacroRings,
  ProgressCompare, CheckinMetrics, ChatThread, DashboardMockup,
} from "../../components/marketing/Visuals";
import {
  UsersIcon, DumbbellIcon, ChartBarIcon, BoltIcon,
  CheckCircleIcon, TargetIcon, TrendUpIcon, CalendarIcon,
} from "../../components/design-system/Icons";
import { prefersReducedMotion } from "../../components/marketing/useInView";

/* ── shared bits ─────────────────────────────────────────────── */
const Eyebrow = ({ children }) => (
  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[12px] font-semibold tracking-wide uppercase">
    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {children}
  </span>
);

const Cta = ({ size = "lg" }) => (
  <div className="flex flex-col sm:flex-row items-center gap-3">
    <Link
      to={TRIAL_HREF}
      className={`inline-flex items-center justify-center rounded-xl bg-primary hover:bg-primary-hover text-black font-semibold shadow-glow-sm hover:shadow-glow hover:-translate-y-px transition-all ${size === "lg" ? "h-12 px-7 text-base" : "h-11 px-5 text-sm"} w-full sm:w-auto`}
    >
      Start free trial
    </Link>
    <a
      href={DEMO_HREF}
      className={`inline-flex items-center justify-center rounded-xl border border-border hover:border-line-hover bg-surface-elevated/40 text-text-primary font-medium transition-colors ${size === "lg" ? "h-12 px-7 text-base" : "h-11 px-5 text-sm"} w-full sm:w-auto`}
    >
      Book a demo
    </a>
  </div>
);

const FeatureChip = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-elevated/50 text-[12.5px] text-text-secondary">
    <CheckCircleIcon size={13} className="text-primary" /> {children}
  </span>
);

/* ── Hero ────────────────────────────────────────────────────── */
const Hero = () => {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const FloatCard = ({ className, icon: Icon, title, value, tone = "text-primary", delay = "0s" }) => (
    <div className={`hidden md:flex absolute items-center gap-2.5 px-3.5 py-2.5 rounded-xl glass border border-border shadow-card-lg animate-float ${className}`} style={{ animationDelay: delay }}>
      <span className={`w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center ${tone}`}><Icon size={16} /></span>
      <div>
        <p className="text-[10px] text-text-muted leading-none">{title}</p>
        <p className="text-[13px] font-bold text-text-primary mt-1 leading-none">{value}</p>
      </div>
    </div>
  );

  return (
    <section className="relative overflow-hidden pt-32 sm:pt-40 pb-20">
      {/* Ambient parallax orbs */}
      <BrandOrb className="w-[600px] h-[600px] -top-40 left-1/2 -translate-x-1/2" />
      <div aria-hidden className="pointer-events-none absolute -left-32 top-40 w-[380px] h-[380px] rounded-full blur-[120px] bg-primary/10" style={{ transform: `translateY(${y * 0.12}px)` }} />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-72 w-[320px] h-[320px] rounded-full blur-[120px] bg-sky-500/10" style={{ transform: `translateY(${y * -0.08}px)` }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <Reveal><Eyebrow>Fitness Coaching CRM Platform</Eyebrow></Reveal>
          <Reveal delay={80} as="h1" className="mt-6 text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-text-primary leading-[1.05]">
            Run your entire coaching <br className="hidden sm:block" />
            business from <span className="gradient-text">one platform.</span>
          </Reveal>
          <Reveal delay={160} as="p" className="mt-6 text-base sm:text-lg text-text-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Clients, workout & nutrition plans, progress photos, check-ins, and
            client communication — unified in one premium dashboard built for
            fitness professionals.
          </Reveal>
          <Reveal delay={240} className="mt-8 flex justify-center lg:justify-start">
            <Cta />
          </Reveal>
          <Reveal delay={320} as="p" className="mt-6 text-[12.5px] text-text-muted">
            Built for Personal Trainers · Online Coaches · Fitness Businesses · Gym Owners
          </Reveal>
        </div>

        {/* Visual */}
        <Reveal delay={200} y={40} className="relative">
          <div style={{ transform: `translateY(${y * -0.04}px)` }}>
            <DashboardMockup />
          </div>
          <FloatCard className="-top-5 -left-4 lg:-left-10" icon={CheckCircleIcon} title="Adherence" value="92%" delay="0s" />
          <FloatCard className="-bottom-6 -right-2 lg:-right-8" icon={BoltIcon} title="New check-in" value="Priya S." tone="text-emerald-300" delay="1.4s" />
          <FloatCard className="top-1/3 -right-6 lg:-right-12" icon={TrendUpIcon} title="Plan published" value="Push Day" tone="text-sky-300" delay="2.6s" />
        </Reveal>
      </div>
    </section>
  );
};

/* ── Proof stat band ─────────────────────────────────────────── */
const STATS = [
  { end: 3200, suffix: "+", label: "Coaches onboarded" },
  { end: 84000, suffix: "+", label: "Clients managed" },
  { end: 1200000, suffix: "+", label: "Check-ins reviewed" },
  { end: 99.9, suffix: "%", decimals: 1, label: "Platform uptime" },
];

const fmtBig = (n) => (n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : n);

const StatBand = () => (
  <section className="relative border-y border-border bg-surface/30">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 lg:grid-cols-4 gap-8">
      {STATS.map((s, i) => (
        <Reveal key={s.label} delay={i * 90} className="text-center">
          <p className="text-3xl sm:text-4xl font-extrabold text-text-primary">
            {s.end >= 1000
              ? <><span>{fmtBig(s.end)}</span>{s.suffix}</>
              : <CountUp end={s.end} decimals={s.decimals || 0} suffix={s.suffix} />}
          </p>
          <p className="text-[12.5px] text-text-muted mt-2">{s.label}</p>
        </Reveal>
      ))}
    </div>
  </section>
);

/* ── Problem → Solution ──────────────────────────────────────── */
const PAINS = [
  { icon: UsersIcon, t: "Clients in spreadsheets", d: "Scattered rows that never tell you who needs attention today." },
  { icon: DumbbellIcon, t: "Workouts over WhatsApp", d: "Plans buried in chat threads, impossible to track or update." },
  { icon: ChartBarIcon, t: "Progress photos by hand", d: "Screenshots in camera rolls with no way to compare weeks." },
  { icon: CalendarIcon, t: "Lost check-in history", d: "No record of how a client trended over a 12-week block." },
  { icon: BoltIcon, t: "Five tools, no system", d: "Docs, sheets, chats, drives — switching kills your time." },
];

const ProblemSection = () => (
  <section className="relative py-24 sm:py-28">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="max-w-2xl">
        <Reveal><Eyebrow>The problem</Eyebrow></Reveal>
        <Reveal delay={80} as="h2" className="mt-5 text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
          Coaching shouldn&apos;t feel <span className="text-text-muted line-through decoration-red-500/50">chaotic.</span>
        </Reveal>
        <Reveal delay={140} as="p" className="mt-4 text-text-secondary text-base leading-relaxed">
          As your roster grows, the tools that got you started start working against you. Great coaching gets lost in admin.
        </Reveal>
      </div>

      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PAINS.map((p, i) => (
          <Reveal key={p.t} delay={i * 80}>
            <div className="card card-hover h-full p-5">
              <span className="w-10 h-10 rounded-xl bg-red-500/10 text-red-300 flex items-center justify-center mb-4"><p.icon size={18} /></span>
              <p className="text-sm font-semibold text-text-primary">{p.t}</p>
              <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">{p.d}</p>
            </div>
          </Reveal>
        ))}
        {/* Resolve card */}
        <Reveal delay={PAINS.length * 80}>
          <div className="relative h-full p-5 rounded-2xl border border-primary/30 bg-primary/[0.06] overflow-hidden">
            <BrandOrb className="w-40 h-40 -bottom-16 -right-10" animate={false} />
            <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4"><CheckCircleIcon size={18} /></span>
            <p className="text-sm font-bold text-text-primary">FITOS brings it all together.</p>
            <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">One organized system for clients, programming, and accountability.</p>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

/* ── Feature section (alternating) ───────────────────────────── */
const FeatureSection = ({ id, eyebrow, title, description, features, visual, reverse }) => (
  <section id={id} className="relative py-20 sm:py-24 scroll-mt-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className={`grid lg:grid-cols-2 gap-12 lg:gap-16 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        {/* Copy */}
        <Reveal x={reverse ? 30 : -30} y={20}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-text-primary tracking-tight leading-tight">{title}</h2>
          <p className="mt-4 text-text-secondary text-base leading-relaxed max-w-lg">{description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {features.map((f) => <FeatureChip key={f}>{f}</FeatureChip>)}
          </div>
        </Reveal>
        {/* Visual */}
        <Reveal x={reverse ? -30 : 30} y={20} delay={120} className="relative flex justify-center">
          <BrandOrb className="w-72 h-72 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60" />
          <div className="relative w-full max-w-md">{visual}</div>
        </Reveal>
      </div>
    </div>
  </section>
);

/* ── Dashboard payoff ────────────────────────────────────────── */
const CAPABILITIES = [
  "Trainer dashboard", "Client dashboard", "Activity tracking", "Workout templates",
  "Nutrition templates", "Photo comparison", "Meal check-ins", "WhatsApp invites",
  "Notifications", "Adherence monitoring", "Archived clients", "Health history",
];

const DashboardSection = () => (
  <section id="dashboard" className="relative py-24 sm:py-28 scroll-mt-20 overflow-hidden">
    <BrandOrb className="w-[700px] h-[700px] -top-20 left-1/2 -translate-x-1/2 opacity-50" />
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 text-center">
      <Reveal><Eyebrow>One platform</Eyebrow></Reveal>
      <Reveal delay={80} as="h2" className="mt-5 text-3xl sm:text-5xl font-bold text-text-primary tracking-tight">
        Everything you need. <span className="gradient-text">One dashboard.</span>
      </Reveal>
      <Reveal delay={140} as="p" className="mt-4 text-text-secondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
        Client activity, plan assignments, check-ins, progress photos, and business performance — all on a single screen.
      </Reveal>

      <Reveal delay={200} y={40} className="mt-12 group">
        <div className="transition-transform duration-500 group-hover:-translate-y-1.5 [perspective:1200px]">
          <div className="shadow-glow rounded-2xl transition-shadow duration-500 group-hover:shadow-[0_0_0_1px_rgba(166,206,57,0.25),0_30px_80px_rgba(166,206,57,0.18)]">
            <DashboardMockup />
          </div>
        </div>
      </Reveal>

      <Reveal delay={120} className="mt-10 flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
        {CAPABILITIES.map((c) => (
          <span key={c} className="px-3 py-1.5 rounded-full border border-border bg-surface-elevated/40 text-[12.5px] text-text-secondary">{c}</span>
        ))}
      </Reveal>
    </div>
  </section>
);

/* ── Why FITOS ───────────────────────────────────────────────── */
const VALUES = [
  { icon: TrendUpIcon, t: "Higher client retention", d: "Consistent check-ins and visible progress keep clients engaged and renewing." },
  { icon: BoltIcon, t: "Coach efficiency", d: "Templates and one-click assignment cut admin so you coach more, type less." },
  { icon: ChartBarIcon, t: "Business growth", d: "Take on more clients without losing the personal touch that sells you." },
  { icon: CheckCircleIcon, t: "Real accountability", d: "Adherence, photos, and meal logs surface who needs you — before they churn." },
  { icon: TargetIcon, t: "Simplified operations", d: "Replace five disconnected tools with one source of truth." },
  { icon: UsersIcon, t: "Scalable systems", d: "From solo PT to a coaching team managing hundreds — FITOS scales with you." },
];

const WhySection = () => (
  <section id="why" className="relative py-24 sm:py-28 scroll-mt-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="max-w-2xl">
        <Reveal><Eyebrow>Why FITOS</Eyebrow></Reveal>
        <Reveal delay={80} as="h2" className="mt-5 text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
          Built specifically for fitness professionals.
        </Reveal>
        <Reveal delay={140} as="p" className="mt-4 text-text-secondary text-base leading-relaxed">
          Not a generic CRM bent into shape — every workflow is designed around how coaches actually work.
        </Reveal>
      </div>
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {VALUES.map((v, i) => (
          <Reveal key={v.t} delay={i * 70}>
            <div className="card card-hover h-full p-6">
              <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4"><v.icon size={20} /></span>
              <p className="text-base font-semibold text-text-primary">{v.t}</p>
              <p className="text-[13.5px] text-text-secondary mt-2 leading-relaxed">{v.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ── Testimonials (marquee) ──────────────────────────────────── */
const TESTIMONIALS = [
  { q: "FITOS replaced four tools overnight. My clients think I hired an assistant.", n: "Jordan Hale", r: "Online Coach", tone: "primary" },
  { q: "Check-ins and progress photos in one place changed how I coach. Retention is up massively.", n: "Sara Mbeki", r: "Personal Trainer", tone: "sky" },
  { q: "My team manages 400+ clients without anything slipping through the cracks.", n: "Daniel Cruz", r: "Gym Owner", tone: "violet" },
  { q: "Building and assigning workout plans went from an hour to five minutes.", n: "Aisha Rahman", r: "Strength Coach", tone: "amber" },
  { q: "The accountability tools alone are worth it. I see who's drifting before they quit.", n: "Tom Becker", r: "Fitness Business Owner", tone: "emerald" },
];

const Tone = {
  primary: "bg-primary/20 text-primary", sky: "bg-sky-500/20 text-sky-300",
  violet: "bg-violet-500/20 text-violet-300", amber: "bg-amber-500/20 text-amber-300",
  emerald: "bg-emerald-500/20 text-emerald-300",
};

const TestimonialCard = ({ t }) => (
  <figure className="w-[330px] sm:w-[380px] shrink-0 card p-6 mx-3">
    <div className="flex gap-1 text-primary mb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.9-5.3-2.8-5.3 2.8 1-5.9L1.5 7.7l5.9-.9L10 1.5z" /></svg>
      ))}
    </div>
    <blockquote className="text-[14.5px] text-text-primary leading-relaxed">“{t.q}”</blockquote>
    <figcaption className="mt-5 flex items-center gap-3">
      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold ${Tone[t.tone]}`}>
        {t.n.split(" ").map((w) => w[0]).join("")}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-text-primary">{t.n}</p>
        <p className="text-[11.5px] text-text-muted">{t.r}</p>
      </div>
    </figcaption>
  </figure>
);

const Testimonials = () => {
  const row = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section id="testimonials" className="relative py-24 sm:py-28 scroll-mt-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center mb-12">
        <Reveal><Eyebrow>Loved by coaches</Eyebrow></Reveal>
        <Reveal delay={80} as="h2" className="mt-5 text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
          Trusted by professionals who take coaching seriously.
        </Reveal>
      </div>
      {/* Marquee */}
      <div className="relative group">
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
          {row.map((t, i) => <TestimonialCard key={i} t={t} />)}
        </div>
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-bg to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bg to-transparent" />
      </div>
    </section>
  );
};

/* ── Security ────────────────────────────────────────────────── */
const SECURITY = [
  { t: "Secure authentication", d: "Google OAuth and JWT-based sessions with refresh-token rotation." },
  { t: "Role-based access control", d: "Trainers, clients, and admins each see exactly what they should — nothing more." },
  { t: "Encrypted in transit", d: "All traffic is served over HTTPS with modern TLS." },
  { t: "Secure file storage", d: "Progress and meal photos stored on hardened, access-controlled cloud storage." },
  { t: "Cloud-hosted infrastructure", d: "Reliable, monitored infrastructure with automated backups." },
  { t: "Privacy-first architecture", d: "Client relationships are keyed by ID — your data is yours, isolated per coach." },
];

const SecuritySection = () => (
  <section id="security" className="relative py-24 sm:py-28 scroll-mt-20 border-y border-border bg-surface/20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="max-w-2xl">
        <Reveal><Eyebrow>Security & privacy</Eyebrow></Reveal>
        <Reveal delay={80} as="h2" className="mt-5 text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">
          Your data stays protected.
        </Reveal>
        <Reveal delay={140} as="p" className="mt-4 text-text-secondary text-base leading-relaxed">
          Your clients trust you with sensitive information. We treat it with the same care.
        </Reveal>
      </div>
      <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECURITY.map((s, i) => (
          <Reveal key={s.t} delay={i * 70}>
            <div className="card h-full p-6">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <p className="text-sm font-semibold text-text-primary">{s.t}</p>
              <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">{s.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ── FAQ ─────────────────────────────────────────────────────── */
const FAQS = [
  { q: "Who is FITOS for?", a: "FITOS is built for fitness professionals — personal trainers, online coaches, gym owners, and coaching teams who manage clients and want one organized system." },
  { q: "Can I manage multiple clients at once?", a: "Yes. FITOS is designed for scale: manage a handful of clients or hundreds across a team, each with their own profile, plans, and history." },
  { q: "Can clients upload progress and meal photos?", a: "Absolutely. Clients upload weekly progress photos (front/side/back) and daily meal photos from their own portal — you review and give feedback." },
  { q: "Can I create reusable workout and nutrition templates?", a: "Yes. Save any plan as a template and assign it to new clients in a click, then personalize from there." },
  { q: "Does FITOS work on mobile?", a: "FITOS is fully responsive. You and your clients can use it on desktop, tablet, and phone — no install required." },
  { q: "How secure is my data?", a: "We use secure authentication, role-based access, encrypted transport, and access-controlled cloud storage. Your client data is isolated to your account." },
  { q: "How do I get started?", a: "Start a free trial and sign in with Google. Add your first client, send an invite, and you're coaching in minutes." },
];

const Faq = () => {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="relative py-24 sm:py-28 scroll-mt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center mb-12">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-text-primary tracking-tight">Questions, answered.</h2>
        </Reveal>
        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 50}>
                <div className="card overflow-hidden">
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[14.5px] font-semibold text-text-primary">{f.q}</span>
                    <span className={`shrink-0 text-text-muted transition-transform duration-300 ${isOpen ? "rotate-45 text-primary" : ""}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    </span>
                  </button>
                  <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-[13.5px] text-text-secondary leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* ── Final CTA ───────────────────────────────────────────────── */
const FinalCta = () => (
  <section className="relative py-28 sm:py-36 overflow-hidden">
    <BrandOrb className="w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
    <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
      <Reveal as="h2" className="text-4xl sm:text-5xl font-extrabold tracking-tight text-text-primary leading-tight">
        Ready to scale your <span className="gradient-text">coaching business?</span>
      </Reveal>
      <Reveal delay={100} as="p" className="mt-5 text-base sm:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
        Join coaches who want a simpler, more professional way to manage clients — and grow without the chaos.
      </Reveal>
      <Reveal delay={180} className="mt-9 flex justify-center">
        <Cta />
      </Reveal>
      <Reveal delay={260} as="p" className="mt-5 text-[12.5px] text-text-muted">
        No credit card required · Set up your first client in minutes
      </Reveal>
    </div>
  </section>
);

/* ── Page ────────────────────────────────────────────────────── */
const LandingPage = () => (
  <div className="bg-bg text-text-primary min-h-screen overflow-x-hidden">
    <MarketingNav />
    <main>
      <Hero />
      <StatBand />
      <ProblemSection />

      <div id="product">
        <FeatureSection
          id="clients"
          eyebrow="Client Management"
          title="Every client. Every detail. One place."
          description="A centralized profile for each client — personal info, goals, measurements, health history, notes, progress photos, and check-ins. Know exactly who needs your attention today."
          features={["Client profiles", "Health history", "Goal tracking", "Private notes", "Client dashboard", "Archived clients"]}
          visual={<ClientsPanel />}
        />
        <FeatureSection
          id="workouts"
          reverse
          eyebrow="Workout Planning"
          title="Build workout plans in minutes."
          description="Create personalized training programs, save them as reusable templates, assign instantly, and track every completed set as your clients train."
          features={["Workout templates", "One-click assignment", "Completion tracking", "Reusable exercises", "Progress monitoring"]}
          visual={<WorkoutBuilder />}
        />
        <FeatureSection
          id="nutrition"
          eyebrow="Nutrition Management"
          title="Personalized nutrition, dialed in."
          description="Design nutrition plans with calorie and macro targets, set water and meal goals, save templates, and monitor adherence over time."
          features={["Calorie & macro targets", "Water targets", "Meal scheduling", "Nutrition templates", "Adherence tracking"]}
          visual={<MacroRings />}
        />
        <FeatureSection
          id="accountability"
          reverse
          eyebrow="Progress & Accountability"
          title="See how clients are really doing."
          description="Weekly progress photos with side-by-side comparison, structured check-ins covering sleep, energy, stress and adherence, plus daily meal photos — so nothing slips."
          features={["Progress photos", "Compare mode", "Weekly check-ins", "Meal check-ins", "Action-required alerts"]}
          visual={<div className="space-y-4"><ProgressCompare /><CheckinMetrics /></div>}
        />
        <FeatureSection
          id="communication"
          eyebrow="Communication & Automation"
          title="Stay connected, automatically."
          description="Keep coaching conversations organized, send reminders, onboard clients over WhatsApp, and keep everyone updated — without living in your inbox."
          features={["Messaging", "WhatsApp invites", "Notifications", "Reminders", "Client updates"]}
          visual={<ChatThread />}
        />
      </div>

      <DashboardSection />
      <WhySection />
      <Testimonials />
      <SecuritySection />
      <Faq />
      <FinalCta />
    </main>
    <MarketingFooter />
  </div>
);

export default LandingPage;
