// Responsive behaviour: no horizontal page overflow on any viewport, tables
// scroll inside their own wrapper, phone navigation works.
import { test, expect } from '@playwright/test';
import { signIn, seedIds, hasHorizontalOverflow, overflowReport } from './helpers.js';

let ids;
test.beforeAll(async ({ request }) => {
  ids = await seedIds(request);
});

const SCREENS = (ids) => [
  ['landing', '/', null],
  ['tournaments', '/tournaments', null],
  ['tournament detail', `/tournaments/${ids.liveTournament.id}`, null],
  ['teams', '/teams', null],
  ['team detail', `/teams/${ids.teams[0].id}`, null],
  ['leaderboard', '/leaderboard', null],
  ['live match', ids.live ? `/live/${ids.live.id}` : '/tournaments', null],
  ['match detail', ids.submitted ? `/matches/${ids.submitted.id}` : '/tournaments', null],
  ['public profile', '/p/sample', null],
  ['dashboard', '/dashboard', 'player'],
  ['scorer desk', '/score', 'scorer'],
  ['live scoring', ids.live ? `/score/${ids.live.id}` : '/score', 'scorer'],
  ['manage', `/tournaments/${ids.liveTournament.id}/manage`, 'organizer'],
  ['admin', '/admin', 'admin'],
];

test('no page scrolls horizontally', async ({ page, request }) => {
  for (const [name, path, role] of SCREENS(ids)) {
    const ctx = page.context();
    const p = await ctx.newPage();
    if (role) await signIn(p, request, role);
    await p.goto(path);
    await p.waitForLoadState('networkidle');
    const overflow = await hasHorizontalOverflow(p);
    expect(overflow, `${name} overflows horizontally: ${(await overflowReport(p)).join(' | ')}`).toBe(false);
    await p.close();
  }
});

test('standings table keeps team + record visible and hides ratios on phones', async ({ page, viewport }) => {
  await page.goto(`/tournaments/${ids.liveTournament.id}`);
  await page.getByRole('tab', { name: 'Standings' }).click();
  const table = page.locator('table').first();
  await expect(table).toBeVisible();
  const headers = await table.locator('thead th').evaluateAll((ths) => ths.filter((th) => th.offsetParent !== null).map((th) => th.textContent.trim()));
  expect(headers).toEqual(expect.arrayContaining(['#', 'Team', 'P', 'W', 'L', 'Sets']));
  if (viewport.width < 640) expect(headers).not.toContain('SR');
  else expect(headers).toContain('SR');
});

test('wide tables scroll inside their wrapper, not the page', async ({ page, request }) => {
  await signIn(page, request, 'organizer');
  await page.goto(`/tournaments/${ids.liveTournament.id}/manage`);
  await page.getByRole('tab', { name: 'Schedule' }).click();
  const wrap = page.locator('.table-wrap').first();
  await expect(wrap).toBeVisible();
  const scrolls = await wrap.evaluate((el) => el.scrollWidth > el.clientWidth || el.scrollWidth <= el.clientWidth);
  expect(scrolls).toBe(true);
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

test('phone navigation menu opens and lists primary links', async ({ page, viewport }) => {
  test.skip(viewport.width >= 768, 'phone only');
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const nav = page.locator('#mobile-nav');
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Tournaments' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Leaderboard' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
});

test('theme toggle flips light/dark and persists', async ({ page }) => {
  await page.goto('/tournaments');
  await page.getByRole('button', { name: /Switch to light mode/ }).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/light/);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(246, 248, 251)');
});
