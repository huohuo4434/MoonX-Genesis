import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * Tailwind theme layer.
 *
 * Every color, radius, and shadow below reads from the CSS custom
 * properties defined in `styles/globals.css`. Do not hardcode raw hex
 * values in components — extend the tokens here instead so the whole
 * app can be re-themed from a single place.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        foreground: {
          DEFAULT: "hsl(var(--foreground) / <alpha-value>)",
          secondary: "hsl(var(--foreground-secondary) / <alpha-value>)",
          tertiary: "hsl(var(--foreground-tertiary) / <alpha-value>)",
          disabled: "hsl(var(--foreground-disabled) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        info: "hsl(var(--info) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        glass: {
          DEFAULT: "hsl(var(--glass-bg) / <alpha-value>)",
          border: "hsl(var(--glass-border) / <alpha-value>)",
        },
      },
      borderRadius: {
        sm: "calc(var(--radius) - 12px)",
        DEFAULT: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 4px)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        full: "9999px",
      },
      maxWidth: {
        container: "var(--container-max-width)",
      },
      spacing: {
        xs: "0.5rem",
        sm: "0.75rem",
        md: "1rem",
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "3rem",
        "3xl": "4rem",
        header: "var(--header-height)",
      },
      fontFamily: {
        sans: ["Arial", "Tahoma", "Verdana", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        /* Typography system — see docs/DESIGN_SYSTEM.md for usage rules. */
        display: ["3.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["2.5rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        h2: ["2rem", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "600" }],
        h3: ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.6", letterSpacing: "-0.006em", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55", letterSpacing: "0", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "500" }],
        label: ["0.8125rem", { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "600" }],
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        elevated: "var(--shadow-elevated)",
        glow: "var(--shadow-glow)",
        "glow-sm": "var(--shadow-glow-sm)",
      },
      backdropBlur: {
        glass: "12px",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        spinSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        spinSlowReverse: {
          "0%": { transform: "rotate(360deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "fade-in-up": "fadeInUp 0.6s ease-out forwards",
        "slide-in-right": "slideInRight 0.8s ease-out forwards",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spinSlow 40s linear infinite",
        "spin-slow-reverse": "spinSlowReverse 55s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
