# Interactive preview implementation

The website embeds Megatron's actual React renderer. Skills, Plugins, all seven Usage panels, command palette, settings, folder management, budget audit, detail/file views, charts, and dialogs use the app's existing components and stylesheet. History owns the annual summary, yearly contribution calendar, and monthly project timeline; Activity retains its independent recent-activity window.

## Renderer authority

- App revision: `da368fef9e681840fa40f3e85df6638ba9345205`, version `0.1.0`; exact source hashes pin the imported files.
- Snapshot: 102 files in `vendor/megatron/`, including shared API types, MIT license, and existing third-party attribution.
- Four recorded integration patches: scoped Tailwind discovery, trusted host navigation, and inactive-frame autofocus guards in the two inventories. App tokens, layouts, labels, icons, and motion rules are preserved.
- `npm run build` checks TypeScript and snapshot hashes before building the marketing and preview entries. Normal builds and CI require no sibling app checkout.
- The original app repository remains unchanged.

## Browser integration

`src/product-preview-host.js` owns the external section tabs, Tokens/Activity/History/Cost navigation, loading announcements, Reset sample, and native modal expansion. It retains the same iframe and state during expansion, restores focus on close, and validates message origin and source. Escape retains the app's dialog, tooltip, effort-selection, and file/detail behavior before closing expansion.

The preview retains an 860px minimum client width. At narrower website widths, visitors pan the contained desktop viewport; keyboard focus reveals controls. The landing page itself has no horizontal overflow. Marketing navigation, mobile menu/Escape, installation copying, FAQ, scroll effects, and reduced motion remain intact.

`src/preview/api.ts` provides the complete typed browser API over session-only sample state. Folder grants, native plugin commands, rescans, external app links, and data-folder reveal are simulated. No visitor filesystem, CLI, database, backend, or telemetry access is introduced. Reset cancels stale pending actions and restores the original state.

The November 5 snapshot imports `da368fe` through the existing sync tool. The
actual renderer handles inventory-only query invalidation, deleted-selection
recovery, child-scoped availability notices, and retained manual-rescan feedback.
`src/preview/inventory.ts` applies six sample changes to an independent inventory
source, so subsequent folder grants cannot resurrect deleted files or projects.
Moves produce new skill identities while preserving historical project paths;
cleanup removes only scoped installs and their unshared skill definitions.

The host's labeled native select and Simulate change button send a validated
`megatron-preview:inventory-change` command through the existing origin/source
checks. The adapter emits `scanSkills`, `scanPluginRegistry`, and `runLinter`
completion sources without re-ingesting Usage. A completion acknowledgment releases
the host button even when a sequence requires Reset. Reset suppresses pending
mutations and notices. Unreadable sample children retain cached entries; directly
granted missing sample repositories are retained independently of healthy parents.
No timer, native watcher, new IPC method, or renderer integration patch is added.

`scripts/qa/inventory.mjs` verifies these flows at 375, 768, 1024, and 1440px and
captures unreadable, moved, removed-plugin, preserved-Usage, and retained-rescan
states under `.qa/inventory/`. It is included in production QA.

The October 18 product review corrected version-specific plugin paths/counts, shared-install updates and uninstalls, aggregate enablement, missing-folder state, overlapping parent grants, scan lifecycle events, and lint line destinations. Add Folder first grants the sample `C:\Clients\docs-site` repository; a second click grants its `Clients` parent. See the [product fidelity audit](product-fidelity-audit.md) for the complete capability and content review.

The October 19 update imports the Activity details dialog. The sample overview gives every Activity day and hour its clipped interval, sessions, prompts, bare slash commands, and project ranking, derived by the same summary as the window totals. Nested sidebar projects show parent-relative names (`tools/cli` under `monorepo`). The app now hides empty Git repositories nested inside another repository; the sample nested repository stays listed because it represents one with its own `.claude` settings and no skills.

The History year-in-review refresh follows the app's November 4 approved plan and UI amendment. The pinned header's year selector controls active days, the longest verified streak and dates, the busiest day, prompts per active day, the calendar, and project-month totals. Busiest day opens the existing day dialog and restores focus on close. The timeline retains the app's neutral scale, eight-project expansion, project-label disambiguation, coverage tooltips, and arrow-key inspection. Annual responses derive from the same daily sample records as day details; future records and bare slash commands cannot inflate prompt totals. All archived sample years include enough projects to exercise expansion.

The November 3 refresh imports the separate History panel, compact token values with exact-count tooltips, aligned calendar weekdays, and dashed unavailable-prompt days that still open token details. The sample includes token-only archived days. Daily token trends and history details recompute the next local midnight after daylight-saving jumps. Rescans emit matching run IDs with transcript/token-archive/prompt/archive progress before completion, and reset suppresses stale progress. The actual Settings dialog waits for displayed data to refresh before reporting success; startup diagnostics remain distinct from manual rescans.

