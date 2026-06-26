import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep-space backgrounds — the new base palette
        space: {
          '950': '#010209',
          '900': '#040915',
          '800': '#080f28',
          '700': '#0e1840',
          '600': '#152057',
          '500': '#1e2e80',
        },
        // Gold — PRIMARY CTAs ONLY
        gold: {
          '300': '#fcd34d',
          '400': '#fbbf24',
          '500': '#f59e0b',
          '600': '#d97706',
        },
        // Cipher teal — registry/technical indicators (kept for backward compat)
        cipher: {
          '50':  '#f0fdfa',
          '100': '#ccfbf1',
          '200': '#99f6e4',
          '300': '#5eead4',
          '400': '#2dd4bf',
          '500': '#14b8a6',
          '600': '#0d9488',
          '700': '#0f766e',
          '800': '#115e59',
          '900': '#134e4a',
          '950': '#042f2e',
        },
      },
      fontFamily: {
        sans:    ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-space)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // Reusable gradient presets
        'gradient-electric': 'linear-gradient(135deg, #3b82f6, #8b5cf6, #38bdf8)',
        'gradient-gold':     'linear-gradient(135deg, #fcd34d, #f59e0b)',
        'gradient-glass':    'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
      },
      animation: {
        'fade-in-up':   'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'nebula-pulse': 'nebula-pulse 8s ease-in-out infinite',
        'float':        'float 6s ease-in-out infinite',
        'star-blink':   'star-blink 3s ease-in-out infinite',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'nebula-pulse': {
          '0%, 100%': { opacity: '0.35', transform: 'scale(1)' },
          '50%':       { opacity: '0.55', transform: 'scale(1.06)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-10px)' },
        },
        'star-blink': {
          '0%, 100%': { opacity: '0.6' },
          '50%':       { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
