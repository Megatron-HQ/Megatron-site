# Megatron website

The product landing page for [Megatron](https://github.com/Megatron-HQ/Megatron), a local-first desktop control center for Claude Code skills, plugins, and usage.

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

## Structure

- `index.html`: semantic page content and metadata.
- `src/styles.css`: Tailwind theme, layout, responsive rules, and reduced motion.
- `src/main.js`: navigation, installation copying, and scroll effects.
- `src/product-demo.js`: isolated interactive preview, keyboard controls, and render helpers.
- `src/demo-data.js`: illustrative sample data, separate from the renderer.
- `public/megatron-icon.png`: the desktop application's existing icon.
- `design-system/MASTER.md`: approved design and content rules.

Geist fonts and Lucide icons are bundled locally. The site makes no analytics requests and has no account, form submission, or local-file integration.

## Product evidence

Copy was grounded in the app's README, PRODUCT.md, DESIGN.md, main/preload IPC contracts, permission-aware scanners, deterministic linter, scoped plugin CLI actions, database cost/context queries, and renderer views. The desktop app is not modified by this website.

The GitHub releases endpoint contained no published releases on October 9, 2026. The page therefore offers the app's documented source setup and links to releases, without advertising unavailable installers. When releases ship, update the installation section and recheck platform/signing claims before adding platform download buttons.

Megatron is presented as currently free and MIT-licensed, with no commitments about future pricing. Preview metrics, skills, plugins, and definitions are illustrative, not user testimonials or product performance claims.

## Verification

The site was rendered and exercised in installed Chrome using Playwright against both development and production builds. Checks cover all preview sections, five usage panels, time-window changes, chart-point selection, skill filtering/search/inspection, return navigation, sample plugin switches, installation copy feedback, mobile navigation, keyboard controls, FAQ disclosures, and reduced motion.

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

The visual sweep builds the site and starts a temporary production preview when needed. It exits with status 1 for horizontal overflow, console errors/warnings, or uncaught page errors. New or changed screenshots remain review items; they do not fail the command automatically.

For interactive QA, start `npm run preview` after building and run the following in a second PowerShell window:

```powershell
$env:MEGATRON_TEST_URL = 'http://127.0.0.1:4173/'
npm run verify:qa
Remove-Item Env:MEGATRON_TEST_URL
```

`npm ci` configures `.githooks/` as the Git hook directory. The executable pre-commit hook regenerates `AGENTS.md` and `.agents/skills/` from the staged `CLAUDE.md` and `.claude/skills/` sources. Stage source changes before manually running `node .githooks/pre-commit`; never edit the mirrors directly.

## Continuous integration

[CI](.github/workflows/ci.yml) runs on pull requests, pushes to `main`, and manual workflow dispatch. It uses Node 22, the lockfile, read-only repository permissions, pinned action commits, timeouts, and cancellation of superseded runs.

- **Quality:** ESLint with zero warnings, Prettier formatting, generated-mirror synchronization, and a production build.
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
