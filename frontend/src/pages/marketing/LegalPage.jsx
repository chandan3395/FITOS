import { Link } from "react-router-dom";
import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { ROUTES } from "../../constants/routes";

/* Cookie Policy page.
 *
 * Privacy Policy (/privacy) and Terms & Conditions (/terms) now have their own
 * dedicated pages (pages/public/PrivacyPage, TermsPage). LegalPage is mounted
 * ONLY at /cookies, so the former multi-document switch (the `kind` prop and
 * the privacy/terms document data) was unreachable and has been removed.
 * The tab links below remain — they are live cross-navigation to the three
 * legal pages, not dead branches. */

const LAST_UPDATED = "June 1, 2026";

const DOC = {
  title: "Cookie Policy",
  intro: "This policy explains how FITOS uses cookies and similar technologies.",
  sections: [
    { h: "Essential cookies", p: "Required for authentication and core functionality — for example, keeping you signed in via secure session and refresh tokens. The platform cannot function without these." },
    { h: "Preference cookies", p: "Remember choices such as theme and interface settings to personalize your experience." },
    { h: "Analytics", p: "If enabled, privacy-respecting analytics help us understand aggregate usage and improve the product. These never identify individual clients." },
    { h: "Managing cookies", p: "You can control cookies through your browser settings. Disabling essential cookies may prevent you from signing in or using key features." },
  ],
};

const TABS = [
  { key: "privacy", label: "Privacy Policy", to: ROUTES.PRIVACY },
  { key: "terms", label: "Terms & Conditions", to: ROUTES.TERMS },
  { key: "cookies", label: "Cookie Policy", to: ROUTES.COOKIES },
];

const ACTIVE_KEY = "cookies";

const LegalPage = () => (
  <div className="bg-bg text-text-primary min-h-screen overflow-x-hidden">
    <MarketingNav />
    <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 sm:pt-40 pb-24">
      <p className="text-[12px] text-text-muted">
        <Link to={ROUTES.HOME} className="hover:text-text-primary">Home</Link> · Legal
      </p>
      <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">{DOC.title}</h1>
      <p className="mt-2 text-[13px] text-text-muted">Last updated {LAST_UPDATED}</p>

      {/* Doc switcher — cross-links to the three legal pages. */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium border transition-colors ${
              t.key === ACTIVE_KEY
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-text-secondary hover:text-text-primary hover:border-line-hover"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <p className="mt-8 text-[15px] text-text-secondary leading-relaxed">{DOC.intro}</p>

      <div className="mt-8 space-y-8">
        {DOC.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold text-text-primary">{s.h}</h2>
            <p className="mt-2 text-[14px] text-text-secondary leading-relaxed">{s.p}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 card p-6">
        <p className="text-sm font-semibold text-text-primary">Questions about this policy?</p>
        <p className="text-[13.5px] text-text-secondary mt-1">
          Contact us at <a href="mailto:support@fitos.com" className="text-primary hover:text-primary-hover">support@fitos.com</a>.
        </p>
      </div>
    </main>
    <MarketingFooter />
  </div>
);

export default LegalPage;
