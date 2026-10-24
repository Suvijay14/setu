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
        "surface-base": "#0D111E",
        "surface-level-1": "#13192B",
        "alert-coral": "#FF6B6B",
        "surface-level-2": "#18223C",
        "surface-level-3": "#1E2B4C",
        "primary-container": "#ff9933",
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
