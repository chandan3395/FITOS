import PublicPageLayout, { Lead } from "../../components/layouts/PublicPageLayout";
import Reveal from "../../components/marketing/Reveal";

const linkCls = "text-primary hover:text-primary-hover transition-colors break-words";

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M6.5 3h3l1.5 5-2 1.5a12 12 0 005 5l1.5-2 5 1.5v3a2 2 0 01-2 2A16 16 0 014.5 5a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const LifebuoyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" />
    <path d="M5 5l4 4M19 5l-4 4M5 19l4-4M19 19l-4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const Card = ({ icon, title, children }) => (
  <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </span>
      <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
    </div>
    <div className="mt-3 text-[14px] text-text-secondary leading-relaxed space-y-1">{children}</div>
  </div>
);

const ContactPage = () => (
  <PublicPageLayout
    seoTitle="Contact FITOS"
    seoDescription="Get in touch with FITOS for support, feedback, partnership opportunities, or technical assistance."
    eyebrow="Contact"
    title="Contact FITOS"
    subtitle="Questions, feedback, partnerships, or support — we'd love to hear from you."
    breadcrumb="Contact"
  >
    <div className="space-y-8">
      <Lead>
        Whether you have questions, feedback, partnership opportunities, or require technical support,
        please reach out using the information below.
      </Lead>

      <Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card icon={<MailIcon />} title="General Support">
            <p>
              <a href="mailto:fitos.admin@gmail.com" className={linkCls}>fitos.admin@gmail.com</a>
            </p>
          </Card>

          <Card icon={<PhoneIcon />} title="Phone">
            <p>
              <a href="tel:+919591276584" className={linkCls}>+91 9591276584</a>
            </p>
          </Card>

          <Card icon={<ClockIcon />} title="Business Hours">
            <p>Monday – Saturday</p>
            <p>9:00 AM – 7:00 PM IST</p>
          </Card>

          <Card icon={<LifebuoyIcon />} title="Technical Support">
            <p>For technical issues, account-related concerns, or platform assistance:</p>
            <p>
              <a href="mailto:fitos.admin@gmail.com" className={linkCls}>fitos.admin@gmail.com</a>
            </p>
          </Card>
        </div>
      </Reveal>

      <Reveal>
        <div className="space-y-2 text-[14px] text-text-secondary leading-relaxed">
          <p>We aim to respond to all inquiries as quickly as possible.</p>
          <p className="font-semibold text-text-primary">Thank you for choosing FITOS.</p>
        </div>
      </Reveal>
    </div>
  </PublicPageLayout>
);

export default ContactPage;
