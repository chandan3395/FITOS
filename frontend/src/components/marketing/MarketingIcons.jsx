/* Premium 24px line icons for the marketing site. Consistent stroke weight,
 * rounded joins — crisp on the dark theme. */

const base = (size) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

/* ── Benefits ── */
export const LayersIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
    <path d="M3 17l9 5 9-5" opacity=".5" />
  </svg>
);
export const BellIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" />
    <path d="M10 20a2 2 0 004 0" />
  </svg>
);
export const ChatIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <path d="M4 5h16v11H8l-4 4V5z" />
    <path d="M8 9.5h8M8 12.5h5" opacity=".7" />
  </svg>
);
export const GridIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" opacity=".6" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" opacity=".6" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </svg>
);
export const GaugeIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <path d="M4 18a8 8 0 1116 0" />
    <path d="M12 14l4-3" />
    <circle cx="12" cy="18" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);
export const HeartPulseIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <path d="M12 20s-7-4.5-9.3-9C1 7.5 3 4.5 6 4.5c2 0 3.2 1.2 4 2.4.8-1.2 2-2.4 4-2.4 3 0 5 3 3.3 6.5-.7 1.4-2 2.9-3.6 4.3" />
    <path d="M3 12h3l1.5-2.5L10 14l2-4 1.5 2H21" />
  </svg>
);

/* ── Features ── */
export const IdCardIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="8.5" cy="11" r="2" />
    <path d="M5.5 16c.5-1.6 1.6-2.4 3-2.4s2.5.8 3 2.4" />
    <path d="M14.5 10h4M14.5 13h3" opacity=".7" />
  </svg>
);
export const MealIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <path d="M5 3v6M5 9a2 2 0 002-2V3M5 9v12M9 3v6a2 2 0 01-2 2" />
    <path d="M16 3c-1.5 1-2.5 3-2.5 6 0 2 1 3 2.5 3v9" />
  </svg>
);
export const DumbbellIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <path d="M3 9v6M6 7v10M18 7v10M21 9v6" />
    <path d="M6 12h12" />
  </svg>
);
export const VideoCheckIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="M16 10l5-3v10l-5-3" />
    <path d="M7 12l2 2 3-3.5" />
  </svg>
);
export const ClipboardCheckIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4h6v3H9z" />
    <path d="M8.5 13l2.2 2.2L15.5 11" />
  </svg>
);
export const WalletIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <path d="M3 7a2 2 0 012-2h12a2 2 0 012 2" />
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M16 12.5h2.5" />
  </svg>
);
export const TrendingIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <path d="M3 17l5-5 3 3 6-7" />
    <path d="M14 8h3v3" />
    <path d="M3 21h18" opacity=".5" />
  </svg>
);

/* ── Misc ── */
export const ArrowRightIcon = ({ size = 18, className = "" }) => (
  <svg {...base(size)} className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const RadarIcon = ({ size = 24, className = "" }) => (
  <svg {...base(size)} className={className}>
    <path d="M12 12L19 5" />
    <path d="M12 3a9 9 0 109 9" />
    <path d="M12 7a5 5 0 105 5" opacity=".6" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);
export const StarIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.9-5.3-2.8-5.3 2.8 1-5.9L1.5 7.7l5.9-.9L10 1.5z" />
  </svg>
);
