/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Core blacks ─────────────────────────
        black:   "#000000",
        bg:      "#000000",
        surface: {
          DEFAULT: "#0a0a0a",
          1:       "#0a0a0a",
          2:       "#111111",
          3:       "#171717",
          4:       "#1f1f1f",
        },
        // ── Borders ─────────────────────────────
        line: {
          DEFAULT: "#1f1f1f",
          hover:   "#2a2a2a",
          focus:   "#3a3a3a",
        },
        // ── Legacy aliases (Phase 1 compat) ──────
        "surface-elevated": "#1a1a1a",
        border:             "#222222",
        // ── Accent ──────────────────────────────
        primary: {
          DEFAULT: "#6366f1",
          hover:   "#4f46e5",
          muted:   "rgba(99,102,241,0.10)",
        },
        // ── Text ────────────────────────────────
        "text-primary":   "#ffffff",
        "text-secondary": "#a1a1aa",
        "text-muted":     "#52525b",
        // ── Semantic ────────────────────────────
        success: "#22c55e",
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
        "card-sm": "0 1px 2px rgba(0,0,0,0.8)",
        card:      "0 2px 8px rgba(0,0,0,0.6)",
        "card-lg": "0 8px 32px rgba(0,0,0,0.5)",
      },

      animation: {
        "fade-in":    "fade-in 0.25s ease forwards",
        "slide-up":   "slide-up 0.3s ease forwards",
        "spin-slow":  "spin-slow 1.4s linear infinite",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
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
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.35" },
        },
      },
    },
  },
  plugins: [],
};
