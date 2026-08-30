import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#141821',
          2: '#1c2230',
          deep: '#0d1017',
        },
        cream: {
          DEFAULT: '#FFF4E0',
          2: '#F6E7CC',
        },
        diner: {
          red: '#E23B2E',
          redDark: '#B32419',
          yellow: '#FFC22C',
          yellowDark: '#C68D0C',
          cyan: '#2FE3F5',
          cyanDark: '#14A9B8',
        },
        body: {
          soft: '#C9C2B4',
          dark: '#1B202B',
          darkSoft: '#5A6273',
        },
      },
      fontFamily: {
        script: ['var(--font-script)', 'cursive'],
        slab: ['var(--font-slab)', 'Georgia', 'serif'],
        cond: ['var(--font-cond)', 'Impact', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        diner: 'cubic-bezier(.22,.61,.36,1)',
        out: 'cubic-bezier(.16,1,.3,1)',
        bounce: 'cubic-bezier(.34,1.56,.64,1)',
      },
      keyframes: {
        breathe: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '.92' },
        },
        pop: {
          from: { opacity: '0', transform: 'scale(.9) translateY(22px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        breathe: 'breathe 4.5s ease-in-out infinite',
        pop: 'pop .5s cubic-bezier(.34,1.56,.64,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
