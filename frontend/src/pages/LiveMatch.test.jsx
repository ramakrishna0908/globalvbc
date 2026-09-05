import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext.jsx';

vi.mock('../api/endpoints.js', () => ({ matchesApi: { live: vi.fn() } }));
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: null, loading: false, logout: () => {} }) }));

import { matchesApi } from '../api/endpoints.js';
import LiveMatch from './LiveMatch.jsx';

const players = (side) =>
  Array.from({ length: 6 }, (_, i) => {
    const id = side === 'A' ? i + 1 : i + 7;
    return { id, name: `${side} Player ${id}`, jersey_number: id, position: null, rotation_slot: i + 1 };
  });
const lineups = {
  A: { starters: [1, 2, 3, 4, 5, 6], bench: [], players: players('A') },
  B: { starters: [7, 8, 9, 10, 11, 12], bench: [], players: players('B') },
};
const events = [
  { seq: 1, type: 'MATCH_START', payload: { servingTeam: 'A', lineups: { A: { starters: lineups.A.starters, bench: [] }, B: { starters: lineups.B.starters, bench: [] } } } },
  { seq: 2, type: 'RALLY_WON', payload: { team: 'A', actionType: 'kill', playerId: 1 } },
  { seq: 3, type: 'RALLY_WON', payload: { team: 'A' } },
  { seq: 4, type: 'RALLY_WON', payload: { team: 'B', actionType: 'ace', playerId: 7 } },
];

function renderPage(path = '/live/5') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/live/:id" element={<LiveMatch />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('LiveMatch', () => {
  beforeEach(() => {
    matchesApi.live.mockReset();
  });

  it('renders the live score, team names, on-court players and rally feed', async () => {
    matchesApi.live.mockResolvedValue({
      match: { id: 5, status: 'live', format: 'best_of_3', tournament_name: 'City Open', division_name: 'Open', court_name: 'Court 2', tournament_id: 9, last_seq: 4 },
      teams: { A: { id: 1, name: 'Aces' }, B: { id: 2, name: 'Blockers' } },
      lineups,
      events,
      lastSeq: 4,
    });
    const { unmount } = renderPage();
    expect(await screen.findByTestId('score-A')).toHaveTextContent('2');
    expect(screen.getByTestId('score-B')).toHaveTextContent('1');
    expect(screen.getAllByText('Aces').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blockers').length).toBeGreaterThan(0);
    expect(screen.getByTestId('status-pill')).toHaveTextContent(/live/i);
    expect(screen.getByText('City Open · Open · Court 2')).toBeInTheDocument();
    // rally feed: newest first, with the attributed action
    const feed = screen.getByTestId('recent-rallies');
    expect(feed.querySelectorAll('li')).toHaveLength(3);
    expect(feed.querySelector('li')).toHaveTextContent('2–1');
    expect(feed).toHaveTextContent('Ace #7 B');
    // box score for team A lists the killer with a point
    expect(screen.getByTestId('box-A')).toHaveTextContent('A Player 1');
    // team B rotated after the side-out: player 8 is now serving
    expect(screen.getByTestId('on-court-B')).toHaveTextContent('Serving');
    unmount();
  });

  it('shows the waiting state before the match starts', async () => {
    matchesApi.live.mockResolvedValue({
      match: { id: 5, status: 'scheduled', format: 'best_of_3', tournament_name: 'City Open', last_seq: 0 },
      teams: { A: { id: 1, name: 'Aces' }, B: { id: 2, name: 'Blockers' } },
      lineups,
      events: [],
      lastSeq: 0,
    });
    const { unmount } = renderPage();
    expect(await screen.findByTestId('status-pill')).toHaveTextContent(/waiting for scorer/i);
    unmount();
  });

  it('shows a not-found state for a 404', async () => {
    const notFound = Object.assign(new Error('Request failed with status code 404'), { response: { status: 404, data: { error: 'Match not found' } } });
    matchesApi.live.mockImplementation(() => Promise.reject(notFound));
    const { unmount } = renderPage();
    expect(await screen.findByText('Match not found')).toBeInTheDocument();
    unmount();
  });
});
