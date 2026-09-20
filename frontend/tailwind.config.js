/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navigation: "rgb(var(--color-navigation) / <alpha-value>)",
        bg: "rgb(var(--color-page) / <alpha-value>)",
        surface: { DEFAULT: "rgb(var(--color-surface) / <alpha-value>)", 1: "rgb(var(--color-surface) / <alpha-value>)", 2: "rgb(var(--color-surface) / <alpha-value>)", 3: "rgb(var(--color-neutral) / <alpha-value>)", 4: "rgb(var(--color-neutral) / <alpha-value>)" },
        card: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-elevated": "rgb(var(--color-neutral) / <alpha-value>)",
        line: { DEFAULT: "rgb(var(--color-border) / <alpha-value>)", hover: "rgb(var(--color-control) / <alpha-value>)", focus: "rgb(var(--color-accent) / <alpha-value>)" },
        border: "rgb(var(--color-border) / <alpha-value>)",
        control: "rgb(var(--color-control) / <alpha-value>)",
        primary: { DEFAULT: "rgb(var(--color-accent) / <alpha-value>)", hover: "rgb(var(--color-accent-hover) / <alpha-value>)", muted: "rgb(var(--color-accent) / 0.08)" },
        "on-primary": "rgb(var(--color-on-accent) / <alpha-value>)",
        "text-primary": "rgb(var(--color-text) / <alpha-value>)",
        "text-secondary": "rgb(var(--color-secondary) / <alpha-value>)",
        "text-muted": "rgb(var(--color-secondary) / <alpha-value>)",
        bronze: { DEFAULT: "rgb(var(--color-accent) / <alpha-value>)", text: "rgb(var(--color-accent) / <alpha-value>)" },
        success: "rgb(var(--color-success) / <alpha-value>)", warning: "rgb(var(--color-warning) / <alpha-value>)", danger: "rgb(var(--color-danger) / <alpha-value>)", info: "rgb(var(--color-info) / <alpha-value>)",
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
        "card-sm": "0 1px 2px rgb(var(--color-shadow) / 0.25)",
        card:      "0 2px 10px rgb(var(--color-shadow) / 0.25)",
        "card-lg": "0 16px 48px rgb(var(--color-shadow) / 0.25)",
        // Legacy shadow aliases now resolve to restrained neutral shadows.
        "glow-sm": "0 0 0 1px rgb(var(--color-shadow) / 0.25), 0 4px 16px rgb(var(--color-shadow) / 0.25)",
        glow:      "0 0 0 1px rgb(var(--color-shadow) / 0.25), 0 10px 34px rgb(var(--color-shadow) / 0.25)",
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
