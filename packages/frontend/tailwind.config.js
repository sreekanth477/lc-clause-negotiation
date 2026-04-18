/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Bank brand tokens ─────────────────────────────────────────────
        bank: {
          900: '#12243d',
          800: '#1e3a5f',        // primary — sidebar, main CTAs
          700: '#254d7d',
          600: '#2d6a9f',        // hover state
          500: '#3a82bf',
          200: '#bfdbf7',
          50:  '#f0f7ff',
          accent: '#f0a500',     // gold accent — primary action buttons
          'accent-light': '#fbbf24',
        },
        // ── Risk severity tokens ───────────────────────────────────────────
        risk: {
          high:            '#dc2626',
          'high-bg':       '#fef2f2',
          'high-border':   '#fca5a5',
          medium:          '#d97706',
          'medium-bg':     '#fffbeb',
          'medium-border': '#fcd34d',
          low:             '#ca8a04',
          'low-bg':        '#fefce8',
          'low-border':    '#fde68a',
          compliant:       '#16a34a',
          'compliant-bg':  '#f0fdf4',
          'compliant-border': '#86efac',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        card:        '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04)',
        'card-hover':'0 4px 12px 0 rgba(0,0,0,.08)',
        modal:       '0 20px 60px -10px rgba(0,0,0,.25)',
        toast:       '0 4px 20px rgba(0,0,0,.15)',
      },
      animation: {
        'slide-in-up': 'slideInUp 0.2s ease-out',
        'fade-in':     'fadeIn 0.15s ease-out',
        'pulse-ring':  'pulseRing 1.8s ease-in-out infinite',
      },
      keyframes: {
        slideInUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        pulseRing: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220,38,38,.4)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(220,38,38,0)' },
        },
      },
    },
  },
  plugins: [],
}
