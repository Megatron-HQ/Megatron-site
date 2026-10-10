# Megatron website

The product website and landing page for Megatron, a local-first desktop control center for Claude Code skills, plugins, and usage.

## Commands

| Command                         | Note                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm run dev`                   | Starts Vite dev server at `http://127.0.0.1:5173`                                                 |
| `npm run build`                 | Typechecks, verifies the pinned renderer, and builds both entries to `dist/`                      |
| `npm run typecheck`             | Checks the browser adapter and app renderer with TypeScript                                       |
| `npm run preview:check`         | Verifies renderer file hashes without a sibling app checkout                                      |
| `npm run preview:sync -- <app>` | Imports a reviewed app checkout and records the integration patches                               |
| `npm run preview`               | Serves production build preview at `http://127.0.0.1:4173`                                        |
| `npm run lint`                  | Checks authored JavaScript and TypeScript with ESLint; warnings fail                              |
| `npm run format:check`          | Checks formatting without modifying files                                                         |
| `npm run format`                | Formats authored code and docs; ignores generated mirrors                                         |
| `npm run verify:visual`         | Runs visual verification suite across responsive viewports (`--only <screen>`)                    |
| `npm test`                      | Runs tooling tests, including browser-based CLI failure regression cases                          |
| `npm run verify:qa`             | Runs headless Playwright verification against the running site (`node scripts/qa/verify.mjs`)     |
| `npm run verify:qa:ci`          | Starts an owned production preview, runs interactive QA, and stops it; requires an existing build |
| `npm run pre-commit:check`      | Verifies generated mirrors (`AGENTS.md` and `.agents/skills/`) are in sync                        |

## Stack

Vite + Vanilla JS marketing page + React/TypeScript app preview + Tailwind CSS v4 (`@tailwindcss/vite`), Geist fonts, and Lucide icons. App and marketing styles use separate Tailwind discovery scopes.

- Node pinned to `>=22.13.0` in `package.json` for the supported ESLint toolchain.
- Single-product landing site, zero runtime tracking or external analytics.
- Local-first delivery; production assets emitted to `dist/`.

## Layout

- `index.html`: Semantic landing page markup and structured metadata.
- `src/styles.css`: Tailwind theme, tokens, responsive rules, and reduced motion.
- `src/main.js`: Navigation, installation command copying, and scroll effects.
- `src/product-preview-host.js`: Same-origin iframe navigation, reset, native modal expansion, and keyboard focus reveal.
- `src/icons.js`: Marketing icon registry.
- `preview/index.html`, `src/preview/`: App entry, typed sample API, fixture analytics, and trusted host protocol.
- `vendor/megatron/`: Pinned actual renderer, shared API types, license, and reproducible provenance; never hand-edit.
- `scripts/preview/`: Snapshot import and hash verification.
- `public/`: Static assets (`megatron-icon.png`).
- `design-system/MASTER.md`: Authoritative design tokens and interaction rules.
- `scripts/qa/`: Tracked, portable browser verification scripts.
- `scripts/ci/`: Production QA orchestration and regression tests for process lifecycle and failure reporting.
- `.github/workflows/ci.yml`: Quality checks and Linux/Windows/macOS browser verification.
- `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`: Authored-code linting and formatting rules.
- `.qa/`: Ignored verification reports, rendered screenshots, and temporary test fixtures.

## Locked decisions

| Area                | Decision                                                                                                       | Why                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Generated mirrors   | `AGENTS.md` (from `CLAUDE.md`) and `.agents/skills/` (from `.claude/skills/`) — never hand-edited, no symlinks | Git symlinks need Developer Mode **and** `core.symlinks=true` on Windows. Instead `.githooks/pre-commit` regenerates and re-stages both every commit; `npm run pre-commit:check` acts as the backstop. |
| Privacy             | No remote telemetry, forms, or analytics requests                                                              | Aligns with Megatron's local-first core philosophy.                                                                                                                                                    |
| Verification        | Tracked browser checks in `scripts/qa/` and `.claude/skills/visual-verify/`; reports remain ignored            | Exercises responsive viewports (375px, 768px, 1024px, 1440px), keyboard controls, and ensures zero horizontal page overflow.                                                                           |
| Interactive preview | Actual app renderer in an isolated iframe; typed sample API in `src/preview/`                                  | Preserves app visuals and controls; never accesses visitor local files or runs native commands. Retains 860px client width with contained panning and expansion.                                       |

## Testing & Verification

Run `npm ci` to install the declared Playwright and image-diff dependencies. Browser tests use installed Chrome/Edge, an executable specified by `CHROME_PATH`, or Chromium installed with `npx playwright-core install chromium`. No sibling Megatron checkout is required.

`node scripts/qa/compare-app.mjs <app-checkout>` separately captures the original pinned renderer in hidden Electron and compares it with the production preview at 1200×720 and 860×600. It uses synthetic fixtures and does not run app scanners. Evidence remains in `.qa/app-reference/`. Only this reference-refresh command requires the app checkout and Electron.

Site verification is performed with Playwright in `scripts/qa/verify.mjs` and `.claude/skills/visual-verify/`:

- Responsive viewports: 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop).
- Zero horizontal overflow check on all screen sizes.
- Interactive tab switching and keyboard accessibility (Tab, Arrow keys, Enter, Escape).
- Optional local color contrast audit (`.qa/contrast.mjs`, not distributed).
- Visual baseline regression checks via `npm run verify:visual` (`--only <screen>` for scoped runs).
- Detected horizontal overflow, console errors/warnings, or uncaught page errors make `verify:visual` exit with status 1 after reporting results and cleaning up.

CI runs on pull requests, pushes to `main`, and manual dispatch. The `Quality` job checks linting, formatting, generated mirrors, and the production build. `Browser (Linux)`, `Browser (Windows)`, and `Browser (macOS)` run the tests, full responsive sweep, and production interactive QA with Playwright's matching Chromium. Screenshots and QA results are uploaded for seven days, including on failures.

Pixel baselines remain local and ignored. CI captures evidence for review and fails on behavior, overflow, and browser errors; it does not automatically approve screenshot changes. Keep the generated mirrors excluded from ESLint and Prettier and regenerate them from canonical sources through the hook.
