# Interactive preview implementation

The website embeds Megatron's React renderer. Skills, Plugins, MCP servers, all eight Usage panels, the command palette, Settings, detail views, charts, and dialogs use the app's components and stylesheet. History includes the annual summary, yearly contribution calendar, and monthly project timeline. Activity has its own recent-activity window.

## Renderer authority

- The v0.5.1 snapshot pins app revision `f48cacf8d0e27523c31c48841a183fd9d081e2e7`. The manifest records the shared API, project identity, release catalog, sidebar icon, license, and renderer source hashes.
- The integration patches scope Tailwind discovery, connect trusted host navigation, protect focus in the three inventories, and make the project identity and What's New helpers usable by Node tests.
- `src/preview/runtime.ts` installs `window.api` before any app module evaluates, as the desktop preload does. Since 0.2.0 the onboarding dialog reads `window.api.platform` at import time.
- 0.2.0 sample behavior: the updater reports `unsupported`, so Check now stays disabled while the automatic-check switch works for the session; the first-run welcome stays closed on load and opens from Settings → Show welcome (or `?scenario=onboarding`); the sample home is `C:\Users\demo`, outside every sample project, so folder suggestions appear; stale-skill markers, plugin contents, and non-overlapping grants follow the desktop rules over sample data.
- `npm run build` checks TypeScript and snapshot hashes before building the marketing and preview entries. Normal builds and CI require no sibling app checkout.
- The original app repository remains unchanged.

## Browser integration

`src/product-preview-host.js` owns the external section tabs, Tokens/Activity/History/Cost navigation, loading announcements, Reset sample, and native modal expansion. It retains the same iframe and state during expansion, restores focus on close, and validates message origin and source. Escape retains the app's dialog, tooltip, effort-selection, and file/detail behavior before closing expansion.

The preview retains an 860px minimum client width and scales the desktop layout at narrower website widths. The expanded view uses the same session and supports keyboard focus and Escape. The verification suite checks horizontal overflow, navigation, installation copying, FAQ controls, and reduced motion.

`src/preview/api.ts` provides the complete typed browser API over session-only sample state. Folder grants, native plugin commands, rescans, external app links, and data-folder reveal are simulated. No visitor filesystem, CLI, database, backend, or telemetry access is introduced. Reset cancels stale pending actions and restores the original state.

The v0.3.0 sample groups model and project tokens in each chart interval. A partial daily bucket uses its clipped time boundaries, while an empty interval stays unavailable. The browser shows the bundled What's New card from Settings and includes a linked skill with its target. Claude Code Folder choices switch between synthetic inventories and usage histories. Reset restores the default folder. The `worktree` sample credits a recorded worktree session to the Canonical Checkout and retains the recorded worktree path in the skill's history. The [November 18 sync review](upstream-sync-2026-11-18.md) records the upstream range and verification.

The MCP inventory, detail, and Usage view share fictional archived and live tool-call records. The browser adapter stores redacted declaration summaries and simulates check and sign-in results in memory. A connector discovered during a general check is eligible for both sample sign-in actions even with zero calls. The full preview opens MCP details from Usage, and the landing analytics card passes a validated sample server ID to the full preview. See the [v0.5.1 sync record](upstream-sync-2026-11-25.md).

The first November 5 snapshot imported `da368fe` through the existing sync tool. The
actual renderer handles inventory-only query invalidation, deleted-selection
recovery, child-scoped availability notices, and retained manual-rescan feedback.
`src/preview/inventory.ts` applies six sample changes to an independent inventory
source, so subsequent folder grants cannot resurrect deleted files or projects.
Moves produce new skill identities while preserving historical project paths;
cleanup removes only scoped installs and their unshared skill definitions.

Inventory simulations run through the QA harness using the validated
`megatron-preview:inventory-change` command and its completion acknowledgment.
The public toolbar contains section tabs, reset, and expansion controls. The
adapter retains inventory-only refresh and recovery behavior for verification;
no visitor-facing live-refresh strip, native watcher, or timer is introduced.

