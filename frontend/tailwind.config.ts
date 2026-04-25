import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        purple: {
          50: "#EDE9FE",
          100: "#DDD6FE",
          600: "#5B2C8D",
          700: "#4A237A",
          900: "#3D1A6B",
        },
        bfe: {
          purple: "#5B2C8D",
          "purple-dark": "#3D1A6B",
          "purple-light": "#EDE9FE",
          green: "#3A8C3F",
          "green-light": "#E8F5E9",
          amber: "#F59E0B",
          "amber-light": "#FEF3C7",
          red: "#EF4444",
          "red-light": "#FEE2E2",
        },
      },
    },
  },
  plugins: [],
};

export default config;
