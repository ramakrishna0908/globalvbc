import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className="rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary"
    >
      {isLight ? '☾ Dark' : '☀ Light'}
    </button>
  );
}
