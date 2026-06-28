import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button.jsx';

describe('Button', () => {
  it('renders primary variant with accent background by default', () => {
    render(<Button>Join as Player</Button>);
    const btn = screen.getByRole('button', { name: 'Join as Player' });
    expect(btn.className).toContain('bg-accent-500');
  });

  it('applies the secondary variant', () => {
    render(<Button variant="secondary">View</Button>);
    expect(screen.getByRole('button').className).toContain('border-border-strong');
  });

  it('fires onClick', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Go</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
