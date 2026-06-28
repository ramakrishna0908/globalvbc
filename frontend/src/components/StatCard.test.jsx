import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from './StatCard.jsx';

describe('StatCard', () => {
  it('shows the label, value and sublabel', () => {
    render(<StatCard label="Rating Score" value="8.3" sublabel="+0.4 this month" />);
    expect(screen.getByText('Rating Score')).toBeInTheDocument();
    expect(screen.getByText('8.3')).toBeInTheDocument();
    expect(screen.getByText('+0.4 this month')).toBeInTheDocument();
  });

  it('applies the gold accent to the value', () => {
    render(<StatCard label="Rating" value="8.3" accent="gold" />);
    expect(screen.getByText('8.3').className).toContain('text-brand-400');
  });
});
