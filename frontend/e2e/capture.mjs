// Screenshot capture for the design audit: every major screen, per role, at
// phone / tablet / desktop widths. Usage:
//
//   node e2e/capture.mjs docs/design/screenshots/after [http://localhost:5173]
//
// Requires the backend (:4000, seeded with `npm run seed`) and the Vite dev
// server (:5173) to be running. Logs in through the real API and injects the
// JWT the same way the app stores it (localStorage `gvbc-token`).
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve(process.argv[2] || 'screenshots');
const base = process.argv[3] || 'http://localhost:5173';
const api = process.env.API_URL || 'http://localhost:4000/api';
const PASSWORD = 'volleyball123';

const ROLES = {
  public: null,
  player: 'sarah.spiker@globalvbc.demo',
  scorer: 'jess.scorer@globalvbc.demo',
  coach: 'cara.coach@globalvbc.demo',
  organizer: 'ola.organizer@globalvbc.demo',
  admin: 'admin@globalvbc.demo',
};

const VIEWPORTS = {
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 900 },
};

async function login(email) {
  const res = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status}`);
  return (await res.json()).token;
}

async function json(url) {
  const res = await fetch(`${api}${url}`);
  return res.json();
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const { matches } = await json('/matches?limit=200');
  const live = matches.find((m) => m.status === 'live');
  const submitted = matches.find((m) => m.status === 'submitted');
  const scheduled = matches.find((m) => m.status === 'scheduled');
  const { tournaments } = await json('/tournaments');
  const liveT = tournaments.find((t) => t.status === 'live') || tournaments[0];
  const { teams } = await json('/teams');
  const team = teams[0];

  const SCREENS = [
    ['public', 'landing', '/'],
    ['public', 'login', '/login'],
    ['public', 'register', '/register'],
    ['public', 'tournaments', '/tournaments'],
    ['public', 'tournament-detail', `/tournaments/${liveT.id}`],
    ['public', 'tournament-standings', `/tournaments/${liveT.id}?tab=standings`],
    ['public', 'tournament-bracket', `/tournaments/${liveT.id}?tab=bracket`],
    ['public', 'teams', '/teams'],
    ['public', 'team-detail', `/teams/${team.id}`],
    ['public', 'leaderboard', '/leaderboard'],
    live && ['public', 'live-match', `/live/${live.id}`],
    submitted && ['public', 'match-detail-final', `/matches/${submitted.id}`],
    scheduled && ['public', 'match-detail-scheduled', `/matches/${scheduled.id}`],
    ['public', 'public-profile', '/p/sample'],
    ['public', 'not-found', '/nope'],
    ['player', 'dashboard', '/dashboard'],
    ['player', 'onboarding', '/onboarding'],
    ['scorer', 'scorer-dashboard', '/score'],
    live && ['scorer', 'live-scoring', `/score/${live.id}`],
    ['scorer', 'match-setup', '/score/new'],
    ['coach', 'my-teams', '/teams?mine=1'],
    ['organizer', 'my-tournaments', '/tournaments?mine=1'],
    ['organizer', 'tournament-manage', `/tournaments/${liveT.id}/manage`],
    ['organizer', 'tournament-new', '/tournaments/new'],
    ['admin', 'admin', '/admin'],
  ].filter(Boolean);

  const tokens = {};
  for (const [role, email] of Object.entries(ROLES)) if (email) tokens[role] = await login(email);

  const browser = await chromium.launch();
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      for (const [role, name, route] of SCREENS) {
        const page = await context.newPage();
        await page.addInitScript(
          ({ token, theme }) => {
            if (token) localStorage.setItem('gvbc-token', token);
            else localStorage.removeItem('gvbc-token');
            localStorage.setItem('gvbc-theme', theme);
          },
          { token: tokens[role] || null, theme }
        );
        await page.goto(base + route, { waitUntil: 'networkidle' });
        // tab query param is only a hint for the capture: click the tab if present
        const tab = new URL(base + route).searchParams.get('tab');
        if (tab) {
          const t = page.getByRole('tab', { name: new RegExp(`^${tab}`, 'i') });
          if (await t.count()) {
            await t.first().click();
            await page.waitForLoadState('networkidle');
          }
        }
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(outDir, `${name}--${role}--${vpName}--${theme}.png`), fullPage: true });
        await page.close();
      }
      await context.close();
    }
  }
  await browser.close();
  console.log(`captured ${SCREENS.length} screens × ${Object.keys(VIEWPORTS).length} viewports × 2 themes → ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
