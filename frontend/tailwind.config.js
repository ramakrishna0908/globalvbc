/** @type {import('tailwindcss').Config} */
const cssColor = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const ramp = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => [
      n,
      `rgb(var(--${name}-${n}) / <alpha-value>)`,
    ])
  );

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: ramp('brand'),
        accent: {
          400: cssColor('accent-400'),
          500: cssColor('accent-500'),
          600: cssColor('accent-600'),
        },
        violet: {
          400: cssColor('violet-400'),
          500: cssColor('violet-500'),
          600: cssColor('violet-600'),
        },
        surface: {
          0: cssColor('surface-0'),
          50: cssColor('surface-50'),
          100: cssColor('surface-100'),
          200: cssColor('surface-200'),
          300: cssColor('surface-300'),
          400: cssColor('surface-400'),
          500: cssColor('surface-500'),
          600: cssColor('surface-600'),
          700: cssColor('surface-700'),
          800: cssColor('surface-800'),
          900: cssColor('surface-900'),
        },
        'bg-page': cssColor('bg-page'),
        'bg-card': cssColor('bg-card'),
        'bg-surface': cssColor('bg-surface'),
        'bg-elevated': cssColor('bg-elevated'),
        'text-primary': cssColor('text-primary'),
        'text-secondary': cssColor('text-secondary'),
        'text-muted': cssColor('text-muted'),
        'text-inverse': cssColor('text-inverse'),
        'border-default': cssColor('border-default'),
        'border-strong': cssColor('border-strong'),
        'action-primary': cssColor('action-primary'),
        'action-primary-hover': cssColor('action-primary-hover'),
        'status-success': cssColor('status-success'),
        'status-warning': cssColor('status-warning'),
        'status-active': cssColor('status-active'),
        'status-danger': cssColor('status-danger'),
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: ['Source Sans 3', 'Helvetica Neue', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgb(0 0 0 / 0.12), 0 1px 2px rgb(0 0 0 / 0.08)',
        elevated: '0 10px 30px -10px rgb(0 0 0 / 0.35)',
      },
    },
  },
  plugins: [],
};
