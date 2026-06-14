import PublicPageLayout, { Lead, LegalSections } from "../../components/layouts/PublicPageLayout";

const SECTIONS = [
  {
    index: 1,
    title: "Acceptance of Terms",
    blocks: [
      { type: "p", text: "By using FITOS, you acknowledge that you have read, understood, and agree to these Terms." },
    ],
  },
  {
    index: 2,
    title: "Platform Purpose",
    blocks: [
      { type: "p", text: "FITOS provides software tools that assist fitness professionals in managing coaching services, client relationships, workout plans, nutrition plans, communication, and progress tracking." },
      { type: "p", text: "FITOS does not provide medical advice, diagnosis, treatment, or healthcare services." },
    ],
  },
  {
    index: 3,
    title: "User Responsibilities",
    blocks: [
      { type: "p", text: "Users agree to:" },
      { type: "ul", items: [
        "Provide accurate information",
        "Maintain account security",
        "Use the platform lawfully",
        "Respect the privacy of other users",
      ] },
      { type: "p", text: "Users are responsible for all activity performed through their accounts." },
    ],
  },
  {
    index: 4,
    title: "Client Data",
    blocks: [
      { type: "p", text: "Coaches are responsible for ensuring they have appropriate consent to collect, store, and manage client information through FITOS." },
    ],
  },
  {
    index: 5,
    title: "Prohibited Activities",
    blocks: [
      { type: "p", text: "Users may not:" },
      { type: "ul", items: [
        "Attempt unauthorized access to the platform",
        "Distribute malware or harmful code",
        "Abuse platform resources",
        "Violate applicable laws",
        "Interfere with other users",
      ] },
    ],
  },
  {
    index: 6,
    title: "Intellectual Property",
    blocks: [
      { type: "p", text: "All platform content, branding, software, designs, and related materials remain the property of FITOS unless otherwise stated." },
    ],
  },
  {
    index: 7,
    title: "Service Availability",
    blocks: [
      { type: "p", text: "We strive to maintain reliable service but do not guarantee uninterrupted availability." },
      { type: "p", text: "Maintenance, upgrades, or unforeseen issues may occasionally impact service availability." },
    ],
  },
  {
    index: 8,
    title: "Limitation of Liability",
    blocks: [
      { type: "p", text: "FITOS shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of the platform." },
    ],
  },
  {
    index: 9,
    title: "Modifications",
    blocks: [
      { type: "p", text: "FITOS reserves the right to modify these Terms at any time. Continued use of the platform constitutes acceptance of updated Terms." },
    ],
  },
  {
    index: 10,
    title: "Contact",
    blocks: [
      { type: "p", text: "Questions regarding these Terms may be directed to:" },
      { type: "contact", email: "fitos.admin@gmail.com" },
    ],
  },
];

const TermsPage = () => (
  <PublicPageLayout
    seoTitle="Terms & Conditions"
    seoDescription="Read the FITOS Terms & Conditions governing the use of the platform."
    eyebrow="Legal"
    title="Terms & Conditions"
    meta="Last updated June 2026"
    subtitle="The terms that govern your use of the FITOS platform."
    breadcrumb="Terms"
  >
    <div className="space-y-8">
      <Lead>
        By accessing or using FITOS, you agree to comply with and be bound by these Terms and Conditions.
      </Lead>
      <LegalSections sections={SECTIONS} />
    </div>
  </PublicPageLayout>
);

export default TermsPage;
