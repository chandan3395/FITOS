import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Client Management", href: "/#client" },
      { label: "Workout Planning", href: "/#workout" },
      { label: "Nutrition", href: "/#nutrition" },
      { label: "Progress Tracking", href: "/#progress" },
      { label: "Mobile App", href: "/#features" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#about" },
      { label: "Testimonials", href: "/#testimonials" },
      { label: "FAQ", to: ROUTES.FAQ },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: ROUTES.PRIVACY },
      { label: "Terms & Conditions", to: ROUTES.TERMS },
      { label: "Cookie Policy", to: ROUTES.COOKIES },
    ],
  },
];

const Social = ({ label, d }) => (
  <a href="#" aria-label={label} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-primary hover:border-line-hover transition-colors">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">{d}</svg>
  </a>
);

const MarketingFooter = () => (
  <footer className="relative border-t border-border bg-surface/40">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
        {/* Brand */}
        <div className="col-span-2">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-black font-extrabold text-base leading-none">F</span>
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">FITOS</span>
          </div>
          <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
            The coaching CRM that runs your entire fitness business — clients, programming, accountability, and growth in one place.
          </p>
          <div className="flex items-center gap-2 mt-5">
            <Social label="X" d={<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />} />
            <Social label="Instagram" d={<path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.25.07 1.65.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38 3.7 3.7 0 0 1-1.38.9c-.42.16-1.06.36-2.23.41-1.25.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.4 2.2 8.8 2.2 12 2.2Zm0 4.86A4.94 4.94 0 1 0 16.94 12 4.94 4.94 0 0 0 12 7.06Zm0 8.14A3.2 3.2 0 1 1 15.2 12 3.2 3.2 0 0 1 12 15.2Zm5.14-8.34a1.15 1.15 0 1 0 1.15 1.15 1.15 1.15 0 0 0-1.15-1.15Z" />} />
            <Social label="LinkedIn" d={<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />} />
          </div>
        </div>

        {/* Link columns */}
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-[11px] font-semibold tracking-[0.1em] text-text-muted uppercase mb-4">{col.title}</p>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to} className="text-[13.5px] text-text-secondary hover:text-text-primary transition-colors">{l.label}</Link>
                  ) : (
                    <a href={l.href} className="text-[13.5px] text-text-secondary hover:text-text-primary transition-colors">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Contact strip */}
      <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-[13px] text-text-muted">
          Questions? <a href="mailto:support@fitos.com" className="text-primary hover:text-primary-hover">support@fitos.com</a>
        </p>
        <p className="text-[12.5px] text-text-muted">© 2026 FITOS. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default MarketingFooter;
