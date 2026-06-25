/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: "var(--theme-bg)",
          panel: "var(--theme-panel)",
          border: "var(--theme-border)",
          text: "var(--theme-text)",
          "text-muted": "var(--theme-text-muted)",
          accent: "var(--theme-accent)",
          "accent-hover": "var(--theme-accent-hover)",
          "chart-1": "var(--theme-chart-1)",
          "chart-2": "var(--theme-chart-2)",
          "chart-3": "var(--theme-chart-3)",
        }
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        }
      },
      animation: {
        marquee: 'marquee 15s linear infinite',
      }
    },
  },
  plugins: [],
}
