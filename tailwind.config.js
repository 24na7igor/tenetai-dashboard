/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#0a0a0f',
          900: '#0d0d14',
          800: '#111119',
          700: '#1a1a2a',
          600: '#252540',
          500: '#3a3a5c',
        },
        neptune: {
          500: '#00d4aa',
          400: '#33ddb8',
          300: '#66e8ca',
          600: '#00b894',
        },
        signal: {
          500: '#ff4757',
          400: '#ff6b7a',
          300: '#ff9aa3',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
