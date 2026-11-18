# Megatron website

The product landing page for [Megatron](https://github.com/Megatron-HQ/Megatron), a local-first desktop control center for Claude Code skills, plugins, and usage. The website is deployed on Vercel at [www.getmegatron.app](https://www.getmegatron.app/) as a static web application.

The interactive preview embeds Megatron's actual React renderer, including Skills, Plugins (user, project, and local scopes), hierarchical project navigation and scoping, actionable scan diagnostics, missing-project explanations, all seven Usage panels, settings, the command palette, file views, and dialogs. Tokens includes four token categories, independent 24-hour/7-day/30-day periods, trends, and model/project breakdowns. History has annual activity metrics, a yearly contribution calendar, an expandable monthly project timeline, shared year selection, and full-day details with available token data; Activity has recent prompts and sessions. Compact token values expose exact counts on hover and keyboard focus. A typed browser adapter supplies session-only sample data and simulates native actions, including parent-folder grants and cascading project discovery.

The marketing page uses vanilla JavaScript; the embedded preview uses React and TypeScript. Both entries build with Vite and Tailwind CSS v4. Normal builds require no desktop app checkout.

## Deployment

The website is deployed to Vercel at [www.getmegatron.app](https://www.getmegatron.app/) as a static site with continuous deployment connected to the GitHub repository. Pushes to `main` deploy directly to production, and pull requests generate preview deployments.

### Vercel configuration

- **Framework Preset:** Vite
- **Build Command:** `npm run build` (typechecks, checks renderer snapshot integrity, and builds static assets)
- **Output Directory:** `dist`
- **Install Command:** `npm ci`
- **Node.js Version:** `22.x` (matches `"engines": { "node": ">=22.13.0" }` in `package.json`)

All interactive preview features—including the typed browser adapter, sample state, simulated project/folder grants, and the pinned React renderer snapshot—execute entirely client-side in the visitor's browser. The deployment requires no server-side runtime, backend database, or external API keys.

## Local development

Requires Node.js 22.13+ (or a newer supported Node release) and npm.

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173` to access the local development server.

To build and preview the production bundle locally:

```powershell
npm run build
npm run preview
```

The production site is emitted to `dist/`. The local production preview serves at `http://127.0.0.1:4173`.

## Commands

| Command                         | Purpose                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `npm run dev`                   | Start the development server at `127.0.0.1:5173`.                                           |
| `npm run build`                 | Check TypeScript and renderer integrity, then build both production entries.                |
| `npm run preview`               | Serve the existing production build at `127.0.0.1:4173`.                                    |
| `npm run typecheck`             | Check the preview, adapter, and imported renderer types.                                    |
| `npm run preview:check`         | Verify the pinned renderer snapshot against its recorded hashes.                            |
| `npm run preview:sync -- <app>` | Import a reviewed app checkout and record integration patches in provenance.                |
| `npm run lint`                  | Check authored JavaScript and TypeScript with zero warnings allowed.                        |
| `npm run format:check`          | Check formatting without modifying files.                                                   |
| `npm run format`                | Format authored code and documentation.                                                     |
| `npm test`                      | Run adapter, analytics, messaging, provenance, and verification-tool regression tests.      |
| `npm run verify:visual`         | Build and capture all responsive preview states.                                            |
| `npm run verify:qa`             | Run headless Playwright interaction verification against an active preview server.          |
| `npm run verify:qa:ci`          | Run production interaction checks with an owned preview server; requires an existing build. |
| `npm run pre-commit:check`      | Check generated instruction and skill mirrors.                                              |

## Structure

- `index.html`: semantic page content and metadata.
- `src/styles.css`: Tailwind theme, layout, responsive rules, and reduced motion.
- `src/main.js`: navigation, installation copying, and scroll effects.
- `src/product-preview-host.js`: iframe lifecycle, section navigation, reset, expansion, and focus reveal.
- `src/icons.js`: bundled marketing icons.
- `preview/index.html`, `src/preview/`: React entry, typed sample API, fixtures, analytics, archived daily summaries, and trusted host messaging.
- `vendor/megatron/`: 109 pinned app renderer and shared files, API types, license, and SHA-256 provenance.
- `scripts/preview/`: reproducible renderer import and integrity checks.
- `scripts/qa/`: headless Playwright verification suites and Electron reference comparison.
- `scripts/ci/`: CI preview lifecycle orchestration and regression test harness.
- `.claude/skills/visual-verify/`: responsive screenshot capture, viewport definitions, and defect regression assertions.
- `docs/`: interactive preview implementation notes and parity documentation.
- `.github/workflows/ci.yml`: quality gates and cross-platform browser verification workflow.
- `public/megatron-icon.png`: the desktop application's existing icon.
- `DESIGN.md`: visual design system and rules.

Geist fonts and Lucide icons are bundled with the site. The production marketing page uses the free tiers of Vercel Web Analytics and Speed Insights. The website has no account, form submission, backend server, or visitor local-file integration. Website measurement is separate from Megatron's desktop app and never reads local skills, sessions, files, or paths.

### Website analytics and performance

`src/site-observability.js` initializes the official `@vercel/analytics` and `@vercel/speed-insights` SDKs only in a Vercel production build, on the top-level HTTPS marketing page at `getmegatron.app`, `www.getmegatron.app`, or `megatron-site.vercel.app`. Development, local production previews, deployment previews, other hosts, and every embedded sample remain untracked. URL query strings and fragments are removed before pageview or performance events are sent. Download clicks, command copying, and GitHub star-link clicks are not tracked on Hobby.

Web Analytics supplies visitor/pageview totals and the available referrer, country, device, OS, and browser breakdowns. Speed Insights' free dashboard supplies the Real Experience Score. Performance sampling is 100% so the available allowance captures as much traffic as possible. The current free allowances are shared across the Vercel team: 50,000 Web Analytics events per month with a one-month reporting window, and 10,000 Speed Insights events over the last 30 days with 24-hour/7-day views. Collection may pause at Vercel's limits; the site keeps working and there are no paid overages or Plus upgrades. Check [Web Analytics pricing](https://vercel.com/docs/analytics/limits-and-pricing) and [Speed Insights pricing](https://vercel.com/docs/speed-insights/limits-and-pricing) before changing plans or sampling.

Enable Web Analytics for the existing `megatron-site` Vercel project and deploy the updated source. The Speed Insights free tier starts collecting after its SDK is deployed; do not enable Speed Insights Plus. `vite.config.js` exposes only the public deployment environment and `VERCEL_OBSERVABILITY_CLIENT_CONFIG` to the client, allowing Vercel's build-time first-party intake paths without credentials. Do not substitute `NODE_ENV=production` for `VERCEL_ENV=production`: local and preview builds also use production assets.

`npm test` includes `scripts/qa/site-observability.test.mjs`, which builds all three deployment variants, proxies the real production bundle through a local browser fixture, and checks SDK loading, URL redaction, first-party intake paths, and local/iframe exclusions. Collection scripts are intercepted so tests never submit analytics. The existing production QA continues to assert zero external requests when running locally.

Usage retains recorded project locations and existing confirmed links. Project rankings and History's timeline search all rows and recorded paths beyond the collapsed eight. Activity and History share retained prompt records for matching intervals, with partial/unavailable coverage kept distinct from zero. Manual project linking is deferred; the Usage header has no Manage projects entry point.

## Product evidence

Copy was grounded in the app's README, PRODUCT.md, DESIGN.md, main/preload IPC contracts, permission-aware scanners, deterministic linter, scoped plugin CLI actions, database cost/context queries, parent-folder discovery, and renderer views. The desktop app is not modified by this website.

Megatron v0.3.0 was published on November 18, 2026. The installation section links its 64-bit Windows installer (107 MB), the versionless Homebrew cask, and the versionless curl installer. The macOS build is ad-hoc signed and ships as a zip without notarization. The Windows installer is unsigned. `install.sh` is linked only as the `releases/latest/download` asset. At each release, update the version label, the Windows download link, and its displayed file size together, and recheck platform, signing, and update claims against the app's `docs/releases.md`.

Megatron is presented as currently free and MIT-licensed, with no commitments about future pricing. Preview metrics, skills, plugins, and definitions are illustrative, not user testimonials or product performance claims.

## Verification

The current snapshot is the Megatron `v0.2.1` release (`75e8faa`; renderer unchanged since `e1399c4`): v0.2.0 plus three Usage changes: exact fork-lineage cost (with an estimate caveat), Claude app chats folded into one project row, and staggered entrance animations for History and Tokens. The 0.2.0 release added the warm Paper palette with its frame and sheet shell, screen and dialog motion, entity glyphs, stale-skill markers, plugin contents, non-overlapping folder grants with narrowing and two-step revoke, the first-run welcome, the Settings Updates section, and the Resident tax 200K bar scale. These sit alongside independent Usage project identities, project search, retained Activity prompt counts, pending folder discovery, live inventory reconciliation, History's annual summary, the `/context` Resident tax panel, exact-token tooltips, and scan progress. Its source revision, exact source hashes, and five integration patches are recorded in [renderer provenance](vendor/megatron/provenance.json). The fifth patch makes a shared TypeScript import explicit for browser-adapter tests. App styling, components, and motion rules remain owned by the imported renderer.

The [November 12 review](docs/upstream-sync-2026-11-12.md) covers the 35 commits from `61084a2` to v0.2.0. The [latest November 5 review](docs/upstream-sync-2026-11-05-usage-projects.md) details the next two commits and all 45 changed app files. The [earlier November 5 review](docs/upstream-sync-2026-11-05.md) details the previous 31 changed app files. The [November 4 review](docs/upstream-sync-2026-11-04.md) records the earlier `/context` integration. Rerun the checks below when changing the implementation.

See the [product fidelity audit](docs/product-fidelity-audit.md) for the current capability review and corrections, [implementation notes](docs/interactive-preview-implementation.md) for verification conditions and limitations, and the [parity plan](docs/interactive-preview-parity-plan.md) for the original approach.

The preview uses the actual app renderer in a same-origin iframe. Marketing CSS is isolated from its app tokens, fonts, and components. The typed browser API operates on session-only sample data; repository and parent-folder grants with cascading discovery, non-overlapping grants, narrowing, plugin commands at all three scopes, scan lifecycle events, actionable scan diagnostics, update checks, external links, and data-folder actions are simulated. Like a typical installation, the sample starts with the `C:\Dev` parent folder granted, so the sidebar lists its repositories by name under `Dev`, and every path uses native Windows separators. The first Add Folder grants the sample `C:\Clients\docs-site` repository; a second grants its `Clients` parent, which absorbs it; a third reports that `docs-site` is already included. Keep some folders… narrows a parent to its first sample repository. The welcome stays closed on load and opens from Settings → Show welcome. Reload or Reset sample restores the original fixtures. The app checkout is not modified.

Resident tax's `/context` baseline and recorded requests are independent synthetic examples in `src/preview/context.ts`. The sample shows used, deferred, reserved, and free categories, category tables, system blocks/tools/cache breakpoints, hook output, and MCP instructions. It simulates measurement failures and unavailable recordings. The desktop measurement runs Claude Code from an empty folder and can start configured SessionStart hooks and MCP servers; the browser never runs the CLI or reads transcripts. The landing-page illustration groups system prompt and system tools and agrees with the preview's 32k used / 1M window, 33k reserve, 935k free, and 24.3k deferred sample.

At narrow website widths the app retains its 860px minimum client width inside a horizontally pannable viewport. Keyboard focus reveals the relevant control. Expand preview opens the same iframe in a native modal dialog and preserves its state; Escape dismisses app controls before closing expansion. This preserves the desktop layout instead of introducing a separate mobile app design.

The preview toolbar contains section tabs, Reset sample, and expansion controls. Inventory change simulations remain in the local QA harness to verify recovery and refresh behavior. They never watch or change visitor files. The Resident Tax sample under Follow the work immediately follows the main preview's Light, Dark, or System appearance, including system preference changes and Reset, without reloading its data or closing its category dialog.

The desktop watches approved inventory locations after changes settle and reconciles missed events periodically. Full startup, focus, folder-grant, plugin-action, and manual scans retain their existing behavior. Confirmed missing discovered children beneath readable grants are pruned; missing directly granted roots and unreadable sources retain cached inventory. Warnings remain scoped to the affected folder. Settings retains the manual-rescan result while its source details reflect the latest background scan.

Checks cover the command palette, conditional inventory columns, hierarchical project navigation and folder expansion, actionable scan diagnostics, project availability notices, sorting and keyboard rows, lint/detail/file navigation, Markdown links, tree resizing, lifetime history, settings and manual rescan, user- and project-scoped plugin actions, all seven Usage panels, independent time windows and history years, exact-token tooltips, token-only days with unavailable prompt history, drilldown dialogs and focus return, reset/expansion, installation copying, mobile navigation, FAQ disclosures, and reduced motion.

Responsive checks cover 375px, 768px, 1024px, and 1440px. Essential page and installation content remains available with JavaScript disabled. Verification scripts are tracked in `scripts/qa/` and `.claude/skills/visual-verify/`; reports, screenshots, and temporary fixtures are saved under ignored directories.

`npm ci` installs the pinned `playwright-core`, `pixelmatch`, and `pngjs` development dependencies. Browser checks use installed Chrome/Edge or a custom executable set through `CHROME_PATH`. If neither is installed, download Playwright's matching Chromium once:

```powershell
npx playwright-core install chromium
```

Run the tooling tests and full visual sweep:

```powershell
npm test
npm run verify:visual
npm run pre-commit:check
```

The visual sweep builds the site and starts a temporary production preview when needed. It exits with status 1 for horizontal overflow, console errors/warnings, or uncaught page errors. New or changed screenshots remain review items; they do not fail the command automatically. When a development server is already open, set `MEGATRON_TEST_URL` to a production preview to avoid development-only library warnings. Build includes TypeScript and renderer-provenance checks.

## Updating the app renderer

The authoritative revision and five integration patches are recorded in `vendor/megatron/provenance.json`. Never edit the snapshot manually. To import a reviewed app checkout:

```powershell
npm run preview:sync -- C:\Megatron
npm run preview:check
npm run typecheck
```

Review the source and dependency changes, run interactive QA and the full screenshot sweep, and compare against the current app. The separate reference command builds the original renderer from the pinned checkout and runs it in hidden Electron with the same synthetic API, frozen time, locale, theme, dimensions, and DPR as the website:

```powershell
node scripts/qa/compare-app.mjs C:\Megatron
```

Reference screenshots and differences are written to `.qa/app-reference/`. This development check requires that app checkout and its installed Electron; ordinary website builds and CI do not. It compares renderer content, excluding operating-system window chrome.

For interactive QA, start `npm run preview` after building and run the following in a second PowerShell window:

```powershell
$env:MEGATRON_TEST_URL = 'http://127.0.0.1:4173/'
npm run verify:qa
Remove-Item Env:MEGATRON_TEST_URL
```

`npm ci` configures `.githooks/` as the Git hook directory. The executable pre-commit hook regenerates `AGENTS.md` and `.agents/skills/` from the staged `CLAUDE.md` and `.claude/skills/` sources. Stage source changes before manually running `node .githooks/pre-commit`; never edit the mirrors directly.

## Continuous integration

[CI](.github/workflows/ci.yml) runs on pull requests, pushes to `main`, and manual workflow dispatch. It uses Node 22, the lockfile, read-only repository permissions, pinned action commits, timeouts, and cancellation of superseded runs.

- **Quality:** JavaScript/TypeScript ESLint with zero warnings, Prettier formatting, generated-mirror synchronization, TypeScript checking, renderer integrity, and a production build.
- **Browser (Linux)**, **Browser (Windows)**, and **Browser (macOS):** tooling tests, real-browser failure regression cases, the full responsive screen sweep, and production interaction checks. All three use Chromium matching the pinned Playwright version.
- **Evidence:** screenshots and QA results are retained as run artifacts for seven days, including when browser checks fail. Pixel comparison baselines remain local; CI screenshots require review for appearance changes.

To run the same checks locally:

```powershell
npm run lint
npm run format:check
npm run pre-commit:check
npm test
npm run verify:visual
npm run verify:qa:ci
```

`verify:visual` builds the site. `verify:qa:ci` uses that build, starts its own preview, and stops it after success or failure. It refuses an occupied port instead of using an unrelated server. Set `MEGATRON_CI_PREVIEW_PORT` to a free port if the default `4173` is occupied.

Use `npm run format` to apply formatting before committing. Formatting and linting check authored sources; generated mirrors and verification artifacts are excluded.

After the workflow has run on the remote repository, configure branch protection or a ruleset to require **Quality**, **Browser (Linux)**, **Browser (Windows)**, and **Browser (macOS)** before merging. The workflow itself does not change repository protection settings.
