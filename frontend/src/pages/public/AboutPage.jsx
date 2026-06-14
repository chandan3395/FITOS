import PublicPageLayout, { Lead } from "../../components/layouts/PublicPageLayout";
import Reveal from "../../components/marketing/Reveal";

const CAPABILITIES = [
  "Manage client profiles",
  "Create workout plans",
  "Build nutrition plans",
  "Track progress photos",
  "Collect check-ins",
  "Monitor adherence",
  "Communicate with clients",
  "Automate reminders and follow-ups",
];

const AboutPage = () => (
  <PublicPageLayout
    seoTitle="About FITOS"
    seoDescription="Learn about FITOS — the all-in-one coaching platform helping fitness professionals manage clients, track progress, improve accountability, and grow their business."
    eyebrow="About"
    title="About FITOS"
    subtitle="The all-in-one platform built to help fitness professionals coach better."
    breadcrumb="About"
  >
    <div className="space-y-8">
      <Lead>
        FITOS is an all-in-one coaching platform built to help fitness professionals manage clients,
        track progress, improve accountability, and grow their coaching businesses.
      </Lead>

      {/* Mission highlight */}
      <Reveal>
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.05] p-6 sm:p-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
            Our mission is simple
          </p>
          <p className="mt-3 text-xl sm:text-2xl font-extrabold tracking-tight text-text-primary">
            Make coaching more personal, more organized, and more effective.
          </p>
        </div>
      </Reveal>

      <Reveal>
        <div className="space-y-3 text-[14px] text-text-secondary leading-relaxed">
          <p>
            Fitness coaching today is often spread across multiple tools — WhatsApp chats, spreadsheets,
            PDFs, payment trackers, progress photos, and separate nutrition plans. This fragmentation
            creates unnecessary administrative work and makes it harder for coaches to focus on what
            matters most: helping clients achieve results.
          </p>
          <p>FITOS brings everything together into a single platform.</p>
        </div>
      </Reveal>

      {/* Capabilities */}
      <Reveal>
        <section>
          <h2 className="text-lg sm:text-xl font-semibold text-text-primary">With FITOS, coaches can:</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CAPABILITIES.map((c) => (
              <div key={c} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <span className="w-5 h-5 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8.5l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-[14px] text-text-primary">{c}</span>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <div className="space-y-3 text-[14px] text-text-secondary leading-relaxed">
          <p>
            Our Alert Mechanism and client follow-up systems are designed to improve accountability and
            help clients stay consistent throughout their fitness journey.
          </p>
          <p>
            Whether you are an independent coach or managing a growing coaching business, FITOS provides
            the tools needed to streamline operations while delivering a better client experience.
          </p>
          <p>
            We are continuously improving the platform based on real-world coaching workflows and
            feedback from fitness professionals.
          </p>
        </div>
      </Reveal>

      {/* Closing statement */}
      <Reveal>
        <p className="text-base sm:text-lg font-semibold text-text-primary leading-snug">
          FITOS exists to help coaches spend less time managing systems and more time changing lives.
        </p>
      </Reveal>
    </div>
  </PublicPageLayout>
);

export default AboutPage;
