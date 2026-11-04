# Megatron upstream review — November 4, 2026

Compared the website's pinned `25659e3e7a133491c77634089d0ac9965d87807f`
with the local app's `e1def740b3d5c86dbdddf1f51862eab497a883b6` (0.1.0).
The net app diff contains 66 files, 3,010 insertions, and 1,365 deletions.
The imported renderer/shared/preload files match the app's committed source;
the app checkout was only read. The site snapshot now contains 102 source/license
files plus provenance, with the same four documented browser integration patches.

## Commit review

| Commit    | Change and website impact                                                                                                                                                                                                                                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e5aaeb0` | Rebuild Resident tax around Claude Code's own `/context`; replace cold-session sampling with independent baseline/request APIs, new categories, Refresh, and drilldowns. Requires renderer, adapter, marketing, and QA changes.                                                                                         |
| `6fbc4e8` | Merge the `/context` branch into main.                                                                                                                                                                                                                                                                                  |
| `6fcdb28` | Update Electron 43.7.9 to 43.8.7 and resolve patched undici/zod/fast-uri dependencies. Add a tested dependency-audit wrapper accepting the specifically documented minimatch advisory while retaining the moderate threshold. These are desktop/build changes; the website's renderer dependencies need no new package. |
| `d34380c` | Handle removed/replaced project folders and temporary-directory discovery without misleading scan warnings; preserve explicit grants and genuine errors. Requires current renderer and representative browser scan responses.                                                                                           |
| `e1def74` | Merge History/Tokens fixes into main. The site's previous snapshot already included History/Tokens at `25659e3`; those existing features remain intact.                                                                                                                                                                 |
| `327f9c9` | Earlier merge of token/calendar work on main, included in the ancestry difference. It does not represent a second missing implementation of those already-pinned features.                                                                                                                                              |

## Resident tax and API changes

The old measurement used a qualifying first-turn cache write and estimated
categories. That parser, database table/query, and token estimator are removed.
`UsageOverview` no longer carries `residentTax`.

`getContextBaseline()` now returns parsed Claude Code `/context` output or an
explicit failure with optional unparsed output. The desktop runs
`claude -p /context --output-format json --no-session-persistence` from its own
empty context-baseline folder. This excludes project configuration. It uses a
60-second timeout and a larger output buffer for deferred-tool tables.
Concurrent measurements share one CLI run; the renderer retains the result in
memory for the launch and refreshes on demand, independently of index scans.
The local command makes no model API request, but can start configured
SessionStart hooks and MCP servers.

The panel shows used tokens / context window / percentage; loaded categories;
reserved autocompact space; free space; and a separate deferred-tool ledger.
Deferred tools do not inflate used tokens. `/context` item tables supply
per-item token displays and sort keys. Generic category parsing allows new
Claude categories through. The configured skill-listing budget remains separate.

`getRecordedRequest()` reads the first `repl_main_thread` request from the newest
qualifying interactive transcript. Claude Code 2.1.300+ request-shape records
provide system blocks, tool definitions, and cache breakpoints. Only hook/MCP
attachments preceding the first request are included. Older/headless/subagent
records do not qualify. Reading stops when the request and its shape are found;
the response is read on demand and is not added to the index. Tools rank by exact
serialized character size, not estimated tokens. Recorded session details can
include project configuration, so they explain a different scope from the baseline.

The renderer preserves synchronized bar/row hover and focus, reduced motion,
neutral fills, reserved-space hatching, keyboard-accessible drilldowns,
expandable text/JSON, close/Escape behavior, and focus return. Refresh, loading,
CLI failure, unreadable raw output, and unavailable recorded-session states are
part of the imported interface.

The website implements both APIs with independent synthetic fixtures. Its 32k
used categories sum to 32,000; 33k reserve plus 935k free completes a 1M window.
24.3k deferred tools remain outside the used total. The landing graphic groups
system prompt and tools into 16k and uses those same totals. Fixture request
character sizes derive from their actual synthetic text/JSON. Reset suppresses
notices from a pending measurement. No browser CLI or transcript access is added.
The short category tables are illustrative examples, not an inventory-derived
measurement of the sample skill rows.

## Project discovery and scan changes

- Automatic discovery skips `.tmp` and `.temp`, with Windows case-insensitive
  matching for excluded directory names. Explicitly granted repositories inside
  an excluded directory remain discoverable.
- Prior catalog entries and cached project skills under newly excluded paths
  are reconciled; removed projects covered by grants can retain cached data.
- `ENOENT` and `ENOTDIR` both describe missing sources, including a directory
  replaced by a file. Actual permission/read failures remain distinct.
- Project plugin enablement checks directory existence correctly and retain
  missing-project action restrictions.
- `isMissingProjectOnlyScan` recognizes partial scans whose affected sources
  contain only `project_missing` issues and no failure reason. The app suppresses
  the warning banner for that case, labels Settings details “Missing project
  folders,” and reports a completed manual rescan. Mixed real warnings stay visible.
- The browser's missing-project and mixed-warning scenarios exercise these
  states while retaining the existing folder grants and cached inventories.

## Website propagation

| Area                   | Applied update                                                                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pinned renderer        | Imported through `preview:sync`; hashes and revision regenerated in provenance; no hand-edited vendor files.                                                                                                                     |
| Browser adapter        | New context baseline and recorded-request APIs; obsolete resident overview removed; missing-only and mixed scan results supplied.                                                                                                |
| Landing page           | Current `/context` explanation, consistent 32k graphic, CLI requirements, missing-folder/discovery guidance, and corrected hook behavior.                                                                                        |
| FAQ                    | Measurement scope/lifecycle, deferred/reserved space, request recording requirements, and synthetic website behavior explained.                                                                                                  |
| Design/docs            | Current revision, API semantics, interaction preservation, and historical plan/evidence clearly distinguished.                                                                                                                   |
| Automated verification | Baseline arithmetic/immutability, recorded-request consistency, failure/null states, reset concurrency, missing/mixed scans, Refresh, every category dialog, disclosures, Escape/focus return, dark mode, and responsive states. |

Existing History/Tokens windows, calendar/tooltips, Skills/Plugins controls,
search/sort/file navigation, scoped actions, settings, expansion/reset/panning,
host messaging, marketing navigation/copy/FAQ, and reduced motion are retained.

## Complete upstream file inventory

`A` = added, `M` = modified, `D` = deleted. Generated `.agents` entries mirror
their canonical `.claude` counterparts in the app.

```text
A .agents/skills/visual-verify/context-baseline-fixture.mjs
M .agents/skills/visual-verify/fixture-entry.mjs
M .agents/skills/visual-verify/scenarios.mjs
M .agents/skills/visual-verify/usage-history-fixture.mjs
A .claude/skills/visual-verify/context-baseline-fixture.mjs
M .claude/skills/visual-verify/fixture-entry.mjs
M .claude/skills/visual-verify/scenarios.mjs
M .claude/skills/visual-verify/usage-history-fixture.mjs
M .github/workflows/ci.yml
M .github/workflows/release.yml
M README.md
M docs/data-model.md
M docs/security-hardening.md
M docs/skill-scanner.md
M docs/transcript-ingest.md
M docs/usage-analytics.md
M docs/usage-view-ui-spec.md
M package-lock.json
M package.json
A scripts/audit.mjs
A scripts/audit.test.mjs
A src/main/claude-process.test.ts
A src/main/claude-process.ts
A src/main/context-usage.test.ts
A src/main/context-usage.ts
M src/main/db/queries.test.ts
M src/main/db/queries.ts
M src/main/db/schema.sql
M src/main/db/schema.test.ts
M src/main/index.ts
M src/main/ingest/claude-settings.test.ts
M src/main/ingest/claude-settings.ts
M src/main/ingest/cost-parser.ts
M src/main/ingest/project-discovery.test.ts
M src/main/ingest/project-discovery.ts
A src/main/ingest/recorded-request.test.ts
A src/main/ingest/recorded-request.ts
D src/main/ingest/resident-context-parser.test.ts
D src/main/ingest/resident-context-parser.ts
M src/main/ingest/skills-scanner.test.ts
M src/main/ingest/skills-scanner.ts
D src/main/ingest/token-estimate.test.ts
D src/main/ingest/token-estimate.ts
M src/main/ingest/transcript-scanner.test.ts
M src/main/ingest/transcript-scanner.ts
M src/main/ipc-security.test.ts
M src/main/permissions.test.ts
M src/main/permissions.ts
M src/main/plugin-actions.ts
M src/preload/index.d.ts
M src/preload/index.ts
M src/renderer/src/assets/main.css
M src/renderer/src/components/ContextBudgetDialog.tsx
M src/renderer/src/components/ScanStatus.tsx
M src/renderer/src/components/SettingsDialog.tsx
M src/renderer/src/components/usage/ResidentCompositionBar.tsx
A src/renderer/src/components/usage/ResidentDrillDialog.tsx
M src/renderer/src/components/usage/ResidentTaxSection.tsx
A src/renderer/src/components/usage/resident-drill.test.ts
A src/renderer/src/components/usage/resident-drill.ts
M src/renderer/src/lib/use-scan-banner.ts
M src/renderer/src/views/UsageView.tsx
M src/shared/ipc.ts
M src/shared/scan-banner.test.ts
M src/shared/scan-banner.ts
M src/shared/version.ts
```

## Verification

| Check                    | Result                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production build         | Passes TypeScript, pinned-renderer integrity, and both Vite entries. Vite retains a nonblocking advisory for the preview chunk exceeding 500 kB.                                                                                                                                                                    |
| Regression suite         | 87 passing tests. New API/scan assertions were first observed failing, then passing. A browser-discovered startup-warning fixture error also has a failing-then-passing regression assertion.                                                                                                                       |
| Native reference         | 76 captures across 38 states at 1200×720 and 860×600; zero differing RGBA pixels and no browser errors. Includes all category dialogs, system tools/cache breakpoints, and dark Resident tax.                                                                                                                       |
| Production interactions  | Passes the complete QA suite, including context Refresh/disclosures/Escape/focus return, independent context availability, missing-only successful rescans, mixed startup warnings, existing inventories/actions/usage, expansion/reset, reduced motion, no-JavaScript content, and zero external runtime requests. |
| New narrow-screen states | All 32 checks pass: 16 new context/diagnostic scenarios at 375px and 768px. Keyboard activation exercises host focus reveal when controls are outside the visible part of the 860px desktop canvas.                                                                                                                 |
| Marketing content        | Eight additional captures review the context graphic and keyboard-opened measurement FAQ at all four widths; no page overflow or page errors.                                                                                                                                                                       |
| Responsive full sweep    | 229 captures across 375/768/1024/1440px; zero page overflow, console warnings/errors, or uncaught page errors. All 64 new and 20 changed captures reviewed and accepted; 145 match prior baselines. Narrow screens retain the intended 860px desktop canvas with contained panning and keyboard focus reveal.       |
| Repository quality       | ESLint, Prettier, generated-mirror integrity, and whitespace checks pass. Mirrors regenerate through the existing hook with a temporary index; the real staging area stays unchanged. All 102 imported source hashes still match the app checkout.                                                                  |

Run evidence stays in ignored `.qa/` and `.visual-verify/` directories:
`site-sync-tests.log`, `site-sync-build.log`, `site-sync-qa.log`,
`site-sync-reference.log`, `site-sync-narrow.log`, `site-sync-visual.log`,
`app-reference/results.json`, and `site-sync-review/`.
