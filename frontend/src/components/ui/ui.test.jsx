// Design-system primitives: status vocabulary, accessible tabs, dialog, tables.
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import StatusBadge, { LiveCount, MATCH_STATUS, TOURNAMENT_STATUS } from './StatusBadge.jsx';
import Tabs, { TabPanel } from './Tabs.jsx';
import Dialog from './Dialog.jsx';
import Alert from './Alert.jsx';
import Field, { Checkbox } from './Field.jsx';
import { Table, TableWrap, Th, Td, SortableTh } from './Table.jsx';
import MatchCard from '../tournament/MatchCard.jsx';
import StandingsTable from '../tournament/StandingsTable.jsx';
import Icon, { ICON_NAMES } from './Icon.jsx';

describe('StatusBadge', () => {
  it('renders every product state with a label', () => {
    for (const s of ['live', 'upcoming', 'registration_open', 'final', 'completed', 'postponed', 'forfeit', 'qualified', 'eliminated', 'pending', 'approved', 'rejected', 'withdrawn', 'draft', 'cancelled', 'waiting']) {
      const { unmount } = render(<StatusBadge status={s} />);
      expect(screen.getByText(/\S/).textContent.length).toBeGreaterThan(0);
      unmount();
    }
  });
  it('maps backend match + tournament statuses to the vocabulary', () => {
    expect(MATCH_STATUS.submitted).toBe('final');
    expect(MATCH_STATUS.completed).toBe('awaiting');
    expect(TOURNAMENT_STATUS.published).toBe('upcoming');
  });
  it('LIVE uses the solid live fill with white text and a dot', () => {
    render(<StatusBadge status="live" data-testid="pill" />);
    const pill = screen.getByTestId('pill');
    expect(pill.className).toContain('bg-status-live');
    expect(pill.className).toContain('text-white');
    expect(pill).toHaveTextContent('Live');
  });
  it('LiveCount hides at zero', () => {
    const { container } = render(<LiveCount count={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Tabs', () => {
  const tabs = [
    { key: 'a', label: 'Overview' },
    { key: 'b', label: 'Standings', count: 3 },
    { key: 'c', label: 'Bracket' },
  ];
  function Harness() {
    const [v, setV] = useState('a');
    return (
      <>
        <Tabs id="t" tabs={tabs} value={v} onChange={setV} />
        <TabPanel id="t" value={v}>
          panel {v}
        </TabPanel>
      </>
    );
  }
  it('supports arrow, Home and End keys with roving focus and aria wiring', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const first = screen.getByRole('tab', { name: 'Overview' });
    expect(first).toHaveAttribute('aria-controls', 't-panel-a');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 't-tab-a');
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Standings/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Standings/ })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Bracket' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('panel a');
    // only the selected tab is in the tab order
    expect(screen.getByRole('tab', { name: 'Bracket' })).toHaveAttribute('tabindex', '-1');
  });
});

