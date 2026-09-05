import { useTheme } from '../context/ThemeContext.jsx';
import Icon from './ui/Icon.jsx';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme();
  const isLight = theme === 'light';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Dark mode' : 'Light mode'}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border-default bg-bg-card text-text-secondary transition-colors hover:border-accent-400 hover:text-text-primary ${className}`}
    >
      <Icon name={isLight ? 'moon' : 'sun'} size={18} />
    </button>
  );
}
