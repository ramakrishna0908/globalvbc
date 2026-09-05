import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import ForgotPassword from './ForgotPassword.jsx';
import { authApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../api/endpoints.js', () => ({ authApi: { forgot: vi.fn() } }));

function renderPage() {
  useAuth.mockReturnValue({ user: null, loading: false, logout: vi.fn() });
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPassword />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('ForgotPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submits the email and shows the neutral confirmation', async () => {
    const user = userEvent.setup();
    authApi.forgot.mockResolvedValue({ ok: true });
    renderPage();
    await user.type(screen.getByLabelText('Email'), 'maya@example.com');
    await user.click(screen.getByRole('button', { name: 'Create reset link' }));
    expect(authApi.forgot).toHaveBeenCalledWith('maya@example.com');
    expect(await screen.findByText('If an account exists, a reset link has been created.')).toBeInTheDocument();
    expect(screen.queryByTestId('dev-reset-link')).not.toBeInTheDocument();
  });

  it('shows the dev reset link when the API exposes a token', async () => {
    const user = userEvent.setup();
    authApi.forgot.mockResolvedValue({ ok: true, devResetToken: 'abc123' });
    renderPage();
    await user.type(screen.getByLabelText('Email'), 'maya@example.com');
    await user.click(screen.getByRole('button', { name: 'Create reset link' }));
    const link = await screen.findByTestId('dev-reset-link');
    expect(link).toHaveAttribute('href', '/reset-password?token=abc123');
    expect(screen.getByText(/Email delivery is not configured in this environment/)).toBeInTheDocument();
  });
});
