import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface-base": "#0A0F1E",
        "surface-level-1": "#12192D",
        "alert-coral": "#FF6B6B",
        "surface-level-2": "#18223C",
        "surface-level-3": "#1E2B4C",
        "primary-container": "#FF9933",
        "saffron-hover": "#F08824",
        "emerald-brand": "#10B981",
        "text-secondary": "#94A3B8",
        "text-warm": "#FDBA74",
        "on-surface": "#dee1f7",
        warm: {
          cream: "#FAF8F5",
          linen: "#F5F1EB",
          paper: "#fcf9f8",
          primary: "#a73400",
          "primary-container": "#cb4914",
          "on-primary": "#ffffff",
          ink: "#1c1b1b",
          "ink-muted": "#5C5852",
          secondary: "#1b6d24",
          "clinical-bg": "#E8F5E9",
          "border-gentle": "#EAE5DE",
          saffron: "#FF9933",
          error: "#ba1a1a",
          "error-container": "#ffdad6",
          container: "#f0eded",
          "container-high": "#eae7e7",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        warm: "0 4px 16px rgba(26, 26, 26, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
