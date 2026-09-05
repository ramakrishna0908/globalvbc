// End-to-end role workflows against the seeded backend: spectator, scorer,
// coach, organizer, admin. Creates its own ad-hoc match so the seeded live
// final is never touched.
import { test, expect } from '@playwright/test';
import { signIn, seedIds } from './helpers.js';

let ids;
test.beforeAll(async ({ request }) => {
  ids = await seedIds(request);
});

test.describe('spectator', () => {
  test('tournament → standings → bracket → live match', async ({ page }) => {
    await page.goto('/tournaments');
    await expect(page.getByRole('heading', { level: 1, name: 'Tournaments' })).toBeVisible();
    await page.getByRole('link', { name: ids.liveTournament.name }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: ids.liveTournament.name })).toBeVisible();
    await page.getByRole('tab', { name: 'Standings' }).click();
    await expect(page.getByRole('table').first()).toBeVisible();
    await page.getByRole('tab', { name: 'Bracket' }).click();
    await expect(page.getByText(/Final/).first()).toBeVisible();
    if (ids.live) {
      await page.goto(`/live/${ids.live.id}`);
      await expect(page.getByTestId('status-pill')).toHaveText(/live/i);
      await expect(page.getByTestId('score-A')).toBeVisible();
      await expect(page.getByTestId('recent-rallies')).toBeVisible();
    }
  });

  test('final result shows the winner clearly', async ({ page }) => {
    test.skip(!ids.submitted, 'no submitted match in seed');
    await page.goto(`/matches/${ids.submitted.id}`);
    await expect(page.getByText('Winner', { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('boxscore-A')).toBeVisible();
    await expect(page.getByTestId('sets-line')).toBeVisible();
  });
});

test.describe('scorer', () => {
  test('creates an ad-hoc match, scores points, undoes, and sees the live view update', async ({ page, request, browser }) => {
    await signIn(page, request, 'scorer');
    await page.goto('/score/new');
    await expect(page.getByRole('heading', { level: 1, name: 'New match' })).toBeVisible();
    // Team A / Team B: first two teams in each column
    const teamA = page.getByRole('group').filter({ hasText: '' }); // placeholder to keep locator API stable
    void teamA;
    const cols = page.locator('h3:has-text("Team A"), h3:has-text("Team B")');
    await expect(cols).toHaveCount(2);
    const colA = page.locator('h3:has-text("Team A") + div button').first();
    const colB = page.locator('h3:has-text("Team B") + div button').nth(1);
    await colA.click();
    await colB.click();
    const start = page.getByTestId('setup-start');
    await expect(start).toBeEnabled();
    await start.click();
    await page.getByTestId('start-match').click();
    await page.getByTestId('point-A').click();
    await expect(page.getByTestId('score-A')).toHaveText('1');
    await page.keyboard.press('b');
    await expect(page.getByTestId('score-B')).toHaveText('1');
    await page.getByTestId('undo').click();
    await expect(page.getByTestId('score-B')).toHaveText('0');
    // quick stat: two taps
    await page.getByTestId('action-dig').click();
    await page.getByTestId('player-grid-A').getByRole('button').first().click();
    await expect(page.getByText(/Dig recorded/)).toBeVisible();

    // spectator sees it
    const url = new URL(page.url());
    const matchId = url.pathname.split('/').pop();
    const ctx = await browser.newContext();
    const spectator = await ctx.newPage();
    await spectator.goto(`/live/${matchId}`);
    await expect(spectator.getByTestId('score-A')).toHaveText('1');
    await ctx.close();
  });
});

test.describe('coach', () => {
  test('sees my teams and the roster tools', async ({ page, request }) => {
    await signIn(page, request, 'coach');
    await page.goto('/teams?mine=1');
    await expect(page.getByRole('heading', { level: 1, name: 'My teams' })).toBeVisible();
    await page.getByRole('link', { name: /Austin Aces/ }).first().click();
    await expect(page.getByRole('region', { name: 'Add player' })).toBeVisible();
    await page.getByRole('tab', { name: 'Analytics' }).click();
    await expect(page.getByRole('columnheader', { name: /Pts/ })).toBeVisible();
  });
});

test.describe('organizer', () => {
  test('manage desk: registrations and schedule render with actions', async ({ page, request }) => {
    await signIn(page, request, 'organizer');
    await page.goto('/tournaments?mine=1');
    await expect(page.getByRole('heading', { level: 1, name: 'My tournaments' })).toBeVisible();
    await page.goto(`/tournaments/${ids.liveTournament.id}/manage`);
    await expect(page.getByText('Organizer desk')).toBeVisible();
    await page.getByRole('tab', { name: /Registrations/ }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await expect(page.getByRole('table').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Score' }).first()).toBeVisible();
  });
});

test.describe('admin', () => {
  test('overview tiles, users, matches and audit log', async ({ page, request }) => {
    await signIn(page, request, 'admin');
    await page.goto('/admin');
    await expect(page.getByText('Rating events')).toBeVisible();
    await page.getByRole('tab', { name: 'Matches' }).click();
    await expect(page.getByRole('link', { name: 'View' }).first()).toBeVisible();
    await page.getByRole('tab', { name: 'Audit log' }).click();
    await expect(page.getByRole('table')).toBeVisible();
  });
});
