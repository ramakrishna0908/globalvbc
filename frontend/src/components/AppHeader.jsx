import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle.jsx';
import Avatar from './Avatar.jsx';
import Button from './Button.jsx';
import Icon from './ui/Icon.jsx';
import Logo from './ui/Logo.jsx';
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

const PUBLIC_LINKS = [
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/teams', label: 'Teams' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

/** Closes a popover on Escape or an outside click. */
function useDismiss(open, setOpen, ref) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open, setOpen, ref]);
}

function navClass({ isActive }, primary) {
  return `relative inline-flex min-h-11 items-center px-3 font-display text-[15px] font-bold uppercase tracking-wide transition-colors after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-full after:transition-colors ${
    isActive ? 'text-text-primary after:bg-brand-400' : primary ? 'text-accent-400 after:bg-transparent hover:text-text-primary' : 'text-text-secondary after:bg-transparent hover:text-text-primary hover:after:bg-border-strong'
  }`;
}

export default function AppHeader({ right }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef(null);
  const navRef = useRef(null);
  useDismiss(menuOpen, setMenuOpen, menuRef);
  useDismiss(navOpen, setNavOpen, navRef);
  useEffect(() => {
    setMenuOpen(false);
    setNavOpen(false);
  }, [location.pathname, location.search]);

  const links = user ? navForRole(user.role) : PUBLIC_LINKS;

  return (
    <header className="sticky top-0 z-30 border-b border-border-default bg-bg-page/90 backdrop-blur supports-[backdrop-filter]:bg-bg-page/80">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2 md:gap-6">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-elevated hover:text-text-primary md:hidden"
            aria-label={navOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={navOpen}
            aria-controls="mobile-nav"
            onClick={() => setNavOpen((v) => !v)}
          >
            <Icon name={navOpen ? 'x' : 'menu'} size={22} />
          </button>
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={(s) => navClass(s, l.primary)}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {right}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Account menu for ${user.name}`}
                className="flex min-h-11 items-center gap-2 rounded-md px-1.5 hover:bg-bg-elevated"
              >
                <Avatar src={user.photo_url} name={user.name} size="sm" />
                <span className="hidden text-left md:block">
                  <span className="block text-sm font-bold leading-tight">{user.name.split(' ')[0]}</span>
                  <span className="block text-2xs font-semibold uppercase tracking-wider text-text-muted">{ROLE_LABELS[user.role] || user.role}</span>
                </span>
                <Icon name="chevronDown" size={16} className="hidden text-text-muted md:block" />
              </button>
              {menuOpen ? (
                <div role="menu" aria-label="Account" className="absolute right-0 mt-1 w-60 rounded-lg border border-border-default bg-bg-card p-1.5 shadow-elevated">
                  <div className="border-b border-border-default px-3 py-2 md:hidden">
                    <div className="text-sm font-bold">{user.name}</div>
                    <div className="text-2xs font-semibold uppercase tracking-wider text-text-muted">{ROLE_LABELS[user.role] || user.role}</div>
                  </div>
                  <Link role="menuitem" to={`/p/${user.id}`} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:bg-bg-elevated">
                    <Icon name="share" size={16} className="text-text-muted" /> My public profile
                  </Link>
                  <Link role="menuitem" to="/onboarding" className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:bg-bg-elevated">
                    <Icon name="edit" size={16} className="text-text-muted" /> Edit profile
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                      navigate('/');
                    }}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-semibold text-status-danger hover:bg-bg-elevated"
                  >
                    <Icon name="arrowLeft" size={16} /> Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <Link to="/login" className="hidden min-h-11 items-center px-3 font-display text-[15px] font-bold uppercase tracking-wide text-text-secondary hover:text-text-primary sm:inline-flex">
                Sign in
              </Link>
              <Button to="/register" size="md">
                Join
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile navigation sheet */}
      <div id="mobile-nav" ref={navRef} hidden={!navOpen} className="border-t border-border-default bg-bg-page md:hidden">
        <nav aria-label="Primary" className="mx-auto max-w-7xl px-2 py-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => `flex min-h-12 items-center justify-between rounded-md px-3 font-display text-base font-bold uppercase tracking-wide ${isActive ? 'bg-bg-elevated text-text-primary' : l.primary ? 'text-accent-400' : 'text-text-secondary'}`}
            >
              {l.label}
              <Icon name="chevronRight" size={18} className="text-text-muted" />
            </NavLink>
          ))}
          {!user ? (
            <NavLink to="/login" className="flex min-h-12 items-center rounded-md px-3 font-display text-base font-bold uppercase tracking-wide text-text-secondary">
              Sign in
            </NavLink>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