A comparison with a real Windows installation found two sample-data differences. Real setups usually grant a parent folder, so repositories appear by name under it; the sample granted each repository directly, which the app labels with its parent (`Projects/web-app`). The sample now grants `C:\Dev`, and its repositories appear as `api`, `empty-lab`, `monorepo`, and `web-app` beneath it. Windows installations also record native backslash paths, which the sample now uses for grants, sources, installs, and session projects. The native comparison adds the expanded project tree and Activity details dialog.

The November 3 update imports Tokens, the annual contribution calendar and historical day details, plus plugin progress and folder-action fixes. `src/preview/usage-history.ts` derives token windows and calendar responses from synthetic token records and archived daily summaries. The current and two preceding years share one intensity scale. Recent calendar details and Activity totals use the same session events. Missing token data stays distinct from zero, and dates before sample coverage stay distinct from inactive days. The website stores no visitor history; the sample resets on reload.

The November 4 refresh imports the `/context` rebuild and removed-folder scan
fixes. `src/preview/context.ts` supplies independent synthetic baseline and
recorded-request responses for the new preload APIs. The real renderer owns
Refresh, deferred/reserved/free display, category tables, recorded system/tool/
breakpoint disclosures, hook and MCP details, failure states, and focus return.
Missing-only scans produce informational Settings details and successful manual
rescan feedback; genuine mixed warnings remain visible. Marketing and FAQ copy
now describe /context and its ability to start configured hooks/MCP servers.
See the [detailed upstream review](upstream-sync-2026-11-04.md) for this run's evidence.

## Previous verification evidence (November 3)

| Check                   | Result                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App comparison          | 54 captures across 27 states at 1200×720 and 860×600, with identical RGBA pixels                                                                                                                                                                                                                                                                                                                              |
| Reference conditions    | Original pinned renderer in hidden Electron; identical synthetic API, frozen clock, DPR 1, en-GB locale, America/Chicago timezone, fonts, themes, and scrollbar behavior                                                                                                                                                                                                                                      |
| Website visual sweep    | 165 screenshots at 375/768/1024/1440px; reviewed; zero page overflow and browser errors                                                                                                                                                                                                                                                                                                                       |
| Production interactions | Inventory filters/sorts/keyboard rows, palette cross-section selection, budget filters, detail/file/history navigation, tree resizing, Markdown links, file statuses, scoped actions/updates/grants, invocation return filters, all seven Usage panels, independent token periods, annual year selection, calendar keyboard/day-detail focus, reset/expansion, error/empty states, and marketing interactions |
| Regression suite        | 82 passing tests, including API arithmetic, scope/grant rules, immutable responses, retained history, reset concurrency, message validation, provenance, and browser-tool failure reporting, plus new coverage of version-specific paths, lint destinations, overlapping grants, missing projects, scan events, and shared-install updates                                                                    |
| Quality gates           | TypeScript, renderer integrity, ESLint, Prettier, generated mirrors, production build, full visual sweep, and production QA                                                                                                                                                                                                                                                                                   |

Local evidence lives in `.qa/app-reference/`, `.qa/results.json`, and `.visual-verify/`. Screenshot baselines are local and ignored. Reference comparison excludes operating-system window chrome and verifies the listed Windows renderer states; it is not a native macOS test. Native actions remain deliberately simulated in the browser.

Current verification is recorded in the [November 5 upstream review](upstream-sync-2026-11-05.md#verification): 102 passing tests, 241 responsive captures, full production interaction QA including all six live-refresh examples, and 82 exact renderer comparisons. The earlier table remains historical evidence for the initial integration.

## Maintenance

Run `npm run preview:sync -- <reviewed-app-checkout>` to refresh the snapshot, then review provenance and dependency changes. Run all quality gates and `node scripts/qa/compare-app.mjs <app-checkout>` before accepting a new reference. The comparison uses zero pixel tolerance, including antialiasing. Never hand-edit the snapshot or generated `AGENTS.md`/`.agents/skills/` mirrors.

The reference build imports the original app stylesheet and explicitly includes its renderer directory in Tailwind source discovery. The reference's ignored temporary build root otherwise omits classes stored in constants, producing an incomplete reference stylesheet. This source declaration changes no app token, component, or style rule. Both reference and website still use identical synthetic API data, fonts, platform, viewport, clock, and theme.

The reference also imports the preview's document mounting rules from
`src/preview/styles.css`: full-height roots, zero body margin, and hidden outer
body overflow. This gives both renderers the same usable client width. Without
that normalization, Windows Electron adds an outer 10px scrollbar on narrow
History screens, shifting their layout despite identical renderer source.
Internal app scrolling remains app-owned. This comparison measures renderer
parity at matching client dimensions, not native window or outer-document chrome.

The host controller is named `src/product-preview-host.js`, and fixtures/derivations live in `src/preview/fixtures.ts` and `analytics.ts`; these replace the old filenames proposed in the original plan.
