import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import Admin from './Admin.jsx';
import { adminApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../api/endpoints.js', () => ({
  adminApi: { overview: vi.fn(), users: vi.fn(), setRole: vi.fn(), matches: vi.fn(), audit: vi.fn() },
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuth.mockReturnValue({ user: { id: 99, name: 'Ada Admin', role: 'admin' }, loading: false, logout: vi.fn() });
  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <MemoryRouter initialEntries={['/admin']}>
          <Admin />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe('Admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.overview.mockResolvedValue({ users: 12, teams: 4, tournaments: 2, matches: 9, liveMatches: 1, submittedMatches: 6, ratingEvents: 40, auditEntries: 55 });
    adminApi.users.mockResolvedValue([
      { id: 1, name: 'Maya Okafor', email: 'maya@example.com', role: 'player', elo: 751, created_at: '2026-01-01T00:00:00Z' },
      { id: 99, name: 'Ada Admin', email: 'ada@example.com', role: 'admin', elo: 700, created_at: '2026-01-01T00:00:00Z' },
    ]);
    adminApi.matches.mockResolvedValue([{ id: 5, status: 'live', team_a_name: 'Harbour Kings', team_b_name: 'Northside Spike', sets_a: 1, sets_b: 0, scorer_name: 'Lena', last_seq: 41, tournament_name: 'Spring Open' }]);
    adminApi.audit.mockResolvedValue([
      { id: 7, actor_name: 'Ada Admin', entity: 'user', entity_id: '1', action: 'role', reason: 'Volunteered at the table', before: { role: 'player' }, after: { role: 'scorer' }, created_at: '2026-02-02T10:00:00Z' },
    ]);
  });

  it('renders overview tiles and the users table, and changes a role with a reason', async () => {
    const user = userEvent.setup();
    adminApi.setRole.mockResolvedValue({ id: 1, role: 'scorer' });
    renderPage();

    expect(await screen.findByText('Rating events')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(await screen.findByText('Maya Okafor')).toBeInTheDocument();

    await user.type(screen.getByLabelText("Reason for changing Maya Okafor's role"), 'Volunteered');
    await user.selectOptions(screen.getByLabelText('Role for Maya Okafor'), 'scorer');
    expect(adminApi.setRole).toHaveBeenCalledWith(1, 'scorer', 'Volunteered');

    // cannot demote yourself
    expect(screen.getByLabelText('Role for Ada Admin')).toBeDisabled();
  });

  it('shows matches with links to view and score', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Maya Okafor');
    await user.click(screen.getByRole('tab', { name: 'Matches' }));
    expect(await screen.findByText('Harbour Kings')).toBeInTheDocument();
    const table = within(screen.getByRole('table'));
    expect(table.getByRole('link', { name: 'View' })).toHaveAttribute('href', '/matches/5');
    expect(table.getByRole('link', { name: 'Score' })).toHaveAttribute('href', '/score/5');
    expect(table.getByText('41')).toBeInTheDocument();
  });

  it('shows the audit log with an expandable before/after diff', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Maya Okafor');
    await user.click(screen.getByRole('tab', { name: 'Audit log' }));
    expect(await screen.findByText('Volunteered at the table')).toBeInTheDocument();
    expect(adminApi.audit).toHaveBeenCalledWith({ limit: '50' });
    await user.click(screen.getByRole('button', { name: 'Diff' }));
    expect(screen.getByText(/"role": "scorer"/)).toBeInTheDocument();
    expect(screen.getByText(/"role": "player"/)).toBeInTheDocument();
  });
});