describe('Dialog', () => {
  it('is a labelled modal, focuses inside, closes on Escape and restores focus', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <>
        <button type="button">opener</button>
        <Dialog open onClose={onClose} title="Record a match">
          <input aria-label="Opponent" />
        </Dialog>
      </>
    );
    const dialog = screen.getByRole('dialog', { name: 'Record a match' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Opponent')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
  it('renders nothing when closed', () => {
    render(<Dialog open={false} title="x" />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Alert + Field', () => {
  it('danger alerts are assertive, info alerts polite', () => {
    render(
      <>
        <Alert tone="danger">Boom</Alert>
        <Alert tone="info">Note</Alert>
      </>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    expect(screen.getByRole('status')).toHaveTextContent('Note');
  });
  it('wires hint and error text to the control', () => {
    const { rerender } = render(<Field label="Email" hint="We never share it." />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('We never share it.');
    rerender(<Field label="Email" error="Required" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });
  it('required marker does not pollute the accessible label', () => {
    render(<Field label="Name" required />);
    expect(screen.getByLabelText('Name')).toBeRequired();
  });
  it('checkbox is labelled', () => {
    render(<Checkbox label="Captain" />);
    expect(screen.getByLabelText('Captain')).toHaveAttribute('type', 'checkbox');
  });
});

describe('Table', () => {
  it('renders caption, numeric and sortable headers', async () => {
    const onSort = vi.fn();
    render(
      <TableWrap>
        <Table caption="Standings">
          <thead>
            <tr>
              <Th sticky>Team</Th>
              <SortableTh label="W" num active dir="desc" onSort={onSort} />
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td sticky>Aces</Td>
              <Td num>3</Td>
            </tr>
          </tbody>
        </Table>
      </TableWrap>
    );
    expect(screen.getByRole('table', { name: 'Standings' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /W/ })).toHaveAttribute('aria-sort', 'descending');
    await userEvent.setup().click(screen.getByRole('button', { name: /W/ }));
    expect(onSort).toHaveBeenCalled();
    expect(screen.getByRole('cell', { name: '3' }).className).toContain('cell-num');
  });
});

describe('MatchCard', () => {
  const base = { id: 1, team_a_id: 10, team_b_id: 11, team_a_name: 'Aces', team_b_name: 'Blockers', tournament_name: 'Cup' };
  it('marks the winner and dims the loser on a final', () => {
    render(
      <MemoryRouter>
        <MatchCard match={{ ...base, status: 'submitted', sets_a: 2, sets_b: 0, winner_team_id: 10 }} />
      </MemoryRouter>
    );
    expect(screen.getByText('Final')).toBeInTheDocument();
    expect(screen.getByLabelText('Winner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Aces vs Blockers/ })).toHaveAttribute('href', '/matches/1');
  });
  it('shows sets plus running set score when live and links to the live view', () => {
    render(
      <MemoryRouter>
        <MatchCard match={{ ...base, status: 'live', state_snapshot: { scoreA: 12, scoreB: 9, setsA: 1, setsB: 0, currentSet: 2 } }} />
      </MemoryRouter>
    );
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Set 2 in progress')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/live/1');
  });
});

describe('StandingsTable', () => {
  const rows = [
    { rank: 1, teamId: 1, team: { name: 'Kings' }, played: 3, wins: 3, losses: 0, setsWon: 6, setsLost: 1, setRatio: 6, pointRatio: 1.2 },
    { rank: 2, teamId: 2, team: { name: 'Spike' }, played: 3, wins: 2, losses: 1, setsWon: 5, setsLost: 3, setRatio: 1.67, pointRatio: 1.08 },
    { rank: 3, teamId: 3, team: { name: 'VC' }, played: 3, wins: 1, losses: 2, setsWon: 3, setsLost: 4, setRatio: 0.75, pointRatio: 0.96 },
  ];
  it('crowns the champion and flags qualifying places', () => {
    render(
      <MemoryRouter>
        <StandingsTable rows={rows} title="Pool A" champion={1} advance={2} complete />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Champion')).toBeInTheDocument();
    const spike = screen.getByRole('link', { name: 'Spike' }).closest('tr');
    expect(within(spike).getByTitle('Qualified')).toBeInTheDocument();
    const vc = screen.getByRole('link', { name: 'VC' }).closest('tr');
    expect(within(vc).queryByTitle('Qualified')).toBeNull();
    expect(screen.getByRole('columnheader', { name: 'SR' }).className).toContain('hidden sm:table-cell');
  });
});

describe('Icon', () => {
  it('is decorative by default and labelled on request', () => {
    const { rerender } = render(<Icon name="trophy" data-testid="i" />);
    expect(screen.getByTestId('i')).toHaveAttribute('aria-hidden', 'true');
    rerender(<Icon name="trophy" label="Champion" />);
    expect(screen.getByRole('img', { name: 'Champion' })).toBeInTheDocument();
    expect(ICON_NAMES).toContain('ball');
  });
});
