import PublicPageLayout, { Lead, LegalSections } from "../../components/layouts/PublicPageLayout";

const SECTIONS = [
  {
    index: 1,
    title: "Information We Collect",
    blocks: [
      { type: "sub", text: "Account Information" },
      { type: "p", text: "When you create or access an account, we may collect:" },
      { type: "ul", items: [
        "Full name",
        "Email address",
        "Phone number",
        "Profile information",
        "Account role (Admin, Trainer, Client)",
      ] },
      { type: "sub", text: "Coaching Information" },
      { type: "p", text: "Depending on how the platform is used, we may collect:" },
      { type: "ul", items: [
        "Fitness goals",
        "Workout plans",
        "Nutrition plans",
        "Progress measurements",
        "Check-in responses",
        "Progress photos",
        "Meal photos",
        "Notes and coaching records",
      ] },
      { type: "sub", text: "Technical Information" },
      { type: "p", text: "We may automatically collect:" },
      { type: "ul", items: [
        "Device information",
        "Browser information",
        "IP address",
        "Login timestamps",
        "Usage activity",
        "Error logs",
      ] },
    ],
  },
  {
    index: 2,
    title: "How We Use Information",
    blocks: [
      { type: "p", text: "We use collected information to:" },
      { type: "ul", items: [
        "Provide platform functionality",
        "Manage user accounts",
        "Connect trainers and clients",
        "Deliver workout and nutrition plans",
        "Store progress tracking information",
        "Send reminders and notifications",
        "Improve platform performance",
        "Provide customer support",
        "Ensure platform security",
      ] },
    ],
  },
  {
    index: 3,
    title: "Progress Photos and Meal Photos",
    blocks: [
      { type: "p", text: "FITOS may store progress photos, meal photos, and related media uploaded by users." },
      { type: "p", text: "These files are used solely for coaching, progress tracking, and platform functionality." },
      { type: "p", text: "Users retain ownership of their uploaded content." },
    ],
  },
  {
    index: 4,
    title: "Data Sharing",
    blocks: [
      { type: "p", text: "FITOS does not sell user data." },
      { type: "p", text: "Information may only be shared:" },
      { type: "ul", items: [
        "Between linked trainers and clients",
        "With trusted service providers required for platform operation",
        "When legally required by law or government authorities",
        "To protect the security and integrity of the platform",
      ] },
    ],
  },
  {
    index: 5,
    title: "Data Storage",
    blocks: [
      { type: "p", text: "User information may be stored using secure cloud infrastructure and third-party storage providers." },
      { type: "p", text: "Reasonable security measures are implemented to protect stored data from unauthorized access, disclosure, alteration, or destruction." },
    ],
  },
  {
    index: 6,
    title: "Account Security",
    blocks: [
      { type: "p", text: "Users are responsible for:" },
      { type: "ul", items: [
        "Maintaining account confidentiality",
        "Protecting login credentials",
        "Reporting unauthorized access immediately",
      ] },
      { type: "p", text: "FITOS cannot guarantee complete protection against all security threats but follows industry-standard security practices." },
    ],
  },
  {
    index: 7,
    title: "Cookies and Analytics",
    blocks: [
      { type: "p", text: "FITOS may use cookies and similar technologies to:" },
      { type: "ul", items: [
        "Maintain user sessions",
        "Improve user experience",
        "Analyze platform usage",
        "Monitor performance",
      ] },
      { type: "p", text: "Users may disable cookies through browser settings, although some platform features may not function properly." },
    ],
  },
  {
    index: 8,
    title: "Third-Party Services",
    blocks: [
      { type: "p", text: "FITOS may integrate with third-party providers including:" },
      { type: "ul", items: [
        "Google Authentication",
        "Cloud storage providers",
        "Email delivery services",
        "Analytics services",
      ] },
      { type: "p", text: "These services operate under their own privacy policies." },
    ],
  },
  {
    index: 9,
    title: "User Rights",
    blocks: [
      { type: "p", text: "Users may request to:" },
      { type: "ul", items: [
        "Access their personal data",
        "Correct inaccurate information",
        "Delete account information (subject to legal and operational requirements)",
        "Request information regarding stored data",
      ] },
      { type: "p", text: "Requests may be submitted through the contact information provided below." },
    ],
  },
  {
    index: 10,
    title: "Children's Privacy",
    blocks: [
      { type: "p", text: "FITOS is not intended for children under the age of 13." },
      { type: "p", text: "We do not knowingly collect personal information from children under 13 years of age." },
    ],
  },
  {
    index: 11,
    title: "Policy Updates",
    blocks: [
      { type: "p", text: "This Privacy Policy may be updated periodically to reflect changes in platform functionality, legal requirements, or operational practices." },
      { type: "p", text: "Continued use of FITOS after updates constitutes acceptance of the revised policy." },
    ],
  },
  {
    index: 12,
    title: "Contact Information",
    blocks: [
      { type: "p", text: "For questions regarding this Privacy Policy or data handling practices, please contact:" },
      { type: "contact", email: "fitos.admin@gmail.com", phone: "+91 9591276584" },
    ],
  },
  {
    index: 13,
    title: "Fitness Disclaimer",
    blocks: [
      { type: "p", text: "FITOS is a software platform designed to assist fitness professionals and clients." },
      { type: "p", text: "FITOS does not provide medical advice, diagnosis, treatment, or healthcare services." },
      { type: "p", text: "Users should consult qualified healthcare professionals before beginning any fitness, nutrition, or wellness program." },
      { type: "p", text: "Use of information provided through the platform is at the user's own risk." },
    ],
  },
];

const PrivacyPage = () => (
  <PublicPageLayout
    seoTitle="Privacy Policy"
    seoDescription="Read the FITOS Privacy Policy explaining how we collect, use, store, and protect your information."
    eyebrow="Legal"
    title="Privacy Policy"
    meta="Last updated June 2026"
    subtitle="How FITOS collects, uses, stores, and protects your information."
    breadcrumb="Privacy"
  >
    <div className="space-y-8">
      <Lead>
        At FITOS, we value your privacy and are committed to protecting your personal information. This
        Privacy Policy explains how we collect, use, store, and safeguard information when you use the
        FITOS platform.
      </Lead>
      <Lead>
        By accessing or using FITOS, you agree to the practices described in this Privacy Policy.
      </Lead>
      <LegalSections sections={SECTIONS} />
    </div>
  </PublicPageLayout>
);

export default PrivacyPage;
