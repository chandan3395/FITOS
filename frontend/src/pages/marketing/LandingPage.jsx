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
import { AlertFeed } from "../../components/marketing/MarketingScenes";
import FeatureShowcase from "../../components/marketing/FeatureShowcase";
import { ArrowRightIcon, StarIcon } from "../../components/marketing/MarketingIcons";

const IMG = {
  about: "/marketing/training.jpg",
  t1: "/marketing/trainer-1.jpg",
  t2: "/marketing/trainer-2.jpg",
  t3: "/marketing/trainer-3.jpg",
  t4: "/marketing/trainer-4.jpg",
  t5: "/marketing/trainer-5.jpg",
  t6: "/marketing/trainer-6.jpg",
};

/* ── shared bits ─────────────────────────────────────────────── */
const Eyebrow = ({ children }) => (
  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11.5px] font-semibold tracking-[0.12em] uppercase">
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

/* ── Automated Hound (moved up — right after About) ──────────── */
const Hound = () => (
  <section className="relative py-24 sm:py-28 overflow-hidden">
    <BrandOrb className="w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40" />
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
      <Reveal x={-24}>
        <Eyebrow>Automated Hound Mechanism</Eyebrow>
        <h2 className="mt-5 text-3xl sm:text-4xl xl:text-5xl font-bold tracking-tight text-text-primary leading-[1.06]">
          Client follow-up at <span className="gradient-text">every stage.</span>
        </h2>
        <p className="mt-6 text-base sm:text-lg text-text-secondary leading-relaxed max-w-lg">
          FITOS automatically detects missed activities, incomplete check-ins, skipped workouts
          and nutrition gaps — then follows up with intelligent reminders to improve discipline
          and adherence.
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

/* ── Testimonials (infinite marquee, real photos, pause on hover) ── */
const TESTIMONIALS = [
  { q: "FITOS revolutionized how I manage clients. Progress tracking and payments are game-changers.", n: "Sarah Miller", r: "Elite Personal Trainer", img: IMG.t2 },
  { q: "Everything in one place. It's truly built for coaches.", n: "David Lee", r: "Online Fitness Coach", img: IMG.t1 },
  { q: "Efficiency and client satisfaction went way up. Indispensable for our gym.", n: "Jessica Chen", r: "Studio Owner", img: IMG.t4 },
  { q: "Building and assigning plans went from an hour to minutes.", n: "Marcus Doyle", r: "Strength Coach", img: IMG.t5 },
  { q: "The Automated Hound keeps my clients accountable without me chasing them.", n: "Aisha Rahman", r: "Online Coach", img: IMG.t6 },
  { q: "My team manages 400+ clients without anything slipping through the cracks.", n: "Tom Becker", r: "Gym Owner", img: IMG.t3 },
];

const TCard = ({ t }) => (
  <figure className="w-[320px] shrink-0 mx-3 rounded-2xl border border-border bg-card p-6">
    <div className="flex items-center gap-3.5">
      <img src={t.img} alt={t.n} loading="lazy" className="w-11 h-11 rounded-full object-cover border border-border" />
      <div>
        <p className="text-[14px] font-semibold text-text-primary">{t.n}</p>
        <p className="text-[10.5px] tracking-[0.1em] uppercase text-text-muted">{t.r}</p>
      </div>
    </div>
    <div className="flex gap-0.5 text-primary mt-4">
      {Array.from({ length: 5 }).map((_, s) => <StarIcon key={s} size={13} />)}
    </div>
    <blockquote className="mt-3 text-[13.5px] text-text-secondary leading-relaxed">“{t.q}”</blockquote>
  </figure>
);

const Testimonials = () => {
  const row = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section id="testimonials" className="relative py-24 sm:py-28 scroll-mt-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center mb-14">
        <Reveal>
          <Eyebrow>Testimonials</Eyebrow>
          <h2 className="mt-5 text-3xl sm:text-5xl font-bold tracking-tight text-text-primary">Hear from our successful trainers.</h2>
        </Reveal>
      </div>
      <div className="relative group">
        <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
          {row.map((t, i) => <TCard key={i} t={t} />)}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-bg to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-bg to-transparent" />
      </div>
    </section>
  );
};

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
      <Hound />

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

      <FeatureShowcase />
      <Testimonials />
      <FinalCta />
    </main>
    <MarketingFooter />
  </div>
);

export default LandingPage;
