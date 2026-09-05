import { Link } from 'react-router-dom';

const ratio = (v) => (v === Infinity ? '∞' : Number.isFinite(v) ? v.toFixed(2) : '–');

/** Pool/division standings with tie-breaker columns. */
export default function StandingsTable({ rows, title, champion }) {
  if (!rows?.length) return <p className="text-sm text-text-muted">No teams yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border-default">
      {title ? <div className="border-b border-border-default bg-bg-surface px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-text-muted">{title}</div> : null}
      <table className="w-full min-w-[520px] text-sm">
        <thead className="bg-bg-surface text-left text-[11px] uppercase tracking-wider text-text-muted">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Team</th>
            <th className="px-2 py-2 text-center">P</th>
            <th className="px-2 py-2 text-center">W</th>
            <th className="px-2 py-2 text-center">L</th>
            <th className="px-2 py-2 text-center">Sets</th>
            <th className="px-2 py-2 text-center">Set ratio</th>
            <th className="px-2 py-2 text-center">Pts ratio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.teamId} className="border-t border-border-default">
              <td className="px-3 py-2 font-bold tabular-nums text-text-secondary">{r.rank}</td>
              <td className="px-3 py-2 font-semibold">
                <Link to={`/teams/${r.teamId}`} className="hover:text-accent-400">
                  {r.team?.name || `Team ${r.teamId}`}
                </Link>
                {champion && Number(champion) === Number(r.teamId) ? <span className="ml-2 text-xs">🏆</span> : null}
              </td>
              <td className="px-2 py-2 text-center tabular-nums">{r.played}</td>
              <td className="px-2 py-2 text-center font-bold tabular-nums text-status-success">{r.wins}</td>
              <td className="px-2 py-2 text-center tabular-nums text-text-secondary">{r.losses}</td>
              <td className="px-2 py-2 text-center tabular-nums">
                {r.setsWon}–{r.setsLost}
              </td>
              <td className="px-2 py-2 text-center tabular-nums text-text-secondary">{ratio(r.setRatio)}</td>
              <td className="px-2 py-2 text-center tabular-nums text-text-secondary">{ratio(r.pointRatio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
