import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useAuthContext } from "../../contexts/AuthContext";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Why FITOS", href: "#why" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
];

export const TRIAL_HREF = ROUTES.LOGIN;
export const DEMO_HREF = "mailto:support@fitos.com?subject=FITOS%20Demo%20Request";

const Wordmark = () => (
  <Link to={ROUTES.HOME} className="flex items-center gap-2.5 shrink-0" aria-label="FITOS home">
    <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-glow-sm">
      <span className="text-black font-extrabold text-base leading-none">F</span>
    </span>
    <span className="text-lg font-extrabold tracking-tight text-white">FITOS</span>
  </Link>
);

const MarketingNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, user } = useAuthContext();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Trigger the slide-down on first paint.
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const dashHref =
    user?.role === "ADMIN" ? ROUTES.ADMIN_DASHBOARD :
    user?.role === "TRAINER" ? ROUTES.TRAINER_DASHBOARD :
    user?.role === "CLIENT" ? ROUTES.CLIENT_DASHBOARD : ROUTES.LOGIN;

  return (
    <header
      className="fixed top-0 inset-x-0 z-50"
      style={{ transform: mounted ? "translateY(0)" : "translateY(-100%)", transition: "transform .6s cubic-bezier(.22,1,.36,1)" }}
    >
      <div className={`transition-all duration-300 ${scrolled ? "glass border-b border-border/80" : "bg-transparent"}`}>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Wordmark />

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="px-3.5 py-2 text-[13.5px] font-medium text-text-secondary hover:text-text-primary transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-2">
            {isAuthenticated ? (
              <Link to={dashHref} className="h-10 px-5 inline-flex items-center rounded-xl bg-primary hover:bg-primary-hover text-black text-[13.5px] font-semibold shadow-glow-sm transition-colors">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link to={ROUTES.LOGIN} className="h-10 px-4 inline-flex items-center rounded-xl text-[13.5px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors">
                  Sign in
                </Link>
                <Link to={TRIAL_HREF} className="h-10 px-5 inline-flex items-center rounded-xl bg-primary hover:bg-primary-hover text-black text-[13.5px] font-semibold shadow-glow-sm hover:shadow-glow hover:-translate-y-px transition-all">
                  Start free trial
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden w-10 h-10 -mr-2 flex items-center justify-center text-text-primary"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              {open
                ? <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                : <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
            </svg>
          </button>
        </nav>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="lg:hidden glass border-b border-border animate-fade-in">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated">
                {l.label}
              </a>
            ))}
            <div className="pt-3 grid grid-cols-2 gap-2">
              <Link to={ROUTES.LOGIN} onClick={() => setOpen(false)} className="h-10 inline-flex items-center justify-center rounded-xl border border-border text-sm font-medium text-text-primary">
                Sign in
              </Link>
              <Link to={TRIAL_HREF} onClick={() => setOpen(false)} className="h-10 inline-flex items-center justify-center rounded-xl bg-primary text-black text-sm font-semibold">
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default MarketingNav;
