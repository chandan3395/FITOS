import { Link } from "react-router-dom";
import MarketingNav from "../marketing/MarketingNav";
import MarketingFooter from "../marketing/MarketingFooter";
import Reveal from "../marketing/Reveal";
import Seo from "../Seo";
import { ROUTES } from "../../constants/routes";

/**
 * PublicPageLayout — shared shell for the public, no-auth-required content
 * pages (About, Contact, Terms, Privacy). Mirrors the marketing/legal pages
 * exactly: same nav, footer, dark brand surface, constrained reading width,
 * typography, and scroll-reveal transitions.
 *
 * Props:
 *   seoTitle / seoDescription   document <title> + meta description
 *   eyebrow                     small uppercase badge label above the heading
 *   title                       page <h1>
 *   subtitle                    optional lead paragraph under the heading
 *   meta                        optional muted line (e.g. "Last updated June 2026")
 *   breadcrumb                  label shown after "Home ·" (defaults to title)
 *   children                    page body
 */
const PublicPageLayout = ({
  seoTitle,
  seoDescription,
  eyebrow,
  title,
  subtitle,
  meta,
  breadcrumb,
  children,
}) => (
  <div className="bg-bg text-text-primary min-h-screen overflow-x-hidden isolate">
    <Seo title={seoTitle} description={seoDescription} />
    <MarketingNav />

    <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-32 sm:pt-40 pb-24">
      <Reveal>
        <p className="text-[12px] text-text-muted">
          <Link to={ROUTES.HOME} className="hover:text-text-primary transition-colors">Home</Link>
          {" · "}
          {breadcrumb || title}
        </p>

        {eyebrow && (
          <span className="mt-5 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11.5px] font-semibold tracking-[0.12em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {eyebrow}
          </span>
        )}

        <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">{title}</h1>

        {meta && <p className="mt-2 text-[13px] text-text-muted">{meta}</p>}

        {subtitle && (
          <p className="mt-3 text-[15px] text-text-secondary leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
      </Reveal>

      <div className="mt-10">{children}</div>
    </main>

    <MarketingFooter />
  </div>
);

// ── Reusable content primitives ─────────────────────────────────────────────
const linkCls = "text-primary hover:text-primary-hover transition-colors";

/** Intro / lead paragraph. */
export const Lead = ({ children }) => (
  <Reveal>
    <p className="text-[15px] sm:text-base text-text-secondary leading-relaxed">{children}</p>
  </Reveal>
);

/** Bulleted list with brand dots. */
export const Bullets = ({ items }) => (
  <ul className="mt-1 space-y-1.5">
    {items.map((it, i) => (
      <li key={i} className="flex gap-2.5">
        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0" />
        <span>{it}</span>
      </li>
    ))}
  </ul>
);

/**
 * One block inside a legal section. Driven by data so page content stays in
 * plain JS strings (easy to edit, and free of JSX unescaped-entity pitfalls).
 *   { type: "p",   text }
 *   { type: "ul",  items: [] }
 *   { type: "sub", text }                  small uppercase sub-heading
 *   { type: "contact", email, phone? }     contact lines with mailto/tel links
 */
const Block = ({ block }) => {
  switch (block.type) {
    case "ul":
      return <Bullets items={block.items} />;
    case "sub":
      return (
        <p className="mt-4 text-[12px] font-semibold tracking-[0.1em] text-text-primary uppercase">
          {block.text}
        </p>
      );
    case "contact":
      return (
        <div className="mt-1 space-y-1.5">
          <p>
            Email:{" "}
            <a href={`mailto:${block.email}`} className={linkCls}>{block.email}</a>
          </p>
          {block.phone && (
            <p>
              Phone:{" "}
              <a href={`tel:${block.phone.replace(/\s+/g, "")}`} className={linkCls}>{block.phone}</a>
            </p>
          )}
        </div>
      );
    case "p":
    default:
      return <p>{block.text}</p>;
  }
};

/**
 * Renders an array of legal sections — { index?, title, blocks: [] } — with a
 * staggered scroll reveal. Used by the Terms and Privacy pages.
 */
export const LegalSections = ({ sections }) => (
  <div className="space-y-8">
    {sections.map((s, i) => (
      <Reveal key={s.title} delay={Math.min(i, 6) * 30}>
        <section className="scroll-mt-28">
          <h2 className="text-lg sm:text-xl font-semibold text-text-primary flex items-baseline gap-2">
            {s.index != null && <span className="text-primary text-[15px] font-bold">{s.index}.</span>}
            <span>{s.title}</span>
          </h2>
          <div className="mt-2 space-y-3 text-[14px] text-text-secondary leading-relaxed">
            {s.blocks.map((b, j) => <Block key={j} block={b} />)}
          </div>
        </section>
      </Reveal>
    ))}
  </div>
);

export default PublicPageLayout;
