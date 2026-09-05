import { Link } from 'react-router-dom';
import { Table, TableWrap, Th, Td } from '../ui/Table.jsx';
import Icon from '../ui/Icon.jsx';

const ratio = (v) => (v === Infinity ? '∞' : Number.isFinite(v) ? v.toFixed(2) : '–');

/**
 * Pool/division standings. Rank, team and W–L are always visible; set and
 * point ratios (tie-breakers) appear from the sm breakpoint. Pass `advance`
 * to mark the qualifying places and `champion` to crown the winner.
 */
export default function StandingsTable({ rows, title, champion, advance, complete = false }) {
  if (!rows?.length) return <p className="text-sm text-text-muted">No teams yet.</p>;
  return (
    <TableWrap>
      {title ? <div className="eyebrow border-b border-border-default bg-bg-surface px-3 py-2">{title}</div> : null}
      <Table caption={`${title || 'Standings'}: rank, team, played, wins, losses, sets, set ratio, point ratio`}>
        <thead>
          <tr>
            <Th className="w-10 !pr-0">#</Th>
            <Th>Team</Th>
            <Th num title="Played">P</Th>
            <Th num title="Wins">W</Th>
            <Th num title="Losses">L</Th>
            <Th num>Sets</Th>
            <Th num className="hidden sm:table-cell" title="Set ratio">SR</Th>
            <Th num className="hidden sm:table-cell" title="Point ratio">PR</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isChamp = champion && Number(champion) === Number(r.teamId);
            const qualifies = advance && r.rank <= advance;
            return (
              <tr key={r.teamId} className={qualifies ? 'bg-status-success/5' : ''}>
                <Td className="!pr-0">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md font-display text-sm font-bold tabular-nums ${qualifies ? 'bg-status-success/15 text-status-success' : 'bg-bg-elevated text-text-secondary'}`}>{r.rank}</span>
                </Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <Link to={`/teams/${r.teamId}`} className="truncate font-display text-base font-bold uppercase tracking-wide text-text-primary hover:text-accent-400">
                      {r.team?.name || `Team ${r.teamId}`}
                    </Link>
                    {isChamp ? <Icon name="trophy" size={16} className="text-brand-400" label="Champion" /> : null}
                    {qualifies && complete && !isChamp ? <span className="rounded bg-status-success/15 px-1 font-display text-2xs font-bold uppercase text-status-success" title="Qualified">Q</span> : null}
                  </span>
                </Td>
                <Td num muted>{r.played}</Td>
                <Td num strong className="text-status-success">{r.wins}</Td>
                <Td num muted>{r.losses}</Td>
                <Td num>
                  {r.setsWon}–{r.setsLost}
                </Td>
                <Td num muted className="hidden sm:table-cell">{ratio(r.setRatio)}</Td>
                <Td num muted className="hidden sm:table-cell">{ratio(r.pointRatio)}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </TableWrap>
  );
}
