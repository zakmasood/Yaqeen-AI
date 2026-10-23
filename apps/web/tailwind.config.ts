import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        yaqeen: {
          50: "#ecf8f2",
          100: "#d4f0e3",
          200: "#a8dfc6",
          500: "#0d8a56",
          600: "#04724a",
          700: "#036244",
          800: "#065f46",
          900: "#043f2e",
        },
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        lift: "var(--lift)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        ready: "var(--ready)",
        "ready-bg": "var(--ready-bg)",
        review: "var(--review)",
        "review-bg": "var(--review-bg)",
        danger: "var(--danger)",
        "danger-bg": "var(--danger-bg)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
