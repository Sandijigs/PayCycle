import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cycle: {
          primary: "#6366f1",   // indigo-500
          secondary: "#8b5cf6", // violet-500
          accent: "#06b6d4",    // cyan-500
          dark: "#0f172a",      // slate-900
        },
      },
    },
  },
  plugins: [],
};
export default config;
