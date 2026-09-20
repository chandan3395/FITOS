/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-page) / <alpha-value>)",
        surface: { DEFAULT: "rgb(var(--color-surface) / <alpha-value>)", 1: "rgb(var(--color-surface) / <alpha-value>)", 2: "rgb(var(--color-surface) / <alpha-value>)", 3: "rgb(var(--color-neutral) / <alpha-value>)", 4: "rgb(var(--color-neutral) / <alpha-value>)" },
        card: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-elevated": "rgb(var(--color-neutral) / <alpha-value>)",
        line: { DEFAULT: "rgb(var(--color-border) / <alpha-value>)", hover: "rgb(var(--color-control) / <alpha-value>)", focus: "rgb(var(--color-navy) / <alpha-value>)" },
        border: "rgb(var(--color-border) / <alpha-value>)",
        control: "rgb(var(--color-control) / <alpha-value>)",
        primary: { DEFAULT: "rgb(var(--color-navy) / <alpha-value>)", hover: "rgb(var(--color-navy-hover) / <alpha-value>)", muted: "rgb(var(--color-navy) / 0.08)" },
        "on-primary": "rgb(var(--color-surface) / <alpha-value>)",
        "text-primary": "rgb(var(--color-navy) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-secondary) / <alpha-value>)",
        "text-muted": "rgb(var(--color-secondary) / <alpha-value>)",
        bronze: { DEFAULT: "rgb(var(--color-bronze) / <alpha-value>)", text: "rgb(var(--color-bronze-text) / <alpha-value>)" },
        success: "#166534", warning: "#92400E", danger: "#B91C1C", info: "#1D4ED8",
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
        "card-sm": "0 1px 2px rgba(24,36,56,0.08)",
        card:      "0 2px 10px rgba(24,36,56,0.08)",
        "card-lg": "0 16px 48px rgba(24,36,56,0.08)",
        // Legacy shadow aliases now resolve to restrained neutral shadows.
        "glow-sm": "0 0 0 1px rgba(24,36,56,0.08), 0 4px 16px rgba(24,36,56,0.08)",
        glow:      "0 0 0 1px rgba(24,36,56,0.08), 0 10px 34px rgba(24,36,56,0.08)",
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
          to:   { opacity: "1", transform: "none" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "none" },
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
