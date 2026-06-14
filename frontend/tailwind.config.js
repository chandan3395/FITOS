/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── FITOS brand surfaces (from the marketing palette) ──
        black:   "#000000",
        bg:      "#0A0A0A",   // DARK BLACK — app background
        surface: {
          DEFAULT: "#151515", // SURFACE — sidebar / topbar / sunken panels
          1:       "#151515",
          2:       "#1C1C1C", // CARD
          3:       "#1C1C1C",
          4:       "#232323",
        },
        card:    "#1C1C1C",   // CARD — primary content surface
        // ── Borders ─────────────────────────────
        line: {
          DEFAULT: "#2A2A2A", // BORDER
          hover:   "#383838",
          focus:   "#454545",
        },
        // ── Legacy aliases (kept so existing classes resolve) ──
        "surface-elevated": "#232323",
        border:             "#2A2A2A",
        // ── Accent — FITOS lime green ───────────
        primary: {
          DEFAULT: "#A6CE39", // PRIMARY GREEN
          hover:   "#B7DC4E",
          muted:   "rgba(166,206,57,0.12)",
        },
        // ── Text ────────────────────────────────
        "text-primary":   "#FFFFFF", // WHITE
        "text-secondary": "#B0B0B0", // SECONDARY TEXT
        "text-muted":     "#6E6E6E",
        // ── Semantic ────────────────────────────
        success: "#A6CE39",
        warning: "#f59e0b",
        danger:  "#ef4444",
        info:    "#3b82f6",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },

      fontSize: {
        "2xs": ["11px", { lineHeight: "16px", letterSpacing: "0.04em" }],
      },

      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },

      borderRadius: {
        "4xl": "2rem",
      },

      boxShadow: {
        "card-sm": "0 1px 2px rgba(0,0,0,0.6)",
        card:      "0 2px 10px rgba(0,0,0,0.45)",
        "card-lg": "0 16px 48px rgba(0,0,0,0.55)",
        // Green-tinted premium glow for primary actions, modals, focus.
        "glow-sm": "0 0 0 1px rgba(166,206,57,0.12), 0 4px 16px rgba(166,206,57,0.14)",
        glow:      "0 0 0 1px rgba(166,206,57,0.18), 0 10px 34px rgba(166,206,57,0.22)",
      },

      animation: {
        "fade-in":    "fade-in 0.25s ease forwards",
        "slide-up":   "slide-up 0.3s ease forwards",
        "spin-slow":  "spin-slow 1.4s linear infinite",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
        "toast-in":   "toast-in 0.28s cubic-bezier(0.21,1.02,0.73,1) forwards",
        "toast-out":  "toast-out 0.32s cubic-bezier(0.55,0,0.55,0.2) forwards",
        // ── Marketing site ──
        "float":      "float 7s ease-in-out infinite",
        "float-slow": "float 11s ease-in-out infinite",
        "marquee":    "marquee 44s linear infinite",
        "glow-pulse": "glow-pulse 7s ease-in-out infinite",
        "draw-line":  "draw-line 1.2s ease forwards",
        "screen-in":  "screen-in 0.5s cubic-bezier(.22,1,.36,1) both",
        "progress-grow": "progress-grow linear forwards",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateX(24px) translateY(4px)" },
          to:   { opacity: "1", transform: "translateX(0) translateY(0)" },
        },
        "toast-out": {
          from: { opacity: "1", transform: "translateX(0)" },
          to:   { opacity: "0", transform: "translateX(24px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.35" },
        },
        // ── Marketing site ──
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":       { transform: "translateY(-12px)" },
        },
        "marquee": {
          from: { transform: "translateX(0)" },
          to:   { transform: "translateX(-50%)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%":       { opacity: "0.8", transform: "scale(1.06)" },
        },
        "draw-line": {
          from: { "stroke-dashoffset": "1" },
          to:   { "stroke-dashoffset": "0" },
        },
        "screen-in": {
          from: { opacity: "0", transform: "translateY(12px) scale(0.985)" },
          to:   { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "progress-grow": {
          from: { width: "0%" },
          to:   { width: "100%" },
        },
      },
    },
  },
  plugins: [],
};
