// Scorer usability tests (spec §41): tap counts are asserted explicitly.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../context/ThemeContext.jsx';
import { ToastProvider } from '../../components/ui/ToastProvider.jsx';

const A = [1, 2, 3, 4, 5, 6].map((id) => ({ id, name: `Alpha ${id}`, jersey_number: id }));
const B = [11, 12, 13, 14, 15, 16].map((id) => ({ id, name: `Bravo ${id}`, jersey_number: id }));

const baseMatch = () => ({
  id: 1,
  status: 'live',
  format: { setsToWin: 2, setPoints: 25, decidingSetPoints: 15, winByTwo: true, pointCap: null, timeoutsPerSet: 2 },
  tournament_name: 'Test Cup',
  court_name: 'Court 1',
  teams: { A: { id: 100, name: 'Tigers' }, B: { id: 200, name: 'Sharks' } },
  lineups: {
    A: { starters: A.map((p) => p.id), bench: [], players: A },
    B: { starters: B.map((p) => p.id), bench: [], players: B },
  },
  events: [{ seq: 1, clientEventId: 'start', type: 'MATCH_START', payload: { servingTeam: 'A', lineups: { A: { starters: A.map((p) => p.id), bench: [] }, B: { starters: B.map((p) => p.id), bench: [] } } }, ts: '2026-09-05T10:00:00Z' }],
  last_seq: 1,
});

