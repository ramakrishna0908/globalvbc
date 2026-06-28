import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from './EmptyState.jsx';

describe('EmptyState', () => {
  it('renders headline and copy', () => {
    render(<EmptyState headline="No Matches Yet" copy="Add your first match." />);
    expect(screen.getByText('No Matches Yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first match.')).toBeInTheDocument();
  });

  it('renders the CTA and fires onCta', async () => {
    const onCta = vi.fn();
    const user = userEvent.setup();
    render(<EmptyState headline="No Matches" ctaLabel="Record First Match" onCta={onCta} />);
    await user.click(screen.getByRole('button', { name: 'Record First Match' }));
    expect(onCta).toHaveBeenCalledOnce();
  });
});
