/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: { background: 'var(--background)', foreground: 'var(--foreground)', card: 'var(--card)', border: 'var(--border)', muted: 'var(--muted)', primary: '#365cf5' },
      borderRadius: { lg: '0.85rem' }
    }
  },
  plugins: []
}
