# UI audit & redesign report — 2026-09-05

Scope: every user-facing page of the GlobalVBC frontend (25 screens × phone/tablet/desktop
× dark/light). Before/after captures live in `docs/design/screenshots/{before,after}/`
(`<screen>--<role>--<viewport>--<theme>.png`), produced by `frontend/e2e/capture.mjs`.

## 1. Audit findings (prioritised)

| # | Severity | Finding | Where | Fix |
|---|---|---|---|---|
| 1 | High | Serif display face (Playfair) with old-style numerals used for live scores and stats; hard to scan at a glance and reads editorial, not sports | Scoreboard, stat tiles, all headings | Barlow Condensed display + Barlow body with tabular lining figures |
| 2 | High | LIVE pill was white on translucent red (2.9:1) in dark mode; gold text (`#A0701A`) 4.4:1 in light mode | pills, ratings, team-B names | Solid `status-live` fill; light gold darkened to `#855B10`; ink on gold fills dark in both themes |
| 3 | High | Four separate status-pill implementations with different labels/colours (tournament, match, registration, live view, profile) | tournamentUi, MatchCard, LiveMatch, PublicProfile | One `StatusBadge` vocabulary (19 states) |
| 4 | High | Standings / leaderboard / box-score tables clipped or forced 520–900px scroll on phones; no sticky identity column | tables everywhere | `TableWrap` with focusable scroll region, sticky first column, tie-break columns hidden below `sm`, secondary leaderboard columns collapse into the player cell |
| 5 | High | Record-match modal was a plain div (no role, focus trap, Escape) | Dashboard | `Dialog` primitive |
| 6 | High | Tab strips lacked arrow-key navigation and `aria-controls` | 6 pages | `Tabs`/`TabPanel` WAI-ARIA pattern |
| 7 | Medium | Signed-out phone users had no navigation at all; account menu had no Escape/outside-click close | AppHeader | Mobile nav sheet, dismiss hook, skip link |
| 8 | Medium | Warm brown surfaces + stray violet tertiary + gradient text/blobs on landing and violet CTA band | tokens, Landing, dashboard tiles | Court-navy neutrals, violet removed, flat colour blocks and court-line texture |
| 9 | Medium | Winners not visually distinct in results; live cards did not show running set score | MatchCard, Bracket, MatchDetail | Winner check + bold, loser dimmed, sets + running score, big result block with team colour bars |
| 10 | Medium | 31 hand-rolled eyebrow labels, 91 `min-h-[44px]` overrides, 60 `text-[11px]`, hardcoded chart colours that ignored the theme | everywhere | `.eyebrow`, `min-h-11`, `text-2xs`, `useChartTheme()` |
| 11 | Medium | Emoji used as functional icons (📅 📍 🏆 ⏱ 🔁 …) — inconsistent across platforms, unlabeled | many | 40-icon inline SVG set, decorative by default |
| 12 | Medium | Serving team / timeouts only shown as text in the scorer strip; live view lacked timeouts | LiveScoring, LiveMatch | Ball icon + accessible label on the serving team, timeout pips per team on court cards, format line on live view |
| 13 | Low | Loading states were spinners only; no skeletons; no pagination on long result lists | lists | `LoadingBlock variant="cards|table|text"`, `LoadMore` on tournament results |
| 14 | Low | Team header and stat cards squeezed on phones; standings had no qualification marker | TeamDetail, StandingsTable | Stacked header, `advance` prop → Q chips and "top N advance" note |
| 15 | Low | Chrome for Android zoomed the admin page out because wide form-control tables inside a scroller widened the minimum-scale viewport | Admin users table | `contain: layout` on `.table-wrap` (found by the responsive e2e test) |

## 2. Implementation order

1. Tokens, fonts, Tailwind config, component classes (`index.css`, `tailwind.config.js`, `index.html`).
2. Primitives: Button, Card, Field, Tabs, Table, Alert, Dialog, Skeleton, StatusBadge, Icon, Logo, Section, FilterChips, LoadMore, Loading, EmptyState, StatCard, Avatar, Toast, AppHeader, PageShell.
3. Volleyball components: Scoreboard, PointButton, QuickActionBar, PlayerGrid, RallyTimeline, ConnectionStatus, UndoControl, MatchCard, StandingsTable, Bracket.
4. Pages (all 25): Landing + sections, auth (login/register/forgot/reset), onboarding, dashboard (+9 widgets), public profile, tournaments list/detail/new/manage, teams list/detail, leaderboard, live match, match detail, scorer desk, match setup, live scoring, admin, not-found, protected-route 403.
5. Tests, screenshots, docs.

## 3. Verification

| Suite | Command | Result |
|---|---|---|
| Engine unit tests | `npm run test:engine` (root) | 35 passed |
| Frontend component tests (vitest + Testing Library) | `cd frontend && npm test` | 72 passed (16 new: StatusBadge, Tabs keyboard, Dialog, Alert/Field, Table, MatchCard, StandingsTable, Icon) |
| Accessibility (axe-core WCAG 2.2 AA, both themes, all roles) | `cd frontend && npm run test:e2e` → `e2e/a11y.spec.js` | 23 × 2 projects passed, 0 serious/critical violations |
| Responsive (no horizontal overflow on 14 screens, standings column priority, table scroll containment, phone nav, theme persistence) | `e2e/responsive.spec.js` | passed on desktop 1440 and Pixel 7 |
| Role workflows (spectator → standings → bracket → live; scorer creates match, scores, undoes, quick stat, spectator sees it; coach roster tools; organizer desk; admin console) | `e2e/workflows.spec.js` | passed |
| Production build | `npm run build` | ok (bundle unchanged in shape; recharts dominates the main chunk as before) |
| Console errors during capture | Browser pane | none |

## 4. Remaining risks / intentional trade-offs

* **Logo rendering changed from emoji to SVG.** The mark (ball + wordmark) and gold colour are preserved, but it is no longer the platform emoji glyph. Revert by swapping `BallMark` for the emoji in `ui/Logo.jsx` if the brand owner objects.
* **Light-mode gold is darker** (`#855B10`) than the dark-mode gold to reach 4.5:1 on white; the two themes therefore do not share the exact same hue value.
* **Scorer-picker popover in the schedule table** opens inside the table's scroll region (as before); on very short viewports the list may need scrolling inside the table. A follow-up could move it into `Dialog`.
* **Bundle size warning** (main chunk > 500 kB) pre-dates this work; recharts and the scorer path are in the entry chunk by design.
* **Playwright is a new devDependency** (`@playwright/test`, `@axe-core/playwright`) used only for tests and captures; no runtime dependencies were added.
* Team logos in match rows use the colour bar rather than the crest because the matches API does not include logo URLs; the team pages and registration lists show crests.
