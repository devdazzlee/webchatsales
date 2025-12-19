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
        bg: "var(--bg)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        emerald: {
          DEFAULT: "var(--emerald)",
          light: "var(--emerald2)",
        },
        line: "var(--line)",
        panel: "var(--panel)",
        glass: "var(--glass)",
        silver: "var(--silver)",
        shadow: "var(--shadow)",
      },
      backgroundColor: {
        'emerald-gradient': 'linear-gradient(135deg, var(--emerald), var(--emerald2))',
      },
    },
  },
  plugins: [],
};

export default config;

