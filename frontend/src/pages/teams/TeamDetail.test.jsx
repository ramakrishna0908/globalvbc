import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../context/ThemeContext.jsx';
import TeamDetail from './TeamDetail.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: { id: 1, name: 'Coach Ram', role: 'coach' }, loading: false }) }));

const team = {
  id: 10,
  name: 'Riverside Spikers',
  logo_url: null,
  elo: 1520,
  coach_user_id: 1,
  created_by: 1,
  coach_name: 'Coach Ram',
  community_name: 'Austin VB',
  member_count: 2,
  played: 3,
  wins: 2,
  losses: 1,
  members: [
    { id: 21, name: 'Ana Setter', photo_url: null, elo: 1500, rating_score: 7.1, jersey_number: 7, position: 'setter', is_captain: true, scored_matches: 3 },
    { id: 22, name: 'Ben Hitter', photo_url: null, elo: 1490, rating_score: 6.8, jersey_number: 12, position: 'outside_hitter', is_captain: false, scored_matches: 2 },
  ],
  tournaments: [{ id: 7, name: 'Summer Classic', status: 'completed', starts_on: '2026-08-01', registration_status: 'approved' }],
};

vi.mock('../../api/endpoints.js', async (importOriginal) => {
  const orig = await importOriginal();
  return {
    ...orig,
    teamsApi: { ...orig.teamsApi, get: vi.fn(() => Promise.resolve(team)) },
    playersApi: { ...orig.playersApi, search: vi.fn(() => Promise.resolve([])) },
  };
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/teams/10']}>
          <Routes>
            <Route path="/teams/:id" element={<TeamDetail />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('TeamDetail', () => {
  it('renders the header and roster', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Riverside Spikers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ana Setter/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ben Hitter/ })).toBeInTheDocument();
    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getAllByText('Captain').length).toBeGreaterThan(0);
    expect(screen.getByRole('cell', { name: 'Setter' })).toBeInTheDocument();
  });

  it('shows the coach-only roster tools', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Riverside Spikers' });
    expect(screen.getByRole('region', { name: 'Add player' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Ana Setter' })).toBeInTheDocument();
  });
});