const api = vi.hoisted(() => ({
  get: vi.fn(),
  events: vi.fn(),
  submit: vi.fn(),
}));
vi.mock('../../api/endpoints.js', () => ({ matchesApi: api }));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/score/1']}>
            <Routes>
              <Route path="/score/:id" element={<LiveScoringLazy />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

import LiveScoring from './LiveScoring.jsx';
const LiveScoringLazy = LiveScoring;

/**
 * Bulk scoring helper. Point *taps* carry a 300 ms double-tap guard (a real
 * finger bounce must never score twice), so bulk rallies use the keyboard
 * shortcuts (a / b) which call the same `point()` handler.
 */
const score = async (user, team, n = 1) => {
  for (let i = 0; i < n; i++) await user.keyboard(team.toLowerCase());
};

/** Accepts every event the UI sends, assigning sequential seqs like the server. */
function acceptingServer() {
  let seq = 1;
  api.events.mockImplementation(async (_id, events) => ({
    accepted: events.map((e) => ({ clientEventId: e.clientEventId, seq: ++seq, duplicate: false })),
    rejected: [],
    lastSeq: seq,
    summary: {},
    status: 'live',
  }));
}

describe('LiveScoring — scorer usability', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    api.get.mockResolvedValue(baseMatch());
    acceptingServer();
  });

  it('Test 1: records a point in exactly one tap and syncs it', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('point-A');
    expect(screen.getByTestId('score-A')).toHaveTextContent('0');

    await user.click(screen.getByTestId('point-A')); // 1 tap
    expect(screen.getByTestId('score-A')).toHaveTextContent('1');
    expect(screen.getByTestId('context-strip')).toBeInTheDocument();

    await waitFor(() => expect(api.events).toHaveBeenCalled());
    const sent = api.events.mock.calls[0][1];
    expect(sent[0]).toMatchObject({ type: 'RALLY_WON', payload: { team: 'A' } });
    expect(sent[0].clientEventId).toBeTruthy();
  });

  it('Test 2 + 3: records a dig and a spike in two taps each, with a confirmation toast', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('point-A');

    await user.click(screen.getByTestId('action-dig')); // tap 1
    expect(screen.getByTestId('picker-prompt')).toHaveTextContent(/Dig/);
    await user.click(within(screen.getByTestId('player-grid-B')).getByTestId('player-13')); // tap 2
    expect(await screen.findByText(/#13 Bravo — Dig recorded/)).toBeInTheDocument();

    await user.click(screen.getByTestId('action-attack')); // tap 1
    await user.click(within(screen.getByTestId('player-grid-A')).getByTestId('player-3')); // tap 2
    expect(await screen.findByText(/#3 Alpha — Spike recorded/)).toBeInTheDocument();

    await waitFor(() => expect(api.events.mock.calls.flatMap((c) => c[1]).filter((e) => e.type === 'PLAYER_ACTION')).toHaveLength(2));
  });

  it('Test 4: corrects the previous rally in one tap (undo) and can undo a specific earlier rally from the timeline', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('point-A');
    await user.click(screen.getByTestId('point-A'));
    await user.click(screen.getByTestId('point-B'));
    expect(screen.getByTestId('score-B')).toHaveTextContent('1');

    await user.click(screen.getByTestId('undo')); // 1 tap
    expect(screen.getByTestId('score-B')).toHaveTextContent('0');
    expect(screen.getByTestId('score-A')).toHaveTextContent('1');

    // undo a specific row from the timeline (≤ 3 taps: open row → undo)
    const timeline = screen.getByTestId('timeline');
    const rows = within(timeline).getAllByRole('button', { name: /Undo: Team A \+1/ });
    await user.click(rows[0]);
    expect(screen.getByTestId('score-A')).toHaveTextContent('0');
  });

  it('Test 5: keeps scoring while offline, persists locally, and syncs after reconnect without duplicates', async () => {
    const user = userEvent.setup();
    api.events.mockRejectedValue(Object.assign(new Error('Network Error'), { response: undefined }));
    const first = renderPage();
    await screen.findByTestId('point-A');

    await user.click(screen.getByTestId('point-A')); // tap
    await score(user, 'A'); // second point via shortcut (tap guard)
    await user.click(screen.getByTestId('point-B'));
    expect(screen.getByTestId('score-A')).toHaveTextContent('2');
    await waitFor(() => expect(screen.getByTestId('connection-status')).toHaveTextContent(/Offline/i));

    const saved = JSON.parse(localStorage.getItem('gvbc-match:1'));
    expect(saved.events.filter((e) => e.seq == null)).toHaveLength(3);

    // reload the page: state restored from local storage even if the server is unreachable
    first.unmount();
    api.get.mockRejectedValue(Object.assign(new Error('Network Error'), { response: undefined }));
    renderPage();
    expect(await screen.findByTestId('score-A')).toHaveTextContent('2');
    expect(screen.getByTestId('score-B')).toHaveTextContent('1');

    // reconnect: the server accepts; every pending event is sent exactly once
    api.events.mockClear();
    acceptingServer();
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(api.events).toHaveBeenCalled());
    const sentIds = api.events.mock.calls.flatMap((c) => c[1].map((e) => e.clientEventId));
    expect(sentIds).toHaveLength(3);
    expect(new Set(sentIds).size).toBe(3);
    await waitFor(() => expect(JSON.parse(localStorage.getItem('gvbc-match:1')).events.every((e) => e.seq != null)).toBe(true));
  });

  it('Test 6: completes a set, shows the summary and starts the next set with the other team serving', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('point-A');
    await user.click(screen.getByTestId('point-A'));
    await score(user, 'A', 24);
    const panel = await screen.findByTestId('set-complete');
    expect(panel).toHaveTextContent(/Set 1 complete/i);
    expect(panel).toHaveTextContent('Tigers 25');
    expect(screen.queryByTestId('point-A')).not.toBeInTheDocument(); // no accidental scoring between sets

    await user.click(screen.getByTestId('start-next-set'));
    expect(await screen.findByTestId('point-A')).toBeInTheDocument();
    expect(screen.getByTestId('score-A')).toHaveTextContent('0');
    expect(screen.getByLabelText('Sharks serving')).toBeInTheDocument();
  });

  it('completes the match and submits it, surfacing warnings without modifying data', async () => {
    const user = userEvent.setup();
    api.submit.mockRejectedValueOnce({ response: { status: 409, data: { error: 'Review', details: { needsConfirmation: true, warnings: ['Set 1 ended 25–0; one team scored zero'] } } } });
    api.submit.mockResolvedValueOnce({ match: { id: 1, status: 'submitted' }, ratings: [{ playerId: 1, delta: 9, reason: 'Won' }], stats: [], newBadges: {}, warnings: [] });
    renderPage();
    await screen.findByTestId('point-A');
    await score(user, 'A', 25);
    await user.click(await screen.findByTestId('start-next-set'));
    await screen.findByTestId('point-A');
    await score(user, 'A', 25);
    const done = await screen.findByTestId('match-complete');
    expect(done).toHaveTextContent('Tigers 2');

    await user.click(screen.getByTestId('submit-match'));
    expect(await screen.findByText(/scored zero/)).toBeInTheDocument();
    await user.click(screen.getByTestId('submit-match')); // "Submit as recorded"
    expect(await screen.findByTestId('submitted-message')).toHaveTextContent(/submitted successfully/i);
    expect(api.submit).toHaveBeenLastCalledWith(1, { confirmWarnings: true });
  });
});
