# Megatron website

The product landing page for [Megatron](https://github.com/Megatron-HQ/Megatron), a local-first desktop control center for Claude Code skills, plugins, and usage.

## Run locally

Requires Node.js 22.12+ (or a newer supported Node release) and npm.

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

Responsive checks cover 375px, 768px, 1024px, and 1440px and found no page-level horizontal overflow. Essential page and installation content remains available with JavaScript disabled. Rendered screenshots and session verification scripts are retained locally under the ignored `.qa/` directory; these use the existing Playwright installation in `C:/Megatron` and are not part of the distributable site.
