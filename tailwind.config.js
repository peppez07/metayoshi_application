/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./app/**/*.{html,js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0e1013',
        primary: {
          DEFAULT: '#f5841f', // MetaYoshi orange
          50: '#fff6ed',
          300: '#fbb46f',
          400: '#f89a45',
          500: '#f5841f',
          600: '#e06c0b',
          700: '#b9540b',
        },
        secondary: '#f6c343',
        dark: {
          950: '#08090b',
          900: '#0b0c0e',
          800: '#111316',
          750: '#16191d',
          700: '#1c2025',
          600: '#272c33',
          500: '#363d45',
        },
        success: '#34d399',
        danger: '#f87171',
        warning: '#fbbf24',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '22px',
      },
      boxShadow: {
        soft: '0 4px 12px rgba(0, 0, 0, 0.4)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        glow: '0 8px 28px -10px rgba(245, 132, 31, 0.55)',
        sheet: '0 -12px 40px -8px rgba(0,0,0,0.65)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      keyframes: {
        'sheet-in': { from: { transform: 'translateY(16px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'sheet-in': 'sheet-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'fade-in': 'fade-in 160ms ease-out',
      },
    },
  },
  plugins: [],
}
