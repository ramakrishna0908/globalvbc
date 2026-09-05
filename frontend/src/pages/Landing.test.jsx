import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import Landing from './Landing.jsx';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

function renderLanding(user = null) {
  useAuth.mockReturnValue({ user, loading: false, logout: vi.fn() });
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <Landing />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Landing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the hero headline and both CTAs (signed out → register as scorer)', () => {
    renderLanding();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(/Score the match/);
    expect(h1).toHaveTextContent(/Build your volleyball identity/);

    const start = screen.getAllByRole('link', { name: /Start Scoring/ });
    expect(start.length).toBeGreaterThanOrEqual(2); // hero + final CTA
    expect(start[0]).toHaveAttribute('href', '/register?role=scorer');

    const explore = screen.getAllByRole('link', { name: /Explore Players/ });
    expect(explore.length).toBeGreaterThanOrEqual(2);
    expect(explore[0]).toHaveAttribute('href', '/leaderboard');
  });

  it('sends scoring roles straight to the scorer desk', () => {
    renderLanding({ id: 1, name: 'Sam Scorer', role: 'scorer' });
    expect(screen.getAllByRole('link', { name: /Start Scoring/ })[0]).toHaveAttribute('href', '/score');
  });

  it('sends players to register as a scorer', () => {
    renderLanding({ id: 2, name: 'Pat Player', role: 'player' });
    expect(screen.getAllByRole('link', { name: /Start Scoring/ })[0]).toHaveAttribute('href', '/register?role=scorer');
  });

  it('renders the How it works steps and the rating explanation', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: 'From first serve to final standings' })).toBeInTheDocument();
    for (const step of ['Create teams', 'Start a match', 'Score rally-by-rally', 'Submit', 'Ratings & standings update']) {
      expect(screen.getByRole('heading', { name: step })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: 'A rating that explains itself' })).toBeInTheDocument();
    expect(screen.getByTestId('rating-example')).toHaveTextContent('742 → 751 · +9 · Won vs stronger opponent; above-team-average performance');
    for (const factor of ['Result vs expected', 'Opponent strength', 'Individual performance', 'Tournament level']) {
      expect(screen.getByRole('heading', { name: factor })).toBeInTheDocument();
    }
  });

  it('renders the live scoring preview using the real Scoreboard', () => {
    renderLanding();
    const preview = screen.getByTestId('live-preview');
    expect(preview).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Scoreboard' })).toBeInTheDocument();
    expect(screen.getByTestId('score-A')).toBeInTheDocument();
    expect(screen.getByTestId('score-B')).toBeInTheDocument();
  });

  it('labels demo data and shows the tournament, profile and leaderboard previews', () => {
    renderLanding();
    expect(screen.getAllByText('Demo').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole('heading', { name: 'Pool A · Spring Open' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Your volleyball identity, backed by data/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open the live leaderboard/ })).toHaveAttribute('href', '/leaderboard');
  });
});
