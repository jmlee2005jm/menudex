import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#151515",
        paper: "#fbfaf7",
        line: "#dedbd2",
        accent: "#d8a100",
        leaf: "#27745a",
      },
    },
  },
  plugins: [],
};

export default config;
