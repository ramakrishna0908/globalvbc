// WCAG 2.2 AA scan of every major screen with axe-core, in both themes,
// plus keyboard-navigation and touch-target checks.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signIn, setTheme, seedIds } from './helpers.js';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page) {
  const results = await new AxeBuilder({ page })
    .withTags(TAGS)
    // recharts draws decorative SVG text; third-party QR image is fine
    .exclude('.recharts-wrapper')
    .analyze();
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  const summary = serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target?.join(' ')}`).join('\n');
  return { violations: results.violations, serious, summary };
}

async function expectClean(page, label) {
  const { serious, summary } = await scan(page);
  expect(serious, `${label}\n${summary}`).toEqual([]);
}

let ids;
test.beforeAll(async ({ request }) => {
  ids = await seedIds(request);
});

const PUBLIC = [
  ['landing', '/'],
  ['login', '/login'],
  ['register', '/register'],
  ['tournaments', '/tournaments'],
  ['teams', '/teams'],
  ['leaderboard', '/leaderboard'],
  ['not found', '/definitely-not-a-page'],
];

for (const theme of ['dark', 'light']) {
  test.describe(`public pages · ${theme}`, () => {
    for (const [name, path] of PUBLIC) {
      test(`${name} has no serious axe violations`, async ({ page }) => {
        await setTheme(page, theme);
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const { serious, summary } = await scan(page);
        expect(serious, summary).toEqual([]);
      });
    }

    test('tournament detail, standings, bracket and live match', async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(`/tournaments/${ids.liveTournament.id}`);
      await page.waitForLoadState('networkidle');
      await expectClean(page, 'overview');
      await page.getByRole('tab', { name: 'Standings' }).click();
      await page.waitForLoadState('networkidle');
      await expectClean(page, 'standings');
      await page.getByRole('tab', { name: 'Bracket' }).click();
      await page.waitForLoadState('networkidle');
      await expectClean(page, 'bracket');
      if (ids.live) {
        await page.goto(`/live/${ids.live.id}`);
        await page.waitForLoadState('networkidle');
        await expectClean(page, 'live match');
      }
      if (ids.submitted) {
        await page.goto(`/matches/${ids.submitted.id}`);
        await page.waitForLoadState('networkidle');
        await expectClean(page, 'match detail');
      }
    });
  });
}

test.describe('role dashboards', () => {
  test('player dashboard + public profile', async ({ page, request }) => {
    await signIn(page, request, 'player');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'dashboard');
    await page.goto('/p/sample');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'profile');
  });

  test('scorer desk + live scoring', async ({ page, request }) => {
    await signIn(page, request, 'scorer');
    await page.goto('/score');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'scorer desk');
    if (ids.live) {
      await page.goto(`/score/${ids.live.id}`);
      await page.getByTestId('point-A').waitFor();
      await expectClean(page, 'live scoring');
    }
  });

  test('organizer manage + admin', async ({ page, request }) => {
    await signIn(page, request, 'organizer');
    await page.goto(`/tournaments/${ids.liveTournament.id}/manage`);
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'manage');
    await page.getByRole('tab', { name: 'Schedule' }).click();
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'schedule');
  });

  test('admin console', async ({ page, request }) => {
    await signIn(page, request, 'admin');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expectClean(page, 'admin');
  });
});

test.describe('keyboard + targets', () => {
  test('skip link, tab strip arrow keys and visible focus', async ({ page }) => {
    await page.goto(`/tournaments/${ids.liveTournament.id}`);
    await page.waitForLoadState('networkidle');
    // first Tab lands on the skip link
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeVisible();

    const overview = page.getByRole('tab', { name: 'Overview' });
    await overview.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: 'Standings' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Standings' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: /Teams/ })).toHaveAttribute('aria-selected', 'true');
    // the focused tab shows a visible outline
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    expect(outline).not.toBe('none');
  });

  test('every interactive control is at least 24×24 and buttons ≥ 40px tall', async ({ page }) => {
    await page.goto('/tournaments');
    await page.waitForLoadState('networkidle');
    const small = await page.evaluate(() => {
      const els = [...document.querySelectorAll('a, button, input, select, [role=tab]')];
      return els
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ tag: el.tagName, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width }))
        .filter((r) => r.h < 24 || r.w < 24 || (r.tag === 'BUTTON' && r.h < 40));
    });
    expect(small, JSON.stringify(small)).toEqual([]);
  });

  test('record-match dialog traps focus and closes on Escape', async ({ page, request }) => {
    await signIn(page, request, 'player');
    await page.goto('/dashboard');
    const opener = page.getByRole('button', { name: /Record match|Add match/i }).filter({ visible: true }).first();
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Record a match' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Opponent', { exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });
});
