import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brution Brand Colors
        'brution-blue': '#1672FF',
        'brution-mint': '#1FCAD3',
        'brution-lime': '#CBF51A',
        // Legacy (for /app/* compatibility)
        primary: {
          DEFAULT: '#1672FF',
          hover: '#0D5FE6',
        },
        background: '#FFFFFF',
        foreground: '#1F2937',
        muted: '#F3F4F6',
        border: '#E5E7EB',
      },
      backgroundImage: {
        'brution-gradient': 'linear-gradient(135deg, #1672FF 0%, #CBF51A 50%, #1FCAD3 100%)',
        'brution-gradient-horizontal': 'linear-gradient(90deg, #1672FF 0%, #CBF51A 50%, #1FCAD3 100%)',
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
        'scroll-indicator': 'bounce 2s infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
