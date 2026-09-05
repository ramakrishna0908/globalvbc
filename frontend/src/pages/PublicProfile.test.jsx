import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../context/ThemeContext.jsx';

vi.mock('../api/endpoints.js', () => ({
  profileApi: { public: vi.fn() },
  playersApi: { stats: vi.fn(), matches: vi.fn(), ratingEvents: vi.fn() },
}));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: null, loading: false, logout: () => {} }) }));

import { profileApi, playersApi } from '../api/endpoints.js';
import PublicProfile from './PublicProfile.jsx';

const profile = { id: 42, name: 'Maya Chen', position: 'setter', rating_score: 7.4, elo: 1240, win_rate: 60, matches_played: 5, rank: 3, badges: [{ key: 'first', name: 'First Match', icon: '🏐' }], jersey_number: 9, role: 'player' };
const stats = {
  player: { id: 42, name: 'Maya Chen', elo: 1240, rating_score: 7.4 },
  career: { matches: 5, wins: 3, losses: 2, win_rate: 60, points: 41, kills: 30, attacks: 70, attack_errors: 6, aces: 6, blocks: 5, digs: 22, assists: 40, errors: 9, kill_pct: 43, hitting_efficiency: 0.343, per_match: { points: 8.2, kills: 6, aces: 1.2, blocks: 1, digs: 4.4, assists: 8, errors: 1.8 } },
  skills: { serve: 61, receive: 55, set: 80, attack: 48, block: 20, dig: 30, defense: 35 },
  form: ['W', 'L', 'W', 'W', 'L'],
  ratingTrend: [
    { elo: 1200, delta: 12, date: '2026-08-01T10:00:00Z', match_id: 1 },
    { elo: 1240, delta: 40, date: '2026-08-09T10:00:00Z', match_id: 2 },
  ],
  teams: [{ id: 7, name: 'Harbour Hawks', logo_url: null, jersey_number: 9, position: 'setter' }],
  tournaments: [{ id: 3, name: 'City Open', status: 'completed', starts_on: '2026-08-01', matches: 3, wins: 2, points: 25 }],
};
const matches = [
  { id: 2, status: 'submitted', completed_at: '2026-08-09T12:00:00Z', sets_a: 2, sets_b: 0, winner_team_id: 7, tournament_name: 'City Open', team_a_name: 'Harbour Hawks', team_b_name: 'Bay Blockers', side: 'A', won: true, points: 12, kills: 9, aces: 2, blocks: 1, digs: 5, assists: 10, errors: 2, rating_delta: 40 },
];
const ratingEvents = [
  { id: 11, match_id: 2, version: 1, rating_before: 1200, rating_after: 1240, delta: 40, reason: 'Beat a higher-rated team 2–0 and led the match in assists.', factors: {}, created_at: '2026-08-09T12:00:00Z', team_a_name: 'Harbour Hawks', team_b_name: 'Bay Blockers', sets_a: 2, sets_b: 0 },
];

function renderPage(path = '/p/42') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/p/:id" element={<PublicProfile />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('PublicProfile', () => {
  beforeEach(() => {
    profileApi.public.mockReset();
    playersApi.stats.mockReset();
    playersApi.matches.mockReset();
    playersApi.ratingEvents.mockReset();
  });

  it('renders the share card, skills and the rating reason', async () => {
    profileApi.public.mockResolvedValue(profile);
    playersApi.stats.mockResolvedValue(stats);
    playersApi.matches.mockResolvedValue(matches);
    playersApi.ratingEvents.mockResolvedValue(ratingEvents);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Maya Chen' })).toBeInTheDocument();
    expect(await screen.findByTestId('skill-bars')).toBeInTheDocument();
    for (const label of ['Serve', 'Receive', 'Set', 'Attack / Spike', 'Block', 'Dig', 'Defense']) expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('Beat a higher-rated team 2–0 and led the match in assists.')).toBeInTheDocument();
    expect(screen.getByTestId('rating-log')).toHaveTextContent('1200');
    expect(screen.getByTestId('rating-log')).toHaveTextContent('+40');
    expect(screen.getByTestId('form-dots').querySelectorAll('li')).toHaveLength(5);
    expect(screen.getByTestId('career-grid')).toHaveTextContent('43%');
    const teamLinks = screen.getAllByRole('link', { name: /Harbour Hawks/ }).map((l) => l.getAttribute('href'));
    expect(teamLinks).toContain('/teams/7');
    expect(screen.getByTestId('match-row')).toHaveAttribute('href', '/matches/2');
  });

  it('resolves the sample id to the numeric profile id for stats and shows the empty state', async () => {
    profileApi.public.mockResolvedValue({ ...profile, badges: [] });
    playersApi.stats.mockResolvedValue({ ...stats, career: { ...stats.career, matches: 0, wins: 0, losses: 0 }, form: [], ratingTrend: [], tournaments: [] });
    playersApi.matches.mockResolvedValue([]);
    playersApi.ratingEvents.mockResolvedValue([]);
    renderPage('/p/sample');

    expect(await screen.findByText('No official stats yet')).toBeInTheDocument();
    expect(playersApi.stats).toHaveBeenCalledWith(42);
    expect(screen.getByText(/No officially scored matches yet/)).toBeInTheDocument();
  });

  it('shows not found when the profile is missing', async () => {
    profileApi.public.mockImplementation(() => Promise.reject(Object.assign(new Error('404'), { response: { status: 404, data: { error: 'Profile not found' } } })));
    renderPage('/p/999');
    expect(await screen.findByText('Profile not found')).toBeInTheDocument();
  });
});
