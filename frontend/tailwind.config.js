/** @type {import('tailwindcss').Config} */
// Every colour resolves through a CSS variable defined in src/index.css so the
// same utility works in dark (default) and light themes.
const cssColor = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const ramp = (name, steps) => Object.fromEntries(steps.map((n) => [n, cssColor(`${name}-${n}`)]));

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    // Breakpoints (documented for the design system): sm 640 phone-landscape,
    // md 768 tablet, lg 1024 small desktop, xl 1280 desktop, 2xl 1536 wide.
    extend: {
      colors: {
        brand: ramp('brand', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        accent: ramp('accent', [300, 400, 500, 600, 700]),
        surface: ramp('surface', [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
        'bg-page': cssColor('bg-page'),
        'bg-card': cssColor('bg-card'),
        'bg-surface': cssColor('bg-surface'),
        'bg-elevated': cssColor('bg-elevated'),
        'bg-inverse': cssColor('bg-inverse'),
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
        'status-live': cssColor('status-live'),
        'status-danger-solid': cssColor('status-danger-solid'),
        'status-success-solid': cssColor('status-success-solid'),
        'team-a': cssColor('team-a'),
        'team-b': cssColor('team-b'),
        'team-a-ink': cssColor('team-a-ink'),
        'team-b-ink': cssColor('team-b-ink'),
        'team-a-solid': cssColor('team-a-solid'),
        'team-b-solid': cssColor('team-b-solid'),
      },
      fontFamily: {
        display: ['Barlow Condensed', 'Barlow', 'Arial Narrow', 'sans-serif'],
        body: ['Barlow', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['IBM Plex Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Type scale — display sizes are set in Barlow Condensed via font-display.
        '2xs': ['0.6875rem', { lineHeight: '1rem' }], // 11px — eyebrows, pills
        score: ['clamp(4.5rem, 16vw, 9rem)', { lineHeight: '0.9', letterSpacing: '-0.01em' }],
        'score-sm': ['clamp(3rem, 9vw, 4.5rem)', { lineHeight: '0.9', letterSpacing: '-0.01em' }],
        'display-lg': ['clamp(2.5rem, 6vw, 4.25rem)', { lineHeight: '0.95', letterSpacing: '-0.01em' }],
        'display-md': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1', letterSpacing: '-0.005em' }],
        'display-sm': ['1.75rem', { lineHeight: '1.05' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
        'glow-accent': 'var(--shadow-glow-accent)',
      },
      minHeight: {
        11: '2.75rem', // 44px — minimum touch target
        touch: '2.75rem',
      },
      minWidth: {
        11: '2.75rem',
        touch: '2.75rem',
      },
      spacing: {
        4.5: '1.125rem',
      },
      keyframes: {
        'toast-in': { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'score-pop': { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'toast-in': 'toast-in 160ms ease-out',
        'fade-up': 'fade-up 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'score-pop': 'score-pop 220ms ease-out',
      },
    },
  },
  plugins: [],
};
