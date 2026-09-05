import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import ResetPassword from './ResetPassword.jsx';
import { authApi } from '../api/endpoints.js';
import { setToken } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../api/endpoints.js', () => ({ authApi: { reset: vi.fn() } }));
vi.mock('../api/client.js', () => ({ setToken: vi.fn(), getToken: vi.fn() }));

function Probe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

function renderPage(path, setUser = vi.fn()) {
  useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn(), setUser });
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('ResetPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('explains a missing token', () => {
    renderPage('/reset-password');
    expect(screen.getByRole('alert')).toHaveTextContent(/missing its token/);
    expect(screen.getByRole('link', { name: /Request a new reset link/ })).toHaveAttribute('href', '/forgot-password');
  });

  it('resets, stores the session and redirects to the dashboard', async () => {
    const user = userEvent.setup();
    const setUser = vi.fn();
    authApi.reset.mockResolvedValue({ user: { id: 1, name: 'Maya', role: 'player' }, token: 'jwt-1' });
    renderPage('/reset-password?token=abc123', setUser);
    await user.type(screen.getByLabelText(/New password/), 'password123');
    await user.type(screen.getByLabelText(/Confirm password/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(authApi.reset).toHaveBeenCalledWith({ token: 'abc123', password: 'password123' });
    expect(setToken).toHaveBeenCalledWith('jwt-1');
    expect(setUser).toHaveBeenCalledWith({ id: 1, name: 'Maya', role: 'player' });
    expect(await screen.findByTestId('location')).toHaveTextContent('/dashboard');
  });

  it('surfaces an invalid/expired token error', async () => {
    const user = userEvent.setup();
    authApi.reset.mockRejectedValue({ response: { data: { error: 'Reset link is invalid or has expired' } } });
    renderPage('/reset-password?token=stale');
    await user.type(screen.getByLabelText(/New password/), 'password123');
    await user.type(screen.getByLabelText(/Confirm password/), 'password123');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reset link is invalid or has expired');
  });
});
