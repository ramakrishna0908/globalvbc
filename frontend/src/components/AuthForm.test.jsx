import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import AuthForm, { postLoginPath, postRegisterPath } from './AuthForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

function renderForm(mode, path = `/${mode}`, auth = {}) {
  useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn(), login: vi.fn(), register: vi.fn(), ...auth });
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<AuthForm mode="login" />} />
          <Route path="/register" element={<AuthForm mode="register" />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('AuthForm (register)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows four selectable role cards with Player selected by default', () => {
    renderForm('register');
    const cards = screen.getAllByRole('button', { pressed: false }).concat(screen.getAllByRole('button', { pressed: true }));
    expect(cards).toHaveLength(4);
    expect(screen.getByTestId('role-player')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('role-scorer')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('role-admin')).not.toBeInTheDocument();
  });

  it('preselects the role from ?role= and submits it, then redirects by role', async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue({ id: 1, name: 'Sam', role: 'scorer', profile_complete: false });
    renderForm('register', '/register?role=scorer', { register });

    expect(screen.getByTestId('role-scorer')).toHaveAttribute('aria-pressed', 'true');

    await user.type(screen.getByLabelText('Name'), 'Sam Scorer');
    await user.type(screen.getByLabelText('Email'), 'sam@example.com');
    await user.type(screen.getByLabelText(/Password/), 'password123');
    await user.click(screen.getByRole('button', { name: /Create Scorer account/ }));

    expect(register).toHaveBeenCalledWith({ name: 'Sam Scorer', email: 'sam@example.com', password: 'password123', role: 'scorer' });
    expect(await screen.findByTestId('location')).toHaveTextContent('/score');
  });

  it('lets the user pick a different role card', async () => {
    const user = userEvent.setup();
    const register = vi.fn().mockResolvedValue({ id: 2, name: 'Olga', role: 'organizer' });
    renderForm('register', '/register', { register });

    await user.click(screen.getByTestId('role-organizer'));
    expect(screen.getByTestId('role-organizer')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('role-player')).toHaveAttribute('aria-pressed', 'false');

    await user.type(screen.getByLabelText('Name'), 'Olga Org');
    await user.type(screen.getByLabelText('Email'), 'olga@example.com');
    await user.type(screen.getByLabelText(/Password/), 'password123');
    await user.click(screen.getByRole('button', { name: /Create Organizer account/ }));

    expect(register).toHaveBeenCalledWith(expect.objectContaining({ role: 'organizer' }));
    expect(await screen.findByTestId('location')).toHaveTextContent('/tournaments/new');
  });
});

describe('AuthForm (login)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the forgot-password link and no role picker', () => {
    renderForm('login');
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByTestId('role-player')).not.toBeInTheDocument();
  });

  it('redirects by role after sign in', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockResolvedValue({ id: 3, name: 'Ada', role: 'admin' });
    renderForm('login', '/login', { login });
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(login).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'password123' });
    expect(await screen.findByTestId('location')).toHaveTextContent('/admin');
  });

  it('shows the server error message', async () => {
    const user = userEvent.setup();
    const login = vi.fn().mockRejectedValue({ response: { data: { error: 'Invalid email or password' } } });
    renderForm('login', '/login', { login });
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'wrongpass1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});

describe('redirect helpers', () => {
  it('postRegisterPath', () => {
    expect(postRegisterPath({ role: 'scorer' })).toBe('/score');
    expect(postRegisterPath({ role: 'organizer' })).toBe('/tournaments/new');
    expect(postRegisterPath({ role: 'coach' })).toBe('/teams?mine=1');
    expect(postRegisterPath({ role: 'player', profile_complete: false })).toBe('/onboarding');
    expect(postRegisterPath({ role: 'player', profile_complete: true })).toBe('/dashboard');
  });
  it('postLoginPath', () => {
    expect(postLoginPath({ role: 'player' }, '/teams/4')).toBe('/teams/4');
    expect(postLoginPath({ role: 'scorer' })).toBe('/score');
    expect(postLoginPath({ role: 'organizer' })).toBe('/tournaments?mine=1');
    expect(postLoginPath({ role: 'admin' })).toBe('/admin');
    expect(postLoginPath({ role: 'coach' })).toBe('/teams?mine=1');
    expect(postLoginPath({ role: 'player' })).toBe('/dashboard');
  });
});
