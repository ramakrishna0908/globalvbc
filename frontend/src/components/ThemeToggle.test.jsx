import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light');
  });

  it('toggles the light class and persists the choice', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    // default dark
    expect(document.documentElement.classList.contains('light')).toBe(false);

    await user.click(screen.getByRole('button'));
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(localStorage.getItem('gvbc-theme')).toBe('light');

    await user.click(screen.getByRole('button'));
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(localStorage.getItem('gvbc-theme')).toBe('dark');
  });
});
