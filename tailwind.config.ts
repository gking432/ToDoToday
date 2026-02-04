import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'masters-green': '#006747',
        'masters-green-dark': '#004d35',
        'masters-green-light': '#007a56',
        'azalea-pink': '#F78FB3',
        'azalea-pink-bg': '#FDE8EF',
        'tournament-yellow': '#FFD700',
        'tournament-yellow-bg': '#FFF8D6',
        'parchment': '#FDFCF8',
        'deep-forest': '#1A2E1A',
        'faded-green': '#5A7A5E',
        'warm-white': '#FAF9F5',
        'sage': '#C8D5C2',
        'card-white': '#FFFFFF',
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'sans': ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 40, 25, 0.18)',
        'card-hover': '0 6px 32px rgba(0, 40, 25, 0.24)',
        'card-sm': '0 2px 12px rgba(0, 40, 25, 0.14)',
      },
      borderRadius: {
        'card': '18px',
        'card-sm': '12px',
        'card-inner': '10px',
      },
    },
  },
  plugins: [],
}
export default config