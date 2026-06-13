import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MarketingNav, { GETSTARTED_HREF } from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import Reveal from "../../components/marketing/Reveal";
import { prefersReducedMotion } from "../../components/marketing/useInView";
import {
  BrandOrb, ClientsPanel, WorkoutBuilder, MacroRings,
  ProgressCompare, CheckinMetrics, DashboardMockup,
} from "../../components/marketing/Visuals";
import { AlertFeed, PhoneMockup } from "../../components/marketing/MarketingScenes";
import {
  LayersIcon, BellIcon, ChatIcon, GridIcon, GaugeIcon, HeartPulseIcon,
  IdCardIcon, MealIcon, DumbbellIcon, VideoCheckIcon, ClipboardCheckIcon,
  WalletIcon, TrendingIcon, ArrowRightIcon, StarIcon,
} from "../../components/marketing/MarketingIcons";

const IMG = {
  about: "/marketing/training.jpg",
  t1: "/marketing/trainer-1.jpg",
  t2: "/marketing/trainer-2.jpg",
  t3: "/marketing/trainer-3.jpg",
  t4: "/marketing/trainer-4.jpg",
};

/* ── shared bits ─────────────────────────────────────────────── */
const Eyebrow = ({ children, center }) => (
  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11.5px] font-semibold tracking-[0.12em] uppercase ${center ? "" : ""}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {children}
  </span>
);

const Chip = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-elevated/50 text-[12.5px] text-text-secondary">
    <span className="w-1 h-1 rounded-full bg-primary" /> {children}
  </span>
);

const PrimaryCta = ({ children = "Get started", className = "" }) => (
  <Link
    to={GETSTARTED_HREF}
    className={`group inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl bg-primary hover:bg-primary-hover text-black font-semibold shadow-glow-sm hover:shadow-glow hover:-translate-y-px transition-all ${className}`}
  >
    {children} <ArrowRightIcon size={17} className="group-hover:translate-x-0.5 transition-transform" />
  </Link>
);

/* ── Hero ────────────────────────────────────────────────────── */
const Hero = () => {
  const [y, setY] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setY(window.scrollY)); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <section className="relative overflow-hidden pt-32 sm:pt-40 pb-20 sm:pb-28">
      <BrandOrb className="w-[640px] h-[640px] -top-48 left-1/2 -translate-x-1/2 opacity-70" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-64 w-[360px] h-[360px] rounded-full blur-[120px] bg-sky-500/10" style={{ transform: `translateY(${y * -0.06}px)` }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-12 items-center">
        <div className="text-center lg:text-left">
          <Reveal><Eyebrow>Fitness Coaching Platform</Eyebrow></Reveal>
          <Reveal delay={80} as="h1" className="mt-6 text-[2.6rem] leading-[1.04] sm:text-6xl xl:text-7xl font-extrabold tracking-tight text-text-primary">
            Powering the next<br className="hidden sm:block" /> generation of <span className="gradient-text">fitness pros.</span>
          </Reveal>
          <Reveal delay={160} as="p" className="mt-6 text-base sm:text-lg text-text-secondary max-w-lg mx-auto lg:mx-0 leading-relaxed">
            Clients, workouts, nutrition, progress, and check-ins — unified in one premium platform built for coaches.
          </Reveal>
          <Reveal delay={240} className="mt-8 flex items-center gap-3 justify-center lg:justify-start">
            <PrimaryCta />
            <Link to={GETSTARTED_HREF} className="h-12 px-6 inline-flex items-center rounded-xl border border-border hover:border-line-hover text-text-primary font-medium transition-colors">
              Sign in
            </Link>
          </Reveal>
          <Reveal delay={320} className="mt-9 flex items-center gap-3 justify-center lg:justify-start">
            <div className="flex -space-x-2.5">
              {[IMG.t1, IMG.t2, IMG.t3, IMG.t4].map((src) => (
                <img key={src} src={src} alt="" loading="lazy" className="w-9 h-9 rounded-full object-cover border-2 border-bg" />
              ))}
            </div>
            <p className="text-[13px] text-text-secondary">Trusted by <span className="text-text-primary font-semibold">10k+ coaches</span> globally</p>
          </Reveal>
        </div>

        <Reveal delay={200} y={40} className="relative">
          <BrandOrb className="w-[420px] h-[420px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60" />
          <div className="relative" style={{ transform: `translateY(${y * -0.04}px)` }}>
            <DashboardMockup />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ── About ───────────────────────────────────────────────────── */
