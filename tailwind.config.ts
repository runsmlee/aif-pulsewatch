import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#C7452E',
          50: '#FDF3F1',
          100: '#FAE3DE',
          200: '#F4C7BC',
          300: '#EBA595',
          400: '#E07861',
          500: '#C7452E',
          600: '#B33A26',
          700: '#962F1F',
          800: '#7A261B',
          900: '#631F17',
        },
        // Neutral warm-tinted charcoal — avoids the blue-slate AI tell
        surface: {
          DEFAULT: '#161514',
          light: '#1F1E1C',
          lighter: '#28262420',
          elevated: '#242220',
          border: '#333029',
          'border-strong': '#3D3A33',
        },
        ink: {
          DEFAULT: '#E8E5E0',
          muted: '#9B958A',
          dim: '#6B665C',
          faint: '#45413A',
        },
        ok: {
          DEFAULT: '#5B9F6A',
          glow: '#5B9F6A33',
        },
        warn: {
          DEFAULT: '#D49838',
          glow: '#D4983833',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.02)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(199,69,46,0.15)',
        glow: '0 0 12px rgba(199,69,46,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
