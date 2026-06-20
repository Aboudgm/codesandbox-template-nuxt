/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core surfaces
        background: '#05050F',
        surface:    '#0A0A1A',
        card:       '#0F0F20',
        elevated:   '#151528',
        border:     '#1E2040',
        // Brand
        primary: {
          DEFAULT: '#D97757',
          dark:    '#B85C38',
          light:   '#F08060',
        },
        secondary: '#7C71F0',
        // v2.0 accent colors
        cyan:    '#00E5FF',
        teal:    '#00FFB3',
        violet:  '#C084FC',
        amber:   '#FFB74D',
        // Status
        success: '#00FFB3',
        warning: '#FFB74D',
        error:   '#FF5370',
        // Text
        'text-primary':   '#E8E8F8',
        'text-secondary': '#8080B0',
        'text-muted':     '#4A4A70',
        // Agent colors
        agent: {
          nexus:     '#D97757',
          aria:      '#00E5FF',
          forge:     '#00FFB3',
          scribe:    '#C084FC',
          chronicle: '#FFB74D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'pulse-ring':  'pulseRing 2s ease-in-out infinite',
        'float':       'float 6s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'glow-pulse':  'glowPulse 3s ease-in-out infinite',
        'fade-in':     'fadeIn 0.35s ease-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'slide-down':  'slideDown 0.3s ease-out',
        'scale-in':    'scaleIn 0.2s ease-out',
        'spin-slow':   'spin 4s linear infinite',
        'typing':      'typing 1.2s steps(3, end) infinite',
        'scan':        'scan 4s linear infinite',
      },
      keyframes: {
        pulseRing: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.08)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px currentColor' },
          '50%':      { boxShadow: '0 0 24px currentColor, 0 0 48px currentColor' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        typing: {
          '0%':   { content: '"."' },
          '33%':  { content: '".."' },
          '66%':  { content: '"..."' },
          '100%': { content: '"."' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
