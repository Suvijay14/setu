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
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
