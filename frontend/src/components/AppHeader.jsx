import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';
import Avatar from './Avatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../lib/format.js';

/** Navigation entries by role. Admin sees everything. */
export function navForRole(role) {
  const base = [
    { to: '/tournaments', label: 'Tournaments' },
    { to: '/teams', label: 'Teams' },
    { to: '/leaderboard', label: 'Leaderboard' },
  ];
  const byRole = {
    player: [{ to: '/dashboard', label: 'My dashboard' }, ...base],
    scorer: [{ to: '/score', label: 'Score', primary: true }, ...base],
    coach: [{ to: '/teams?mine=1', label: 'My teams', primary: true }, { to: '/tournaments', label: 'Tournaments' }, { to: '/leaderboard', label: 'Leaderboard' }, { to: '/dashboard', label: 'My dashboard' }],
    organizer: [{ to: '/tournaments?mine=1', label: 'My tournaments', primary: true }, { to: '/score', label: 'Score' }, { to: '/teams', label: 'Teams' }, { to: '/leaderboard', label: 'Leaderboard' }],
    admin: [{ to: '/admin', label: 'Admin', primary: true }, { to: '/score', label: 'Score' }, ...base, { to: '/dashboard', label: 'My dashboard' }],
  };
  return byRole[role] || base;
}

export default function AppHeader({ right }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = user ? navForRole(user.role) : [{ to: '/tournaments', label: 'Tournaments' }, { to: '/leaderboard', label: 'Leaderboard' }];

  return (
    <header className="sticky top-0 z-30 border-b border-border-default bg-bg-page/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-5">
          <Link to="/" className="flex items-center gap-2" aria-label="GlobalVBC home">
            <span className="text-2xl" aria-hidden="true">🏐</span>
            <span className="font-display text-xl font-bold text-brand-500">GlobalVBC</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `min-h-[40px] rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-bg-elevated text-text-primary' : l.primary ? 'text-accent-400 hover:bg-bg-elevated' : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {right}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex min-h-[44px] items-center gap-2 rounded-lg px-2 hover:bg-bg-elevated"
              >
                <Avatar src={user.photo_url} name={user.name} size="sm" />
                <span className="hidden text-left text-sm md:block">
                  <span className="block font-semibold leading-tight">{user.name.split(' ')[0]}</span>
                  <span className="block text-[11px] leading-tight text-text-muted">{ROLE_LABELS[user.role] || user.role}</span>
                </span>
              </button>
              {open ? (
                <div role="menu" className="absolute right-0 mt-1 w-56 rounded-xl border border-border-default bg-bg-card p-1 shadow-elevated" onMouseLeave={() => setOpen(false)}>
                  {links.map((l) => (
                    <Link key={l.to} role="menuitem" to={l.to} onClick={() => setOpen(false)} className="block min-h-[40px] rounded-lg px-3 py-2 text-sm hover:bg-bg-elevated md:hidden">
                      {l.label}
                    </Link>
                  ))}
                  <Link role="menuitem" to={`/p/${user.id}`} onClick={() => setOpen(false)} className="block min-h-[40px] rounded-lg px-3 py-2 text-sm hover:bg-bg-elevated">
                    My public profile
                  </Link>
                  <Link role="menuitem" to="/onboarding" onClick={() => setOpen(false)} className="block min-h-[40px] rounded-lg px-3 py-2 text-sm hover:bg-bg-elevated">
                    Edit profile
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      logout();
                      setOpen(false);
                      navigate('/');
                    }}
                    className="block min-h-[40px] w-full rounded-lg px-3 py-2 text-left text-sm text-status-danger hover:bg-bg-elevated"
                  >
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link to="/login" className="min-h-[44px] px-2 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary">
                Sign in
              </Link>
              <Link to="/register" className="inline-flex min-h-[40px] items-center rounded-lg bg-accent-500 px-4 text-sm font-semibold text-white hover:bg-accent-400">
                Join
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
