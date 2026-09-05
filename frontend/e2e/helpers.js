// Shared helpers for the Playwright suites: API login + token injection.
export const API = process.env.E2E_API_URL || 'http://localhost:4000/api';
export const PASSWORD = 'volleyball123';
export const ACCOUNTS = {
  player: 'sarah.spiker@globalvbc.demo',
  scorer: 'jess.scorer@globalvbc.demo',
  coach: 'cara.coach@globalvbc.demo',
  organizer: 'ola.organizer@globalvbc.demo',
  admin: 'admin@globalvbc.demo',
};

export async function apiLogin(request, role) {
  const res = await request.post(`${API}/auth/login`, { data: { email: ACCOUNTS[role], password: PASSWORD } });
  if (!res.ok()) throw new Error(`login failed for ${role}: ${res.status()}`);
  return (await res.json()).token;
}

/** Inject the JWT the same way the app stores it, before any navigation. */
export async function signIn(page, request, role, theme = 'dark') {
  const token = await apiLogin(request, role);
  await page.addInitScript(
    ({ token, theme }) => {
      localStorage.setItem('gvbc-token', token);
      localStorage.setItem('gvbc-theme', theme);
    },
    { token, theme }
  );
  return token;
}

export async function setTheme(page, theme) {
  await page.addInitScript((t) => localStorage.setItem('gvbc-theme', t), theme);
}

export async function seedIds(request) {
  const matches = (await (await request.get(`${API}/matches?limit=200`)).json()).matches;
  const tournaments = (await (await request.get(`${API}/tournaments`)).json()).tournaments;
  const teams = (await (await request.get(`${API}/teams`)).json()).teams;
  return {
    live: matches.find((m) => m.status === 'live'),
    submitted: matches.find((m) => m.status === 'submitted'),
    scheduled: matches.find((m) => m.status === 'scheduled'),
    liveTournament: tournaments.find((t) => t.status === 'live') || tournaments[0],
    tournaments,
    teams,
  };
}

/** True when the document is wider than the viewport (horizontal overflow). */
export async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

/** Elements whose right edge lies beyond the viewport — for debugging overflow. */
export async function overflowReport(page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > w + 1 && !el.closest('.table-wrap, [tabindex="0"][role="region"]') && getComputedStyle(el).position !== 'fixed')
      .slice(0, 8)
      .map((el) => `${el.tagName}.${String(el.className).slice(0, 60)} right=${Math.round(el.getBoundingClientRect().right)}`);
  });
}
