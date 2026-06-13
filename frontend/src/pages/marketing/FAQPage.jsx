import { useState } from "react";
import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import Reveal from "../../components/marketing/Reveal";

const FAQS = [
  { q: "Who is FITOS for?", a: "Fitness professionals — personal trainers, online coaches, gym owners, and coaching teams who manage clients and want one organized system." },
  { q: "Can I manage multiple clients at once?", a: "Yes. FITOS is built for scale: manage a handful of clients or hundreds across a team, each with their own profile, plans, and history." },
  { q: "Do clients get their own app?", a: "Yes. Clients get a polished mobile experience to view workouts, log meals, upload progress photos, submit check-ins, and message you." },
  { q: "Can I create reusable templates?", a: "Absolutely. Save any workout or nutrition plan as a template and assign it in a click, then personalize from there." },
  { q: "What is the Automated Hound?", a: "It's our follow-up engine. FITOS watches for missed check-ins, stalled progress, and expiring plans, then automatically reaches out to keep clients accountable and consistent." },
  { q: "Can clients upload progress and meal photos?", a: "Yes. Clients upload weekly progress photos and daily meal photos from their portal — you review and give feedback in context." },
  { q: "How do I get started?", a: "Sign in with Google, add your first client, send an invite, and you're coaching in minutes." },
];

const FAQPage = () => {
  const [open, setOpen] = useState(0);
  return (
    <div className="bg-bg text-text-primary min-h-screen overflow-x-hidden isolate">
      <MarketingNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 sm:pt-40 pb-28">
        <Reveal className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11.5px] font-semibold tracking-[0.12em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> FAQ
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight">Questions, answered.</h1>
          <p className="mt-4 text-text-secondary max-w-xl mx-auto leading-relaxed">
            Everything you need to know about coaching with FITOS.
          </p>
        </Reveal>

        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 45}>
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <button onClick={() => setOpen(isOpen ? -1 : i)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={isOpen}>
                    <span className="text-[15px] font-semibold text-text-primary">{f.q}</span>
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
      </main>
      <MarketingFooter />
    </div>
  );
};

export default FAQPage;
