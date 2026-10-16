# Megatron website

The product landing page for [Megatron](https://github.com/Megatron-HQ/Megatron), a local-first desktop control center for Claude Code skills, plugins, and usage.

The interactive preview embeds Megatron's actual React renderer, including Skills, Plugins (user and project scopes), hierarchical project navigation and scoping, actionable scan diagnostics, project availability notices, all five Usage panels, settings, the command palette, file views, and dialogs. A typed browser adapter supplies session-only sample data and simulates native actions, including parent-folder grants and cascading project discovery.

The marketing page uses vanilla JavaScript; the embedded preview uses React and TypeScript. Both entries build with Vite and Tailwind CSS v4. Normal builds require no desktop app checkout.

## Run locally

Requires Node.js 22.13+ (or a newer supported Node release) and npm.

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. This is a local-only delivery; no hosting service or public deployment is configured.

```powershell
npm run build
npm run preview
```

The production site is emitted to `dist/`. The production preview serves at `http://127.0.0.1:4173`.

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
- `src/icons.js`: locally bundled marketing icons.
- `preview/index.html`, `src/preview/`: React entry, typed sample API, fixtures, analytics, and trusted host messaging.
- `vendor/megatron/`: 86 pinned app renderer and shared files, API types, license, and SHA-256 provenance.
- `scripts/preview/`: reproducible renderer import and integrity checks.
- `scripts/qa/`: headless Playwright verification suites and Electron reference comparison.
- `scripts/ci/`: CI preview lifecycle orchestration and regression test harness.
- `.claude/skills/visual-verify/`: responsive screenshot capture, viewport definitions, and defect regression assertions.
- `docs/`: interactive preview implementation notes and parity documentation.
- `.github/workflows/ci.yml`: quality gates and cross-platform browser verification workflow.
- `public/megatron-icon.png`: the desktop application's existing icon.
- `design-system/MASTER.md`: approved design and content rules.

Geist fonts and Lucide icons are bundled locally. The site makes no analytics requests and has no account, form submission, or local-file integration.

## Product evidence

Copy was grounded in the app's README, PRODUCT.md, DESIGN.md, main/preload IPC contracts, permission-aware scanners, deterministic linter, scoped plugin CLI actions, database cost/context queries, parent-folder discovery, and renderer views. The desktop app is not modified by this website.

The GitHub releases endpoint contained no published releases as of October 16, 2026. The page therefore offers the app's documented source setup and links to releases, without advertising unavailable installers. When releases ship, update the installation section and recheck platform/signing claims before adding platform download buttons.

Megatron is presented as currently free and MIT-licensed, with no commitments about future pricing. Preview metrics, skills, plugins, and definitions are illustrative, not user testimonials or product performance claims.

## Verification

The current snapshot is Megatron `0.1.0` at revision `3a2439c528a38bdc93aa0e83559416f95d3808cb` (86 pinned files). Its source hashes and four integration patches are recorded in [renderer provenance](vendor/megatron/provenance.json). App styling, components, and motion rules remain owned by the imported renderer.

The implementation was verified with 30 pixel-identical reference captures across 15 app states at two client sizes, 125 responsive website screenshots, and 55 passing regression tests. TypeScript, provenance, lint, formatting, generated mirrors, production build, and interactive QA also passed. These results describe the pinned implementation; rerun the checks when changing it.

See [implementation notes](docs/interactive-preview-implementation.md) for verification conditions and limitations, and the [parity plan](docs/interactive-preview-parity-plan.md) for the original audit and approach.

The preview uses the actual app renderer in a same-origin iframe. Marketing CSS is isolated from its app tokens, fonts, and components. The typed browser API operates on session-only sample data; repository and parent-folder grants with cascading discovery and revocation, plugin commands at user and project scopes, rescans, actionable scan diagnostics, external links, and data-folder actions are simulated. Reload or Reset sample restores the original fixtures. The app checkout is not modified.

At narrow website widths the app retains its 860px minimum client width inside a horizontally pannable viewport. Keyboard focus reveals the relevant control. Expand preview opens the same iframe in a native modal dialog and preserves its state; Escape dismisses app controls before closing expansion. This preserves the desktop layout instead of introducing a separate mobile app design.

Checks cover the command palette, conditional inventory columns, hierarchical project navigation and folder expansion, actionable scan diagnostics, project availability notices, sorting and keyboard rows, lint/detail/file navigation, Markdown links, tree resizing, lifetime history, settings, user- and project-scoped plugin actions, all five Usage panels, independent time windows, drilldown dialogs and focus return, reset/expansion, installation copying, mobile navigation, FAQ disclosures, and reduced motion.

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

The authoritative revision and four integration patches are recorded in `vendor/megatron/provenance.json`. Never edit the snapshot manually. To import a reviewed app checkout:

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