The main preview publishes its resolved appearance through validated same-origin
messages. The host relays the latest appearance to the Resident Tax sample and
its enclosing card, including readiness handshakes for either frame load order.
Dark, Light, System changes, and Reset update the sample without remounting or
losing an open category dialog.

`scripts/qa/inventory.mjs` verifies these flows at 375, 768, 1024, and 1440px and
captures unreadable, moved, removed-plugin, preserved-Usage, and retained-rescan
states under `.qa/inventory/`. It is included in production QA.

The next November 5 refresh imports `83c73dc` and `ffd8864`. The actual renderer
owns global label disambiguation,
searchable project rankings, and timeline search. `src/preview/usage-projects.ts`
keeps a session-only catalog independent of live inventory and uses the upstream
grouping helpers for Activity, cost, tokens, monthly timelines, and day details.
Stable sample IDs survive inventory removal and grant changes. Links retain raw
source paths, never grant folder access, and reset on reload or Reset sample.

`SamplePrompt` records preserve prompt multiplicity and session identity separately
from token/turn events. Activity and History derive prompt totals from these same
records; bare slash commands remain separate. Partial and unavailable examples
exercise the imported coverage states. Tokens continue to come from token records.

The QA harness retains nine inventory examples. Pending-folder coverage keeps
cached skills/plugins while availability is unknown, preserves a confirmed
warning during retry, and clears it after discovery. The project checks cover
retained-location search, unchanged totals, and prompt coverage at all widths.
Manual project linking and unlinking are deferred: the imported Usage view no
longer renders the Manage projects button or dialog. Existing identities and
confirmed links remain in the catalog. Historical integration details remain in
the [November 5 audit](upstream-sync-2026-11-05-usage-projects.md).

The October 18 product review corrected version-specific plugin paths/counts, shared-install updates and uninstalls, aggregate enablement, missing-folder state, overlapping parent grants, scan lifecycle events, and lint line destinations. Add Folder first grants the sample `C:\Clients\docs-site` repository; a second click grants its `Clients` parent, which absorbs it under Megatron 0.2.0's non-overlapping grant rule, and a third reports it as already included. See the [product fidelity audit](product-fidelity-audit.md) for the complete capability and content review.

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

| Check                   | Result                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| App comparison          | 54 captures across 27 states at 1200×720 and 860×600, with identical RGBA pixels                                                                                                                                                                                                                                                           |
| Reference conditions    | Original pinned renderer in hidden Electron; identical synthetic API, frozen clock, DPR 1, en-GB locale, America/Chicago timezone, fonts, themes, and scrollbar behavior                                                                                                                                                                   |
| Website visual sweep    | 165 screenshots at 375/768/1024/1440px; reviewed; zero page overflow and browser errors                                                                                                                                                                                                                                                    |
| Production interactions | Inventory filters, row keyboard navigation, palette cross-section selection, detail and file navigation, scoped plugin and MCP actions, all eight Usage panels, chart and calendar drilldowns, reset, expansion, error and empty states, and marketing interactions                                                                        |
| Regression suite        | 82 passing tests, including API arithmetic, scope/grant rules, immutable responses, retained history, reset concurrency, message validation, provenance, and browser-tool failure reporting, plus new coverage of version-specific paths, lint destinations, overlapping grants, missing projects, scan events, and shared-install updates |
| Quality gates           | TypeScript, renderer integrity, ESLint, Prettier, generated mirrors, production build, full visual sweep, and production QA                                                                                                                                                                                                                |

Local evidence lives in `.qa/app-reference/`, `.qa/results.json`, and `.visual-verify/`. Screenshot baselines are local and ignored. Reference comparison excludes operating-system window chrome and verifies the listed Windows renderer states; it is not a native macOS test. Native actions remain deliberately simulated in the browser.

Current verification is recorded in the [v0.5.1 sync record](upstream-sync-2026-11-25.md#verification). The [v0.4.0 sync record](upstream-sync-2026-11-19.md#verification) records the earlier integration.

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
