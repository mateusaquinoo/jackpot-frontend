/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Montserrat', 'sans-serif'],
      },
      colors: {
        gold: '#D4AF37',
        dark: '#00203E',
        pokerGreen: '#2D648E',
        pokerRed: '#7E1212',
      },
        animation: {
          pulseGlow: 'pulseGlow 2s ease-in-out infinite',
          slideBanner: 'slideBanner 6s ease-in-out infinite alternate',
          marquee: 'marquee 15s linear infinite',
        },
        keyframes: {
          pulseGlow: {
            '0%, 100%': {
              boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.6)',
            },
            '50%': {
              boxShadow: '0 0 25px 10px rgba(212, 175, 55, 0.4)',
            },
          },
          marquee: {
            '0%': { transform: 'translateX(100%)' },
            '100%': { transform: 'translateX(-100%)' },
          },
        }
    },
  },
  plugins: [],
}