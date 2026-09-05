import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../context/ThemeContext.jsx';
import TournamentDetail from './TournamentDetail.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: null, loading: false }) }));

const tournament = {
  id: 7,
  name: 'Summer Classic',
  status: 'live',
  starts_on: '2026-09-05',
  ends_on: '2026-09-06',
  venue_name: 'Riverside Hall',
  venue_city: 'Austin',
  level: 'regional',
  format: 'round_robin',
  organizer_name: 'Ram',
  team_count: 2,
  court_count: 2,
  match_count: 1,
  live_count: 1,
  completed_count: 0,
  pending_count: 0,
  registration_open: true,
  canManage: false,
  courts: [{ id: 1, name: 'Court 1' }],
  divisions: [{ id: 1, name: 'Open', format: 'round_robin', status: 'scheduled', match_count: 1, team_count: 2 }],
  registrations: [
    { id: 1, team_id: 10, team_name: 'Spikers', member_count: 6, team_elo: 1500, status: 'approved', division_name: 'Open' },
    { id: 2, team_id: 11, team_name: 'Blockers', member_count: 6, team_elo: 1480, status: 'approved', division_name: 'Open' },
  ],
};

const standings = [
  {
    division: { id: 1, name: 'Open', format: 'round_robin', status: 'scheduled' },
    champion: null,
    groups: [
      {
        pool: null,
        complete: false,
        played: 1,
        total: 1,
        rows: [
          { rank: 1, teamId: 10, team: { id: 10, name: 'Spikers' }, played: 1, wins: 1, losses: 0, setsWon: 2, setsLost: 0, pointsFor: 50, pointsAgainst: 40, setRatio: Infinity, pointRatio: 1.25 },
          { rank: 2, teamId: 11, team: { id: 11, name: 'Blockers' }, played: 1, wins: 0, losses: 1, setsWon: 0, setsLost: 2, pointsFor: 40, pointsAgainst: 50, setRatio: 0, pointRatio: 0.8 },
        ],
      },
    ],
  },
];

vi.mock('../../api/endpoints.js', async (importOriginal) => {
  const orig = await importOriginal();
  return {
    ...orig,
    tournamentsApi: {
      ...orig.tournamentsApi,
      get: vi.fn(() => Promise.resolve(tournament)),
      standings: vi.fn(() => Promise.resolve(standings)),
      bracket: vi.fn(() => Promise.resolve([])),
      leaders: vi.fn(() => Promise.resolve({ points: [], kills: [], aces: [], blocks: [], digs: [], assists: [], mvp: [] })),
    },
    matchesApi: {
      ...orig.matchesApi,
      list: vi.fn(() =>
        Promise.resolve([
          {
            id: 99,
            status: 'live',
            team_a_id: 10,
            team_b_id: 11,
            team_a_name: 'Spikers',
            team_b_name: 'Blockers',
            state_snapshot: { scoreA: 12, scoreB: 9, setsA: 1, setsB: 0, currentSet: 2 },
          },
        ])
      ),
    },
  };
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/tournaments/7']}>
          <Routes>
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('TournamentDetail', () => {
  it('renders the tournament header and live match overview', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Summer Classic' })).toBeInTheDocument();
    expect(screen.getByText(/Riverside Hall/)).toBeInTheDocument();
    expect(await screen.findByText('Live now', { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText('Spikers').length).toBeGreaterThan(0);
  });

  it('shows standings when the Standings tab is selected', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Summer Classic' });
    fireEvent.click(screen.getByRole('tab', { name: 'Standings' }));
    expect(await screen.findByRole('link', { name: 'Spikers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Blockers' })).toBeInTheDocument();
    expect(screen.getByText('1/1 matches played')).toBeInTheDocument();
  });
});
