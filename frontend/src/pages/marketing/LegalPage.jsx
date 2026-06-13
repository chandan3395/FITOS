import { Link } from "react-router-dom";
import MarketingNav from "../../components/marketing/MarketingNav";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { ROUTES } from "../../constants/routes";

/* Lightweight, sensible SaaS legal content. Not legal advice — placeholder
 * copy a founder can hand to counsel before launch. Shared layout keeps the
 * three documents consistent and on-brand. */

const LAST_UPDATED = "June 1, 2026";

const LEGAL = {
  privacy: {
    title: "Privacy Policy",
    intro:
      "FITOS (\"we\", \"us\") provides a coaching CRM platform for fitness professionals. This policy explains what we collect, why, and the choices you have.",
    sections: [
      { h: "Information we collect", p: "Account details (name, email, role) for coaches and the client information coaches add to their workspace — profiles, goals, measurements, health history, plans, check-ins, and progress or meal photos." },
      { h: "How we use information", p: "To provide and operate the platform, authenticate users, deliver coaching features, send transactional notifications, and improve reliability and performance." },
      { h: "Data ownership", p: "Coaches own the client data in their workspace. Client relationships are keyed by internal IDs and isolated per coach; we do not sell personal data." },
      { h: "Sharing & processors", p: "We share data only with infrastructure and storage providers strictly necessary to run the service, under data-processing terms, and where required by law." },
      { h: "Security", p: "We use secure authentication, encrypted transport (HTTPS/TLS), role-based access control, and access-controlled cloud storage. No system is perfectly secure, but we work to protect your data." },
      { h: "Data retention", p: "We retain data while your account is active. Deletions are honored on request; soft-deleted records are removed on our standard cleanup schedule." },
      { h: "Your rights", p: "You may access, correct, export, or delete personal data. Contact us to exercise these rights." },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    intro:
      "These terms govern your use of FITOS. By creating an account or using the platform, you agree to them.",
    sections: [
      { h: "Your account", p: "You're responsible for your account, the accuracy of information you add, and obtaining consent from clients whose data you store in FITOS." },
      { h: "Acceptable use", p: "Don't misuse the platform, attempt to breach security, upload unlawful content, or use FITOS to harm others. Coaching content remains your responsibility." },
      { h: "Subscriptions & trials", p: "Paid plans and trials are billed as described at sign-up. You can cancel at any time; access continues through the paid period." },
      { h: "Service availability", p: "We strive for high uptime but provide the service \"as is\" without warranty of uninterrupted availability. Planned maintenance may occur." },
      { h: "Limitation of liability", p: "To the extent permitted by law, FITOS is not liable for indirect or consequential damages arising from use of the platform." },
      { h: "Changes", p: "We may update these terms; material changes will be communicated. Continued use constitutes acceptance." },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    intro:
      "This policy explains how FITOS uses cookies and similar technologies.",
    sections: [
      { h: "Essential cookies", p: "Required for authentication and core functionality — for example, keeping you signed in via secure session and refresh tokens. The platform cannot function without these." },
      { h: "Preference cookies", p: "Remember choices such as theme and interface settings to personalize your experience." },
      { h: "Analytics", p: "If enabled, privacy-respecting analytics help us understand aggregate usage and improve the product. These never identify individual clients." },
      { h: "Managing cookies", p: "You can control cookies through your browser settings. Disabling essential cookies may prevent you from signing in or using key features." },
    ],
  },
};

const TABS = [
  { key: "privacy", label: "Privacy Policy", to: ROUTES.PRIVACY },
  { key: "terms", label: "Terms & Conditions", to: ROUTES.TERMS },
  { key: "cookies", label: "Cookie Policy", to: ROUTES.COOKIES },
];

const LegalPage = ({ kind = "privacy" }) => {
  const doc = LEGAL[kind] || LEGAL.privacy;
  return (
    <div className="bg-bg text-text-primary min-h-screen overflow-x-hidden">
      <MarketingNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 sm:pt-40 pb-24">
        <p className="text-[12px] text-text-muted">
          <Link to={ROUTES.HOME} className="hover:text-text-primary">Home</Link> · Legal
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">{doc.title}</h1>
        <p className="mt-2 text-[13px] text-text-muted">Last updated {LAST_UPDATED}</p>

        {/* Doc switcher */}
        <div className="mt-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.key}
              to={t.to}
              className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium border transition-colors ${
                t.key === kind
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-text-secondary hover:text-text-primary hover:border-line-hover"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <p className="mt-8 text-[15px] text-text-secondary leading-relaxed">{doc.intro}</p>

        <div className="mt-8 space-y-8">
          {doc.sections.map((s) => (
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
};

export default LegalPage;
