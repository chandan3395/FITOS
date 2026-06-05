import { useState } from "react";
import {
  PrimaryButton,
  SecondaryButton,
  MetricCard,
  AlertCard,
  ClientCard,
  UploadCard,
  ProgressCard,
  MobileBottomNavigation,
} from "../components/design-system";
import {
  BoltIcon,
  UsersIcon,
  TargetIcon,
  FlameIcon,
  ChartBarIcon,
} from "../components/design-system/Icons";

/* ── Section wrapper ─────────────────────────────────────── */
const Section = ({ id, eyebrow, title, description, children }) => (
  <section id={id} className="scroll-mt-20 pt-16 pb-20 border-t border-[#111]">
    <div className="mb-10">
      <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.15em]">
        {eyebrow}
      </span>
      <h2 className="text-[22px] font-bold text-white mt-2 leading-tight">{title}</h2>
      {description && (
        <p className="text-[14px] text-zinc-500 mt-1.5 max-w-lg leading-relaxed">
          {description}
        </p>
      )}
    </div>
    {children}
  </section>
);

/* ── Showcase tile ───────────────────────────────────────── */
const Tile = ({ label, children, dark = false, wide = false }) => (
  <div
    className={[
      "flex flex-col gap-3",
      wide ? "col-span-full sm:col-span-2" : "",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-[0.12em]">
      {label}
    </span>
    <div
      className={[
        "rounded-2xl border border-[#1a1a1a] flex items-center justify-center p-6",
        dark ? "bg-[#050505]" : "bg-[#0a0a0a]",
      ].join(" ")}
    >
      {children}
    </div>
  </div>
);

/* ── Nav pill ────────────────────────────────────────────── */
const NAV_SECTIONS = [
  { id: "buttons",    label: "Buttons"    },
  { id: "metrics",    label: "Metrics"    },
  { id: "alerts",     label: "Alerts"     },
  { id: "clients",    label: "Clients"    },
  { id: "progress",   label: "Progress"   },
  { id: "upload",     label: "Upload"     },
  { id: "navigation", label: "Navigation" },
];

/* ─────────────────────────────────────────────────────────── */
const DesignSystemPage = () => {
  const [activeNav,    setActiveNav]    = useState("home");
  const [loadingPri,   setLoadingPri]   = useState(false);
  const [loadingSec,   setLoadingSec]   = useState(false);

  const simulate = (setter) => {
    setter(true);
    setTimeout(() => setter(false), 1800);
  };

  return (
    <div className="min-h-screen bg-black">

      {/* ── Sticky header ─────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[#111] bg-black/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-bold text-white tracking-tight">FITOS</span>
              <span className="h-4 w-px bg-[#222]" />
              <span className="text-[13px] text-zinc-500">Design System</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#111] border border-[#222] text-zinc-500">
                v1.0
              </span>
            </div>

            {/* Section nav — desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_SECTIONS.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="text-[12px] font-medium text-zinc-500 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-4">
        <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.15em] mb-3">
          FITOS / Design System
        </p>
        <h1 className="text-[42px] font-black text-white leading-[1.1] tracking-tight max-w-xl">
          Component<br />Library
        </h1>
        <p className="text-[15px] text-zinc-500 mt-4 max-w-lg leading-relaxed">
          Production-ready UI components for the FITOS fitness coaching platform.
          Pure black, Apple-level spacing, zero gradients.
        </p>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6">

        {/* ════════════════════════════════════════════════ */}
        {/* 01 BUTTONS                                       */}
        {/* ════════════════════════════════════════════════ */}
        <Section
          id="buttons"
          eyebrow="01 — Actions"
          title="Buttons"
          description="Primary uses white fill for maximum contrast. Secondary stays transparent with a subtle border."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Primary — sizes */}
            <Tile label="Primary / Sizes">
              <div className="flex flex-col items-start gap-3 w-full">
                <PrimaryButton size="sm">Small action</PrimaryButton>
                <PrimaryButton size="md">Default action</PrimaryButton>
                <PrimaryButton size="lg">Large action</PrimaryButton>
              </div>
            </Tile>

            {/* Primary — states */}
            <Tile label="Primary / States">
              <div className="flex flex-col items-start gap-3 w-full">
                <PrimaryButton onClick={() => simulate(setLoadingPri)} loading={loadingPri}>
                  {loadingPri ? "Saving…" : "Click to load"}
                </PrimaryButton>
                <PrimaryButton disabled>Disabled</PrimaryButton>
                <PrimaryButton icon={<BoltIcon size={13} />}>With icon</PrimaryButton>
              </div>
            </Tile>

            {/* Primary — full width */}
            <Tile label="Primary / Full Width">
              <div className="flex flex-col gap-3 w-full">
                <PrimaryButton fullWidth>Save changes</PrimaryButton>
                <PrimaryButton fullWidth size="lg">
                  Start session
                </PrimaryButton>
              </div>
            </Tile>

            {/* Secondary — sizes */}
            <Tile label="Secondary / Sizes">
              <div className="flex flex-col items-start gap-3 w-full">
                <SecondaryButton size="sm">Small</SecondaryButton>
                <SecondaryButton size="md">Default</SecondaryButton>
                <SecondaryButton size="lg">Large</SecondaryButton>
              </div>
            </Tile>

            {/* Secondary — states */}
            <Tile label="Secondary / States">
              <div className="flex flex-col items-start gap-3 w-full">
                <SecondaryButton onClick={() => simulate(setLoadingSec)} loading={loadingSec}>
                  {loadingSec ? "Loading…" : "Click to load"}
                </SecondaryButton>
                <SecondaryButton disabled>Disabled</SecondaryButton>
                <SecondaryButton destructive>Delete account</SecondaryButton>
              </div>
            </Tile>

            {/* Button pair */}
            <Tile label="Action Pair">
              <div className="flex flex-col gap-3 w-full">
                <div className="flex gap-2">
                  <SecondaryButton fullWidth>Cancel</SecondaryButton>
                  <PrimaryButton fullWidth>Confirm</PrimaryButton>
                </div>
                <div className="flex gap-2">
                  <SecondaryButton fullWidth destructive>Remove</SecondaryButton>
                  <SecondaryButton fullWidth icon={<ChartBarIcon size={14} />}>
                    Export
                  </SecondaryButton>
                </div>
              </div>
            </Tile>

          </div>
        </Section>

        {/* ════════════════════════════════════════════════ */}
        {/* 02 METRIC CARDS                                  */}
        {/* ════════════════════════════════════════════════ */}
        <Section
          id="metrics"
          eyebrow="02 — KPIs"
          title="Metric Cards"
          description="Stat tiles for dashboards. Supports trend indicators and optional icons."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Clients"
              value="248"
              delta="+12.5%"
              trend="up"
              icon={<UsersIcon size={15} />}
            />
            <MetricCard
              label="Active Sessions"
              value="34"
              delta="+3"
              deltaLabel="today"
              trend="up"
              icon={<BoltIcon size={15} />}
            />
            <MetricCard
              label="Completion Rate"
              value="91%"
              delta="−2.1%"
              trend="down"
              icon={<TargetIcon size={15} />}
            />
            <MetricCard
              label="Monthly Revenue"
              value="$8,420"
              delta="+18.4%"
              trend="up"
              icon={<ChartBarIcon size={15} />}
            />
          </div>

          {/* No-delta variants */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <MetricCard label="Avg. Session Length" value="52 min" />
            <MetricCard label="Streak Record" value="47 days" icon={<FlameIcon size={15} />} />
            <MetricCard label="New Clients" value="12" delta="this week" trend="neutral" />
          </div>
        </Section>

        {/* ════════════════════════════════════════════════ */}
        {/* 03 ALERT CARDS                                   */}
        {/* ════════════════════════════════════════════════ */}
        <Section
          id="alerts"
          eyebrow="03 — Feedback"
          title="Alert Cards"
          description="Inline status messages. Four semantic variants with optional dismiss and CTA."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="flex flex-col gap-3">
              <AlertCard
                variant="info"
                title="Sync in progress"
                message="Fetching latest workout data from wearable. This may take a moment."
              />
              <AlertCard
                variant="success"
                title="Session completed"
                message="Sarah Johnson completed her upper-body strength session — 52 min."
                dismissible
              />
              <AlertCard
                variant="warning"
                title="Payment due soon"
                message="3 client subscriptions expire within the next 7 days."
                action={{ label: "Review now", onClick: () => {} }}
              />
              <AlertCard
                variant="error"
                title="Upload failed"
                message="progress-photo-july.jpg exceeds the 10 MB limit."
                dismissible
              />
            </div>

            {/* Right column — title-only / minimal */}
            <div className="flex flex-col gap-3">
              <AlertCard variant="info"    message="Your account is in read-only mode." />
              <AlertCard variant="success" message="All changes saved successfully." dismissible />
              <AlertCard variant="warning" message="Weak network — data may be delayed." />
              <AlertCard
                variant="error"
                title="Subscription inactive"
                message="Renew your plan to unlock trainer features."
                action={{ label: "Upgrade plan", onClick: () => {} }}
                dismissible
              />
            </div>
          </div>
        </Section>

        {/* ════════════════════════════════════════════════ */}
        {/* 04 CLIENT CARDS                                  */}
        {/* ════════════════════════════════════════════════ */}
        <Section
          id="clients"
          eyebrow="04 — Roster"
          title="Client Cards"
          description="Profile tiles with status, session metadata and trainer attribution."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ClientCard
              name="Sarah Johnson"
              goal="Weight Loss"
              status="active"
              trainer="Coach Mike"
              lastSession="2 hours ago"
              nextSession="Tomorrow 9 AM"
              sessions={42}
              onClick={() => {}}
            />
            <ClientCard
              name="Marcus Williams"
              goal="Muscle Gain"
              status="active"
              trainer="Coach Lisa"
              lastSession="Yesterday"
              nextSession="Friday 7 AM"
              sessions={87}
              onClick={() => {}}
            />
            <ClientCard
              name="Priya Kapoor"
              goal="Endurance"
              status="paused"
              trainer="Coach Mike"
              lastSession="3 weeks ago"
              sessions={19}
              onClick={() => {}}
            />
            <ClientCard
              name="James Chen"
              goal="Rehabilitation"
              status="active"
              trainer="Coach Amy"
              lastSession="This morning"
              nextSession="Thursday 11 AM"
              sessions={31}
            />
            <ClientCard
              name="Olivia Torres"
              goal="General Fitness"
              status="inactive"
              lastSession="2 months ago"
              sessions={6}
            />
            <ClientCard
              name="Daniel Park"
              goal="Athletic Performance"
              status="active"
              trainer="Coach Mike"
              lastSession="Yesterday"
              nextSession="Today 5 PM"
              sessions={112}
              onClick={() => {}}
            />
          </div>
        </Section>

        {/* ════════════════════════════════════════════════ */}
        {/* 05 PROGRESS CARDS                                */}
        {/* ════════════════════════════════════════════════ */}
        <Section
          id="progress"
          eyebrow="05 — Goals"
          title="Progress Cards"
          description="Visual goal-tracking tiles with a progress bar and optional streak indicator."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProgressCard
              label="Weight Goal"
              current={68}
              target={80}
              unit="kg"
              description="Target reached by Sep 30"
              colorScheme="default"
              streak={14}
            />
            <ProgressCard
              label="Body Fat"
              current={18}
              target={12}
              unit="%"
              description="Reduction programme"
              colorScheme="success"
            />
            <ProgressCard
              label="Monthly Sessions"
              current={11}
              target={20}
              description="On track for August"
              colorScheme="warning"
              streak={5}
              icon={<BoltIcon size={15} />}
            />
            <ProgressCard
              label="Calorie Burn"
              current={9200}
              target={15000}
              unit=" kcal"
              description="This week"
              colorScheme="danger"
            />
          </div>

          {/* Completed example */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <ProgressCard
              label="Workout Streak"
              current={30}
              target={30}
              unit=" days"
              description="Goal achieved!"
              colorScheme="success"
              streak={30}
              icon={<FlameIcon size={15} />}
            />
            <ProgressCard
              label="Strength Score"
              current={74}
              target={100}
              description="Performance index"
              colorScheme="default"
              icon={<TargetIcon size={15} />}
            />
          </div>
        </Section>

        {/* ════════════════════════════════════════════════ */}
        {/* 06 UPLOAD CARD                                   */}
        {/* ════════════════════════════════════════════════ */}
        <Section
          id="upload"
          eyebrow="06 — Media"
          title="Upload Card"
          description="Drag-and-drop zone with staged file list. Fully interactive — try dropping a file."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div>
              <p className="text-[12px] text-zinc-600 mb-3">Progress photos</p>
              <UploadCard
                label="Upload Progress Photos"
                hint="JPG, PNG or HEIC — max 10 MB each"
                accept="image/*"
                multiple
              />
            </div>
            <div>
              <p className="text-[12px] text-zinc-600 mb-3">Single document</p>
              <UploadCard
                label="Attach Medical Clearance"
                hint="PDF only — max 5 MB"
                accept="application/pdf"
                multiple={false}
              />
            </div>
          </div>

          {/* Disabled state */}
          <div className="mt-8 max-w-sm">
            <p className="text-[12px] text-zinc-600 mb-3">Disabled state</p>
            <UploadCard
              label="Upload unavailable"
              hint="Subscription required to upload files"
              disabled
            />
          </div>
        </Section>

        {/* ════════════════════════════════════════════════ */}
        {/* 07 MOBILE NAVIGATION                             */}
        {/* ════════════════════════════════════════════════ */}
        <Section
          id="navigation"
          eyebrow="07 — Mobile"
          title="Bottom Navigation"
          description="Fixed bottom tab bar for mobile viewports. Tap to switch active state."
        >
          {/* Phone-shaped preview */}
          <div className="flex items-start gap-8 flex-wrap">
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-[0.12em]">
                390 × 84 px frame
              </span>
              <div
                className="border border-[#2a2a2a] rounded-[28px] overflow-hidden"
                style={{ width: 390 }}
              >
                {/* Phone screen stub */}
                <div className="bg-[#0a0a0a] h-24 flex items-center justify-center">
                  <span className="text-[12px] text-zinc-700">App content area</span>
                </div>
                {/* Nav bar */}
                <MobileBottomNavigation
                  activeTab={activeNav}
                  onTabChange={setActiveNav}
                />
              </div>
              <p className="text-[12px] text-zinc-600">
                Active tab: <span className="text-zinc-400">{activeNav}</span>
              </p>
            </div>

            {/* States reference */}
            <div className="flex flex-col gap-4 pt-8">
              <p className="text-[12px] text-zinc-600 uppercase tracking-widest text-[11px]">
                Tab states
              </p>
              {["home", "workouts", "progress", "clients", "profile"].map((tab) => (
                <div key={tab} className="flex items-center gap-3">
                  <div
                    className="rounded-xl border overflow-hidden"
                    style={{ width: 240 }}
                  >
                    <div className={tab === activeNav ? "bg-[#0a0a0a]" : "bg-[#060606]"}>
                      <MobileBottomNavigation
                        activeTab={tab}
                        onTabChange={() => {}}
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-600">{tab}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-[#111] mt-8">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[12px] text-zinc-700">
            FITOS Design System · Phase 1 · {new Date().getFullYear()}
          </p>
          <p className="text-[12px] text-zinc-700">
            8 components · Pure black · Mobile-first
          </p>
        </div>
      </footer>

    </div>
  );
};

export default DesignSystemPage;
