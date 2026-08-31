import type { Config } from "tailwindcss";

const config: Config = {
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
        canvas: "#f5f7f6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
