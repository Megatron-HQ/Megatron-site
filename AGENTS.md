# Megatron website

The product website and landing page for Megatron, a local-first desktop control center for Claude Code skills, plugins, and usage.

## Commands

| Command | Note |
| --- | --- |
| `npm run dev` | Starts Vite dev server at `http://127.0.0.1:5173` |
| `npm run build` | Builds production bundle to `dist/` |
| `npm run preview` | Serves production build preview at `http://127.0.0.1:4173` |
| `npm run verify:visual` | Runs visual verification suite across responsive viewports (`--only <screen>`) |
| `npm test` | Runs tooling tests, including browser-based CLI failure regression cases |
| `npm run verify:qa` | Runs headless Playwright verification against the running site (`node scripts/qa/verify.mjs`) |
| `npm run pre-commit:check` | Verifies generated mirrors (`AGENTS.md` and `.agents/skills/`) are in sync |

## Stack

Vite + Vanilla JS + Tailwind CSS v4 (`@tailwindcss/vite`), Geist fonts (`@fontsource/geist-sans`, `@fontsource/geist-mono`), Lucide icons (`lucide`).

- Node pinned to `>=22.12.0` in `package.json`.
- Single-product landing site, zero runtime tracking or external analytics.
- Local-first delivery; production assets emitted to `dist/`.

## Layout

- `index.html`: Semantic landing page markup and structured metadata.
- `src/styles.css`: Tailwind theme, tokens, responsive rules, and reduced motion.
- `src/main.js`: Navigation, installation command copying, and scroll effects.
- `src/product-demo.js`: Isolated interactive preview, keyboard controls, and render helpers.
- `src/demo-data.js`: Illustrative sample data, separate from the renderer.
- `public/`: Static assets (`megatron-icon.png`).
- `design-system/MASTER.md`: Authoritative design tokens and interaction rules.
- `scripts/qa/`: Tracked, portable browser verification scripts.
- `.qa/`: Ignored verification reports, rendered screenshots, and temporary test fixtures.

## Locked decisions

| Area | Decision | Why |
| --- | --- | --- |
| Generated mirrors | `AGENTS.md` (from `CLAUDE.md`) and `.agents/skills/` (from `.claude/skills/`) — never hand-edited, no symlinks | Git symlinks need Developer Mode **and** `core.symlinks=true` on Windows. Instead `.githooks/pre-commit` regenerates and re-stages both every commit; `npm run pre-commit:check` acts as the backstop. |
| Privacy | No remote telemetry, forms, or analytics requests | Aligns with Megatron's local-first core philosophy. |
| Verification | Tracked browser checks in `scripts/qa/` and `.claude/skills/visual-verify/`; reports remain ignored | Exercises responsive viewports (375px, 768px, 1024px, 1440px), keyboard controls, and ensures zero horizontal page overflow. |
| Interactive preview | Isolated mock data in `src/demo-data.js` | Illustrative sample data only; never touches visitor local files. |

## Testing & Verification

Run `npm ci` to install the declared Playwright and image-diff dependencies. Browser tests use installed Chrome/Edge, an executable specified by `CHROME_PATH`, or Chromium installed with `npx playwright-core install chromium`. No sibling Megatron checkout is required.

Site verification is performed with Playwright in `scripts/qa/verify.mjs` and `.claude/skills/visual-verify/`:
- Responsive viewports: 375px (mobile), 768px (tablet), 1024px (laptop), 1440px (desktop).
- Zero horizontal overflow check on all screen sizes.
- Interactive tab switching and keyboard accessibility (Tab, Arrow keys, Enter, Escape).
- Optional local color contrast audit (`.qa/contrast.mjs`, not distributed).
- Visual baseline regression checks via `npm run verify:visual` (`--only <screen>` for scoped runs).
- Detected horizontal overflow, console errors/warnings, or uncaught page errors make `verify:visual` exit with status 1 after reporting results and cleaning up.
