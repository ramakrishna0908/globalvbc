import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import Leaderboard from './Leaderboard.jsx';
import { playersApi, tournamentsApi, teamsApi, communitiesApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../api/endpoints.js', () => ({
  playersApi: { leaderboard: vi.fn() },
  tournamentsApi: { list: vi.fn() },
  teamsApi: { list: vi.fn() },
  communitiesApi: { list: vi.fn() },
}));

const METRICS = ['rating', 'points', 'kills', 'aces', 'blocks', 'digs', 'assists', 'mvp'];

function renderPage(path = '/leaderboard') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <Leaderboard />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
    tournamentsApi.list.mockResolvedValue([{ id: 1, name: 'Spring Open' }]);
    teamsApi.list.mockResolvedValue([{ id: 7, name: 'Harbour Kings' }]);
    communitiesApi.list.mockResolvedValue([{ id: 3, name: 'Bay Area' }]);
  });

  it('renders rows from the leaderboard API and highlights the current user', async () => {
    playersApi.leaderboard.mockResolvedValue({
      metrics: METRICS,
      label: 'Rating',
      entries: [
        { rank: 1, id: 11, name: 'Maya Okafor', position: 'outside_hitter', elo: 751, value: 751, matches: 42, team_name: 'Harbour Kings', isYou: false },
        { rank: 2, id: 12, name: 'Diego Ferrer', position: 'opposite', elo: 738, value: 738, matches: 39, team_name: 'Northside Spike', isYou: true },
      ],
    });
    renderPage();

    expect(await screen.findByText('Maya Okafor')).toBeInTheDocument();
    expect(screen.getByText('Diego Ferrer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Maya Okafor/ })).toHaveAttribute('href', '/p/11');
    expect(screen.getByText('751')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Outside Hitter' })).toBeInTheDocument();
    expect(screen.getByTestId('lb-row-12')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('You')).toBeInTheDocument();

    // metric tabs come from the API with friendly labels
    expect(screen.getByRole('tab', { name: 'Overall rating' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Best servers' })).toBeInTheDocument();
    expect(playersApi.leaderboard).toHaveBeenCalledWith({ metric: 'rating' });
  });

  it('switches metric via tabs and shows secondary stat columns', async () => {
    const user = userEvent.setup();
    playersApi.leaderboard.mockImplementation(async ({ metric }) => ({
      metrics: METRICS,
      label: metric,
      entries:
        metric === 'kills'
          ? [{ rank: 1, id: 21, name: 'Jonas Lindqvist', position: 'middle_blocker', value: 88, matches: 12, points: 120, kills: 88, aces: 4, blocks: 20, digs: 5, assists: 1, team_name: 'Harbour Kings' }]
          : [{ rank: 1, id: 11, name: 'Maya Okafor', value: 751, matches: 42 }],
    }));
    renderPage();
    await screen.findByText('Maya Okafor');

    await user.click(screen.getByRole('tab', { name: 'Best attackers' }));
    expect(await screen.findByText('Jonas Lindqvist')).toBeInTheDocument();
    expect(playersApi.leaderboard).toHaveBeenLastCalledWith({ metric: 'kills' });
    expect(screen.getByRole('columnheader', { name: 'Kills' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Pts' })).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('shows the empty state when there are no rows', async () => {
    playersApi.leaderboard.mockResolvedValue({ metrics: METRICS, label: 'Rating', entries: [] });
    renderPage('/leaderboard?metric=rating&team=7');
    expect(await screen.findByText('No scored matches match these filters yet')).toBeInTheDocument();
    expect(playersApi.leaderboard).toHaveBeenCalledWith({ metric: 'rating', team: '7' });
  });
});
