/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bgDark: '#0F172A',
        surfaceDark: '#1E293B',
        bgLight: '#F8FAFC',
        surfaceLight: '#FFFFFF',
        primaryBlue: '#3B82F6',
        accentCyan: '#06B6D4',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        plex: ['IBM Plex Sans', 'sans-serif'],
      },
      boxShadow: {
        'cyan-glow': '0 0 20px rgba(6, 182, 212, 0.4)',
        'blue-glow': '0 0 20px rgba(59, 130, 246, 0.4)',
      },
      dropShadow: {
        'cyan-letter': '0 0 15px rgba(6, 182, 212, 0.5)',
      },
      animation: {
        'tracing-beam': 'tracingBeam 3s linear infinite',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        tracingBeam: {
          '0%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
          '100%': { 'background-position': '0% 50%' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        }
      }
    },
  },
  plugins: [],
}