const About = () => (
  <section id="about" className="relative py-24 sm:py-28 scroll-mt-24">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <Reveal x={-24}>
        <Eyebrow>About FITOS</Eyebrow>
        <h2 className="mt-5 text-3xl sm:text-4xl xl:text-5xl font-bold tracking-tight text-text-primary leading-[1.06]">
          Coaching, made <span className="gradient-text">personal.</span>
        </h2>
        <p className="mt-6 text-base sm:text-lg text-text-secondary leading-relaxed max-w-lg">
          Our mission is to make coaching more personal and meaningful. FITOS is a complete
          ecosystem that helps coaches strengthen client relationships, deliver tailored
          experiences, and improve retention — without the busywork.
        </p>
      </Reveal>
      <Reveal x={28} delay={120} className="relative">
        <div className="pointer-events-none absolute -inset-6 rounded-[40px] blur-[80px] bg-primary/10 opacity-70" />
        <div className="relative rounded-[22px] overflow-hidden border border-border shadow-card-lg aspect-[4/3]">
          <img src={IMG.about} alt="A coach training a client" loading="lazy" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/70 via-transparent to-transparent" />
        </div>
      </Reveal>
    </div>
  </section>
);

/* ── Storytelling section (alternating, large visual, horizontal reveal) ── */
const StorySection = ({ id, eyebrow, title, copy, points, visual, reverse, glow = "bg-primary/10" }) => (
  <section id={id} className="relative py-20 sm:py-24 scroll-mt-24">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <Reveal x={reverse ? 24 : -24}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-5 text-3xl sm:text-4xl xl:text-[2.7rem] font-bold tracking-tight text-text-primary leading-[1.08]">{title}</h2>
          <p className="mt-5 text-text-secondary text-base sm:text-lg leading-relaxed max-w-md">{copy}</p>
          {points && (
            <div className="mt-6 flex flex-wrap gap-2">
              {points.map((p) => <Chip key={p}>{p}</Chip>)}
            </div>
          )}
        </Reveal>
        <Reveal x={reverse ? -28 : 28} delay={120} className="relative flex justify-center">
          <div className={`pointer-events-none absolute -inset-6 rounded-[40px] blur-[80px] ${glow} opacity-70`} />
          <div className="relative w-full flex justify-center">{visual}</div>
        </Reveal>
      </div>
    </div>
  </section>
);

/* ── Automated Hound ─────────────────────────────────────────── */
const Hound = () => (
  <section className="relative py-24 sm:py-28 overflow-hidden">
    <BrandOrb className="w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40" />
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <Reveal x={-24}>
        <Eyebrow>Alert Mechanism</Eyebrow>
        <h2 className="mt-5 text-3xl sm:text-4xl xl:text-5xl font-bold tracking-tight text-text-primary leading-[1.06]">
          The Automated <span className="gradient-text">Hound.</span>
        </h2>
        <p className="mt-6 text-base sm:text-lg text-text-secondary leading-relaxed max-w-lg">
          Client follow-up at every stage — automatically. The Hound watches for missed
          check-ins, stalled progress, and expiring plans, then reaches out to reinforce
          accountability, consistency, and discipline.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {["Accountability", "Consistency", "Discipline"].map((p) => <Chip key={p}>{p}</Chip>)}
        </div>
      </Reveal>
      <Reveal x={28} delay={120}>
        <AlertFeed />
      </Reveal>
    </div>
  </section>
);

