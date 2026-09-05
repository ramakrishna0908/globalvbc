# GlobalVBC design system

Single source of truth for how the product looks. Everything here is implemented
in `frontend/src/index.css` (tokens + component classes), `frontend/tailwind.config.js`
(utility names) and `frontend/src/components/**` (React primitives). Pages compose
these; they do not invent one-off styles.

## 1. Identity

**Direction:** broadcast scoreboard meets tournament desk. Condensed, uppercase display
type for names and numbers; calm neutral surfaces; one saturated action colour; the
FIVB blue/yellow pair for the two sides of every match; gold reserved for the things a
player earns (rating, champion, MVP, captain).

**Logo:** the existing volleyball + "GlobalVBC" wordmark is kept. The ball is now an
inline SVG (`components/ui/Logo.jsx`) tinted with the brand gold so it renders the same
on every platform; the wordmark is set in the display face with "VBC" in gold.

## 2. Typography

| Role | Family | Weights | Where |
|---|---|---|---|
| Display | **Barlow Condensed** | 600 / 700 / 800 | Headings, team names, scores, stat values, buttons, tabs, badges |
| Body | **Barlow** | 400 / 500 / 600 / 700 | Paragraphs, table cells, form controls |
| Mono | IBM Plex Mono | 400 / 500 | Timestamps, bracket keys, audit JSON |

Loaded from Google Fonts in `index.html` with `display=swap`; every stack has a real
fallback (`Arial Narrow`, `Helvetica Neue`, `Consolas`).

Scale (Tailwind keys): `2xs` 11px · `xs` 12 · `sm` 14 · base 15 (body) · `lg` 18 ·
`xl` 20 · `2xl` 24 · `display-sm` 28 · `display-md` clamp(32–48) · `display-lg`
clamp(40–68) · `score-sm` clamp(48–72) · `score` clamp(72–144).

Numbers always use tabular lining figures (`.tabular-nums`, applied to all table cells and
`.num-display`). Uppercase display text uses slight positive tracking; eyebrows use
`tracking-[0.18em]`.

Utility classes: `.eyebrow` (section label), `.num-display` (big number), `.link`.

## 3. Colour tokens

All colours are CSS variables holding `R G B` triplets so Tailwind utilities accept
opacity (`bg-status-live/15`). Dark is the default; `.light` on `<html>` flips.

| Token | Dark | Light | Use |
|---|---|---|---|
| `bg-page` | `#0A0F1A` | `#F6F8FB` | Page |
| `bg-surface` | `#0F1626` | `#F0F4F9` | Table heads, inputs, wells |
| `bg-card` | `#141C2E` | `#FFFFFF` | Cards |
| `bg-elevated` | `#1E2942` | `#E2E8F0` | Chips, hover rows |
| `text-primary` | `#F3F6FB` | `#0F172A` | |
| `text-secondary` | `#CBD4E4` | `#1E293B` | |
| `text-muted` | `#8F9EBC` (6.9:1) | `#475569` (7.6:1) | Labels, meta |
| `border-default` / `border-strong` | surface-200 / 300 | | |
| `accent-500` | `#2563EB` | `#2563EB` | Primary buttons, links (`accent-400` for text on dark) |
| `brand-400/500` | `#D4A23E` / `#C08A22` | `#855B10` / `#B07A1A` | Rating, champion, captain, gold CTA |
| `team-a` / `team-b` | `#3B82F6` / `#E8C06A` | `#2563EB` / `#855B10` | Side A / side B everywhere |
| `team-*-solid` + `team-*-ink` | fills that carry text (point buttons) | | |
| `status-live` | `#E11D48` | `#BE123C` | Solid LIVE fill, white text |
| `status-success / warning / danger` | text-safe on page | | Tinted badges, deltas |
| `status-danger-solid / success-solid` | | | Destructive / confirm fills |

Contrast was verified with axe-core (WCAG 2.2 AA tags) on every screen in both themes;
see `frontend/e2e/a11y.spec.js`. Notable decisions: gold text in light mode is
`#855B10` (5.5:1 on white); ink on gold fills is dark in both themes; LIVE is a solid
rose fill so white text passes (the old translucent red failed at 2.9:1).

## 4. Shape, depth, spacing, breakpoints

