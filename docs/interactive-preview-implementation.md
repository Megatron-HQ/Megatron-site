# Interactive preview implementation

The website now embeds Megatron's actual React renderer. The previous hand-written demo and its internal CSS have been removed. Skills, Plugins, all five Usage panels, command palette, settings, folder management, budget audit, detail/file views, charts, and dialogs use the app's existing components and stylesheet.

## Renderer authority

- App revision: `ae0f0a1a862cac263880274fed4c46c27a9a18fc`, version `0.1.0`.
- Snapshot: 92 files in `vendor/megatron/`, including shared API types, MIT license, and existing third-party attribution.
- Four recorded integration patches: scoped Tailwind discovery, trusted host navigation, and inactive-frame autofocus guards in the two inventories. App tokens, layouts, labels, icons, and motion rules are preserved.
- `npm run build` checks TypeScript and snapshot hashes before building the marketing and preview entries. Normal builds and CI require no sibling app checkout.
- The original app repository remains unchanged.

## Browser integration

`src/product-preview-host.js` owns the external section tabs, Cost navigation, loading announcements, Reset sample, and native modal expansion. It retains the same iframe and state during expansion, restores focus on close, and validates message origin and source. Escape retains the app's dialog, tooltip, effort-selection, and file/detail behavior before closing expansion.

The preview retains an 860px minimum client width. At narrower website widths, visitors pan the contained desktop viewport; keyboard focus reveals controls. The landing page itself has no horizontal overflow. Marketing navigation, mobile menu/Escape, installation copying, FAQ, scroll effects, and reduced motion remain intact.

`src/preview/api.ts` provides the complete typed browser API over session-only sample state. Folder grants, native plugin commands, rescans, external app links, and data-folder reveal are simulated. No visitor filesystem, CLI, database, backend, or telemetry access is introduced. Reset cancels stale pending actions and restores the original state.

The October 18 product review corrected version-specific plugin paths/counts, shared-install updates and uninstalls, aggregate enablement, missing-folder state, overlapping parent grants, scan lifecycle events, and lint line destinations. Add Folder first grants the sample `docs-site` repository; a second click grants its parent and discovers the retained nested repository. See the [product fidelity audit](product-fidelity-audit.md) for the complete capability and content review.

The October 19 update imports the Activity details dialog. The sample overview gives every Activity day and hour its clipped interval, sessions, prompts, bare slash commands, and project ranking, derived by the same summary as the window totals. Nested sidebar projects show parent-relative names (`tools/cli` under `Projects/monorepo`). The app now hides empty Git repositories nested inside another repository; the sample nested repository stays listed because it represents one with its own `.claude` settings and no skills.

## Verification evidence

| Check                   | Result                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App comparison          | 30 captures across 15 states at 1200×720 and 860×600, with identical RGBA pixels                                                                                                                                                                                                                                                           |
| Reference conditions    | Original pinned renderer in hidden Electron; identical synthetic API, frozen clock, DPR 1, en-GB locale, America/Chicago timezone, fonts, themes, and scrollbar behavior                                                                                                                                                                   |
| Website visual sweep    | 125 screenshots at 375/768/1024/1440px; reviewed; zero page overflow and browser errors                                                                                                                                                                                                                                                    |
| Production interactions | Inventory filters/sorts/keyboard rows, palette cross-section selection, budget filters, detail/file/history navigation, tree resizing, Markdown links, file statuses, scoped actions/updates/grants, invocation return filters, all time windows, reset/expansion, error/empty states, and marketing interactions                          |
| Regression suite        | 67 passing tests, including API arithmetic, scope/grant rules, immutable responses, retained history, reset concurrency, message validation, provenance, and browser-tool failure reporting, plus new coverage of version-specific paths, lint destinations, overlapping grants, missing projects, scan events, and shared-install updates |
| Quality gates           | TypeScript, renderer integrity, ESLint, Prettier, generated mirrors, production build, full visual sweep, and production QA                                                                                                                                                                                                                |

Local evidence lives in `.qa/app-reference/`, `.qa/results.json`, and `.visual-verify/`. Screenshot baselines are local and ignored. Reference comparison excludes operating-system window chrome and verifies the listed Windows renderer states; it is not a native macOS test. Native actions remain deliberately simulated in the browser.

## Maintenance

Run `npm run preview:sync -- <reviewed-app-checkout>` to refresh the snapshot, then review provenance and dependency changes. Run all quality gates and `node scripts/qa/compare-app.mjs <app-checkout>` before accepting a new reference. The comparison uses zero pixel tolerance, including antialiasing. Never hand-edit the snapshot or generated `AGENTS.md`/`.agents/skills/` mirrors.

The reference build imports the original app stylesheet and explicitly includes its renderer directory in Tailwind source discovery. The reference's ignored temporary build root otherwise omits classes stored in constants, producing an incomplete reference stylesheet. This source declaration changes no app token, component, or style rule. Both reference and website still use identical synthetic API data, fonts, platform, viewport, clock, and theme.

The host controller is named `src/product-preview-host.js`, and fixtures/derivations live in `src/preview/fixtures.ts` and `analytics.ts`; these replace the old filenames proposed in the original plan.
