import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import Landing from './Landing.jsx';

function renderLanding() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Landing', () => {
  it('renders the hero headline and both CTAs', () => {
    renderLanding();
    expect(screen.getByText('Build Your Volleyball Reputation.')).toBeInTheDocument();
    expect(screen.getAllByText('Join as Player').length).toBeGreaterThan(0);
    expect(screen.getAllByText('View Sample Profile').length).toBeGreaterThan(0);
  });

  it('renders the How It Works and Features sections', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: 'How It Works' })).toBeInTheDocument();
    expect(screen.getByText('Player Ratings')).toBeInTheDocument();
    expect(screen.getByText('Recognition Badges')).toBeInTheDocument();
  });
});