* Radii: `sm` 6 · `md` 10 · `lg` 14 · `xl` 20 (CSS vars, Tailwind `rounded-*`).
* Shadows: `shadow-card` (hairline), `shadow-elevated` (menus, toasts), `shadow-glow-accent` (hero CTA only).
* Spacing: Tailwind 4px scale; cards pad `p-4 md:p-5`; page gutter `px-4`; content max `max-w-6xl`, data-dense pages `max-w-7xl`.
* Touch targets: `min-h-11` (44px) on every button, tab, nav link and input; `sm` buttons are 40px (still above WCAG 2.5.8's 24px).
* Breakpoints: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280.
* Motion: `animate-fade-up` (hero), `animate-score-pop` (score change), `animate-toast-in`; all disabled under `prefers-reduced-motion`.

## 5. Components (`frontend/src/components`)

| Component | File | Notes |
|---|---|---|
| `Button` (+`IconButton`) | `Button.jsx` | variants primary · secondary · ghost · gold · danger · live; sizes sm/md/lg/xl; `to=` renders a Link |
| `Card`, `CardHeader` | `Card.jsx` | `tone` live/a/b/success/warning/accent; `interactive`; `padding` |
| `StatusBadge`, `LiveCount` | `ui/StatusBadge.jsx` | one vocabulary: live · upcoming · scheduled · registration_open · final · completed · awaiting · postponed · forfeit · qualified · eliminated · pending · approved · rejected · withdrawn · draft · cancelled · waiting · champion · demo |
| `Tabs`, `TabPanel` | `ui/Tabs.jsx` | WAI-ARIA tabs: roving focus, arrow/Home/End, `aria-controls` |
| `Field`, `Checkbox`, `.input` | `ui/Field.jsx` | label ↔ control ids, hint/error via `aria-describedby`, required marker in CSS |
| `Table`, `TableWrap`, `Th`, `Td`, `SortableTh` | `ui/Table.jsx` | sticky first column, numeric cells, caption, focusable scroll region |
| `Alert` | `ui/Alert.jsx` | info/success/warning/danger; role alert vs status |
| `Dialog` | `ui/Dialog.jsx` | modal, focus trap, Escape, restore focus, scroll lock |
| `EmptyState` | `EmptyState.jsx` | icon + one clear action |
| `LoadingBlock` (spinner / cards / table / text skeletons), `ErrorBlock` | `ui/Loading.jsx`, `ui/Skeleton.jsx` | |
| `FilterChips` | `ui/FilterChips.jsx` | segmented `aria-pressed` filter with counts |
| `LoadMore` + `usePaged` | `ui/LoadMore.jsx` | client-side pagination |
| `SectionHeader`, `GroupLabel`, `Eyebrow` | `ui/Section.jsx` | |
| `Icon` | `ui/Icon.jsx` | 40 stroke icons, decorative by default, `label=` for meaningful |
| `Logo`, `BallMark` | `ui/Logo.jsx` | |
| `StatCard` | `StatCard.jsx` | `size="sm"` tile, accents gold/blue/success/danger/live |
| `Avatar` | `Avatar.jsx` | players round, teams `shape="square"` |
| `RatingBadge`, `RankPill`, `ProgressBar`, `BadgeChip`, `ChartCard` + `useChartTheme` | | charts read tokens, so they follow the theme |
| `AppHeader`, `PageShell` | | skip link, mobile nav sheet, account menu (Escape/outside click), `main#main` |
| `ToastProvider` | `ui/ToastProvider.jsx` | polite live region |

### Volleyball components

| Component | Notes |
|---|---|
| `scoring/Scoreboard` | team colour bars, `text-score` numerals, serving ball icon with accessible label, set pips, set/match-point badge, previous-set chips, score pop |
| `scoring/PointButton` | 96–128px tall solid team fills, `+1 POINT` + team name |
| `scoring/QuickActionBar`, `ActionButton` | scorer shorthand (D, S, SP, B, SV, R…) instead of emoji |
| `scoring/PlayerGrid` | jersey number first, serve tag, bench row |
| `scoring/RallyTimeline`, `UndoControl`, `ConnectionStatus` | |
| `tournament/MatchCard` | fixture/result row: status badge, meta, two team rows with colour bar, sets score, winner check, loser dimmed, live running score |
| `tournament/StandingsTable` | rank chip, team link, P/W/L/Sets always visible, SR/PR from `sm`, qualified places and champion |
| `tournament/Bracket` | round columns (Quarter/Semi/Final labels), live/final badges, winner check, horizontal scroll region |

## 6. State vocabulary

| Product state | Badge | Also |
|---|---|---|
| Live match / tournament | `live` (solid rose, pulsing dot) | live card ring, `Watch live` button variant `live` |
| Upcoming (published) | `upcoming` | + `registration_open` when open |
| Scheduled match | `scheduled` | time + court in meta |
| Final / completed | `final` / `completed` | winner check, loser dimmed |
| Awaiting submit | `awaiting` | gold `Submit` action |
| Postponed / Forfeit | `postponed` / `forfeit` | |
| Qualified / Eliminated | `qualified` (Q chip in standings) / `eliminated` | |
| Pending approval / Approved / Rejected / Withdrawn | registration badges | organizer alert with pending count |
| Draft / Cancelled | outlined / struck | |

Primary actions are always a `primary`/`gold` button with an icon: Register team, Manage
roster (Add to roster), Start match, Score / Resume (`live`), Submit (`gold`), Standings,
View bracket (tab), Create tournament.

## 7. Rules

1. No raw colours in JSX; use tokens. Charts use `useChartTheme()`.
2. No emoji as UI icons (badges from the API are the one exception).
3. No `text-[Npx]` / `min-h-[Npx]` one-offs — use the scale (`text-2xs`, `min-h-11`).
4. Every table lives in `TableWrap`; every heading group uses `SectionHeader`/`GroupLabel`.
5. Every status word renders through `StatusBadge`.
6. New screens must pass `npm run test:e2e` (axe + responsive) before merge.
