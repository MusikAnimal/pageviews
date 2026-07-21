# Pageviews Analysis (rewrite)

Rewrite of [pageviews](https://github.com/MusikAnimal/pageviews) — a suite of 8
Wikimedia pageview analysis apps (Pageviews, Topviews, Langviews, Siteviews,
Massviews, Redirect Views, Mediaviews, Userviews). Goal: feature parity with the
legacy tool, fundamentally reorganized for maintainability.

**Stack**: Symfony 7.4 (PHP 8.4) — a Symfony 8.1 upgrade is wanted but currently
blocked: wikimedia/toolforge-bundle (1.7.2) caps at Symfony ^7. Revisit when
upstream allows ^8 · Symfony UX Vue + Stimulus via vite-plugin-symfony ·
Vue 3 + Pinia + vue-router · Wikimedia Codex + design tokens · LESS · banana-i18n ·
Apache ECharts 6 · Vitest · PHPUnit 12 (+ Panther) · eslint/stylelint-config-wikimedia

A clone of the legacy tool lives at `var/pageviews-legacy/` (gitignored) for
reference. Canonical legacy files: `javascripts/shared/{pv,pv_config,chart_helpers,list_helpers}.js`.

## Dev environment & commands

Everything runs in Docker (`docker compose up`): app at `http://localhost:8091`
(override with `HTTP_PORT`), Vite dev server with HMR on `:5173`. Replica DB
access requires SSH tunnels running on the HOST (containers reach them via
`host.docker.internal`).

Run all tooling through the containers:

```
docker exec pageviews-node-1 npm test              # Vitest
docker exec pageviews-node-1 npm run lint          # ESLint + Stylelint
docker exec pageviews-node-1 npm run lint:fix
docker exec pageviews-node-1 npx vite build
docker exec pageviews-php-1 composer test          # PHPUnit
docker exec pageviews-php-1 php bin/console ...
docker exec pageviews-php-1 composer ...
```

The sandbox PHP lacks core extensions — never run `php`/`phpunit` directly.

## Hard rules

- **Only the user installs or manages dependencies** (composer *and* npm). The
  sandbox has no network. List what you need and ask.
- **Work in small chunks and check in** so the user can follow along. One commit
  per logical step.
- **Commits**: Wikimedia style — `component: Subject` where a component fits,
  a Why/What body, and an `Assisted-by: <model name>` trailer. No Co-Authored-By.
- **Run lint + both test suites before committing**, and re-run `vite build`
  after any lint `--fix` pass (autofixes have broken LESS before).
- **Ask before adding stylelint rule exemptions** or using CSS features the
  wikimedia config disallows. Current sanctioned exemptions (see .stylelintrc.json):
  browser matrix from `.browserslistrc` (Vite baseline), `css-container-queries`
  (progressive enhancement), `css-nesting` (LESS false positive).
- Verify changes end-to-end when feasible (curl an endpoint via
  `docker exec pageviews-php-1 curl localhost`, run the affected tests).

## Architecture

### Data path (decided; do not revisit without asking)

- The Symfony server proxies **only** (a) Toolforge replica DB queries and
  (b) the Wikimedia AQS/Pageviews metrics REST API.
- MediaWiki Action API calls (`api.php?action=query…` — autocomplete, redirects,
  page info, siteinfo continuation queries), Wikidata, Quarry and Hashtags are
  made **client-side** (`origin=*` CORS).
- **No PagePile integration. No app database** (no usage tracking; Topviews
  excludes come from a static YAML config).
- Metrics fan-out: batched server endpoint (≤50 pages/request, concurrent AQS
  calls server-side); the client chunks larger lists and drives the progress bar.

### Backend (`src/`)

Controller ↔ Repository pairs named per resource/app (XTools-style), shared
query/HTTP helpers in a parent class or trait (`DateParserTrait` exists). No
Service/Client/Model layers unless a second consumer makes them earn their keep.
Caching via APCu pools (`config/packages/cache.yaml`); replica connections via
toolforge-bundle (`ReplicasClient`).

### Frontend (`assets/vue/`)

- `controllers/` — Twig-mounted roots only (eager-globbed by `app.js`); keep thin.
- `apps/<app>/` — everything owned by one app (View, Settings, store, columns).
- `components/` — shared and prop-driven; `composables/` — DOM/lifecycle logic;
  `stores/` — cross-app stores only.
- **Store contract** (required by `useQuerySync`): `setFromQuery( params )` +
  a `query` computed with the canonical serialized params. Keep `setFromQuery`
  idempotent and side-effect-free.
- **Param tiers**: report definition → URL query string (legacy-compatible names,
  pipe-delimited lists); user preferences → localStorage; runtime state → Pinia.
- **All date handling is UTC** — pageviews data is bucketed by UTC day. The
  legacy tool computed dates in browser-local time, a long-standing bug (10 PM
  in New York is already the next UTC day). Use `assets/vue/lib/dates.js`;
  never `new Date()` local-time getters for anything user-facing.
- i18n: `$i18n( 'key' )` in templates, `import { banana }` from `vue/i18n.js` in
  JS, `v-i18n-html` for markup messages. Keys live in `i18n/*.json` (banana
  format, synced with translatewiki — never invent keys without adding them to
  `en.json` + `qqq.json`).
- Charts: ECharts via tree-shaken `echarts/core` behind a single import point
  (`assets/vue/charts/`, once created); components consume option-builder
  functions, never echarts directly.
- CSS: BEM class names (`pv-block__element--modifier` style), Codex design
  tokens via `@import ( reference )`, mobile-first, light/dark via
  `prefers-color-scheme`.

## Per-app porting playbook

For each app (order: Pageviews → Siteviews/Mediaviews → Langviews →
Redirectviews/Userviews → Massviews → Topviews):

1. Read the legacy app (`var/pageviews-legacy/javascripts/<app>/` +
   `views/<app>/index.haml`) and write a parity checklist first.
2. Backend: metrics/resolver endpoints + fixtures + a golden contract test
   pinning the JSON shape.
3. Frontend: store (factory + columns/sources), View, controller, route
   (`app.js` + Symfony route + Twig template with FOUC skeleton).
4. i18n: confirm every message key used exists in `i18n/en.json`.
5. Lint + both test suites green; `vite build` clean.
6. Manually verify against the legacy tool: paste a legacy permalink URL —
   params must parse identically; compare numbers for one known query.
7. Check in with the user for review before starting the next app.

The full plan (milestones M0–M7, API contracts, legacy findings) lives in the
plan file from the planning session; ask the user if you need it and can't
find it.