/* ── Benefits (the one allowed 6-card grid) ──────────────────── */
const BENEFITS = [
  { icon: LayersIcon, t: "No more clutter", d: "Consolidate WhatsApp chats, spreadsheets, and notes into one platform." },
  { icon: BellIcon, t: "Automatic reminders", d: "Keep clients consistent with scheduled alerts and follow-ups." },
  { icon: ChatIcon, t: "In-app communication", d: "Chat directly with clients for updates, feedback, and motivation." },
  { icon: GridIcon, t: "Organized dashboard", d: "View client progress, payments, and schedules in one place." },
  { icon: GaugeIcon, t: "Improved efficiency", d: "Spend less time managing data and more time coaching." },
  { icon: HeartPulseIcon, t: "Better retention", d: "Build stronger client relationships and improve retention." },
];

const Benefits = () => (
  <section id="benefits" className="relative py-24 sm:py-28 scroll-mt-24">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <Reveal className="text-center">
        <Eyebrow center>Benefits</Eyebrow>
        <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">Why coaches choose FITOS.</h2>
      </Reveal>
      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BENEFITS.map((b, i) => (
          <Reveal key={b.t} delay={(i % 3) * 90}>
            <div className="group h-full rounded-2xl border border-border bg-card p-6 hover:border-line-hover hover:-translate-y-1 transition-all duration-300">
              <span className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"><b.icon size={22} /></span>
              <p className="text-lg font-semibold text-text-primary">{b.t}</p>
              <p className="text-[13.5px] text-text-secondary mt-2 leading-relaxed">{b.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ── Features + Mobile app ───────────────────────────────────── */
const FEATURES = [
  { icon: IdCardIcon, t: "Retain client profiles", d: "Full history, goals & notes." },
  { icon: MealIcon, t: "Meal tracking", d: "Daily meals & nutrition adherence." },
  { icon: DumbbellIcon, t: "Workout tracking", d: "Assign plans, track every set." },
  { icon: VideoCheckIcon, t: "Form check", d: "Clients send technique videos." },
  { icon: ClipboardCheckIcon, t: "Check-ins", d: "Sleep, energy, stress & adherence." },
  { icon: WalletIcon, t: "Payments & messaging", d: "Billing and chat, side by side." },
  { icon: TrendingIcon, t: "Progress tracking", d: "Photos, trends & timelines." },
];

const Features = () => (
  <section id="features" className="relative py-24 sm:py-28 scroll-mt-24 overflow-hidden">
    <BrandOrb className="w-[34rem] h-[34rem] top-20 -left-40 opacity-40" />
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
      <Reveal className="text-center">
        <Eyebrow center>Features</Eyebrow>
        <h2 className="mt-5 text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">Everything your coaching needs.</h2>
      </Reveal>

      <div className="mt-16 grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        <Reveal x={-24} className="flex justify-center order-1">
          <PhoneMockup />
        </Reveal>
        <div className="order-2 grid sm:grid-cols-2 gap-x-8 gap-y-7">
          {FEATURES.map((f, i) => (
            <Reveal key={f.t} delay={(i % 2) * 80} x={20}>
              <div className="flex items-start gap-3.5">
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><f.icon size={19} /></span>
                <div>
                  <p className="text-[15px] font-semibold text-text-primary">{f.t}</p>
                  <p className="text-[13px] text-text-secondary mt-0.5 leading-relaxed">{f.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  </section>
);

/* ── Testimonials (real photos) ──────────────────────────────── */
const TESTIMONIALS = [
  { q: "FITOS has revolutionized how I manage my clients. The progress tracking and payment features are game-changers.", n: "Sarah Miller", r: "Elite Personal Trainer", img: IMG.t2 },
  { q: "My clients love the dashboard and I love having everything in one place. It's truly built for coaches.", n: "David Lee", r: "Online Fitness Coach", img: IMG.t3 },
  { q: "Implementing FITOS increased our efficiency and client satisfaction. It's an indispensable tool for our gym.", n: "Jessica Chen", r: "Studio Owner", img: IMG.t4 },
];

const Testimonials = () => (
  <section id="testimonials" className="relative py-24 sm:py-28 scroll-mt-24">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <Reveal className="text-center mb-14">
        <Eyebrow center>Testimonials</Eyebrow>
        <h2 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight text-text-primary">Hear from our successful trainers.</h2>
      </Reveal>
      <div className="grid md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={t.n} delay={i * 110}>
            <figure className="group h-full rounded-2xl border border-border bg-card p-6 hover:border-line-hover hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center gap-3.5">
                <img src={t.img} alt={t.n} loading="lazy" className="w-12 h-12 rounded-full object-cover border border-border" />
                <div>
                  <p className="text-[15px] font-semibold text-text-primary">{t.n}</p>
                  <p className="text-[11px] tracking-[0.12em] uppercase text-text-muted">{t.r}</p>
                </div>
              </div>
              <div className="flex gap-0.5 text-primary mt-5">
                {Array.from({ length: 5 }).map((_, s) => <StarIcon key={s} size={14} />)}
              </div>
              <blockquote className="mt-3 text-[14.5px] text-text-secondary leading-relaxed">“{t.q}”</blockquote>
            </figure>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

/* ── Final CTA ───────────────────────────────────────────────── */
const FinalCta = () => (
  <section className="relative py-28 sm:py-36 overflow-hidden">
    <BrandOrb className="w-[640px] h-[640px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
    <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
      <Reveal as="h2" className="text-4xl sm:text-6xl font-extrabold tracking-tight text-text-primary leading-[1.02]">
        Ready to transform your <span className="gradient-text">fitness business?</span>
      </Reveal>
      <Reveal delay={100} as="p" className="mt-5 text-base sm:text-lg text-text-secondary max-w-xl mx-auto leading-relaxed">
        Join coaches building stronger client relationships with FITOS.
      </Reveal>
      <Reveal delay={180} className="mt-9 flex justify-center">
        <PrimaryCta>Join FITOS today</PrimaryCta>
      </Reveal>
    </div>
  </section>
);

/* ── Page ────────────────────────────────────────────────────── */
const LandingPage = () => (
  <div className="bg-bg text-text-primary min-h-screen overflow-x-hidden isolate">
    <MarketingNav />
    <main>
      <Hero />
      <About />

      <StorySection
        id="client"
        eyebrow="Client Management"
        title="Your entire client history, centralized."
        copy="Profiles, goals, measurements, notes, photos, and check-ins — every detail in one organized place."
        points={["Profiles", "Health history", "Notes"]}
        visual={<ClientsPanel />}
      />
      <StorySection
        id="workout"
        reverse
        eyebrow="Workout Planning"
        title="Build and assign plans in minutes."
        copy="Design personalized programs, save reusable templates, and track every completed set."
        points={["Templates", "One-click assign", "Tracking"]}
        visual={<WorkoutBuilder />}
        glow="bg-sky-500/10"
      />
      <StorySection
        id="nutrition"
        eyebrow="Nutrition"
        title="Personalized nutrition, dialed in."
        copy="Set calorie and macro targets, plan meals, and monitor adherence at a glance."
        points={["Macros", "Meal plans", "Adherence"]}
        visual={<MacroRings />}
      />
      <StorySection
        id="progress"
        reverse
        eyebrow="Progress Tracking"
        title="See every transformation."
        copy="Weekly photo comparisons and trends turn progress into something clients can see and feel."
        points={["Photo compare", "Trends", "Timelines"]}
        visual={<ProgressCompare />}
        glow="bg-sky-500/10"
      />
      <StorySection
        id="checkins"
        eyebrow="Check-ins"
        title="Know how clients really feel."
        copy="Structured weekly check-ins surface sleep, energy, stress, and adherence — so nothing slips."
        points={["Weekly review", "Adherence", "Alerts"]}
        visual={<CheckinMetrics />}
      />

      <Hound />
      <Benefits />
      <Features />
      <Testimonials />
      <FinalCta />
    </main>
    <MarketingFooter />
  </div>
);

export default LandingPage;
