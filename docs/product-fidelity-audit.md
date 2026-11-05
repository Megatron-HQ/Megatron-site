# Megatron product fidelity audit

Reviewed on October 18, 2026 and updated on November 5, 2026 against the
desktop app at `ffd88643e368e66c7d2782d22ad661040ef66f93`
(Megatron 0.1.0). The renderer provenance records the exact source-file hashes.

## Product and website architecture

Megatron is an Electron desktop control center for **Claude Code**. Its React
renderer calls a typed preload API; the main process inventories allowed Claude
files, indexes them in local SQLite, evaluates deterministic lint rules, and
derives usage views. Plugin changes go through Claude Code's CLI.

The website has two separate entries:

- `index.html`, `src/styles.css`, and `src/main.js` explain the product and source
  setup. Geist fonts and Lucide icons are bundled locally.
- `preview/index.html` mounts the actual imported app renderer. Its typed browser
  API supplies synthetic skills, installs, folders, and session events. It has no
  visitor filesystem, database, terminal, or account integration.

The app's components and styles are imported through `preview:sync`; the snapshot
contains 109 source/license files and a provenance manifest. Five integration
patches scope Tailwind discovery, support trusted host navigation, and prevent
the two inventories from taking focus from an inactive iframe, and make the
shared Usage helper import explicit for Node adapter tests. Renderer files
are never manually edited.

## Tokens and History

Usage project identity is independent of the current inventory and folder grants.
Manage projects searches recorded locations and explicitly links moved or renamed
roots, with reversible links and same-name suggestions. Names alone never merge
projects. Links regroup Activity, cost, tokens, and History without changing source
paths, total usage, or access permissions. Project rankings and monthly timelines
search all projects and linked paths while retaining eight-row expansion.

Activity and History read retained prompt multiplicities for matching intervals;
their independently selected windows may differ. Bare slash commands are excluded
from prompt counts. Partial and unavailable prompt history are disclosed rather
than presented as complete zero activity. Website records are synthetic and reset
with the session. The native private preferences and archive are not accessed.

Tokens shows input, output (including thinking), cache reads, and cache writes; independent 24-hour, 7-day, and 30-day windows; hourly/daily trends; and model/project breakdowns. Time-based figures are estimated shares of recorded session totals. Missing and undated usage are disclosed separately.

History has a prompt-based yearly contribution calendar with year selection, one intensity scale across years, neutral light/dark shading, hover/focus summaries, keyboard navigation, and full-day details including available token figures. Activity retains its recent rolling windows. The desktop app keeps a separate local usage archive without prompt text across rescans, cache rebuilds, and source pruning. Already-deleted activity cannot be recovered. Browser data remains illustrative and session-only. Landing-page analytics, Tokens/Activity/History links, and FAQs reflect these features.

## What the product displays

| Area                 | Actual behavior and its limits                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skills               | Global, explicitly granted project, and installed plugin skills share an inventory. Search, source/project/plugin filters, sorting, lint status, token estimates, disabled states, synced copies, hook declarations, and usage help explain each row. Codex `.agents/skills` are outside its inventory scope.                                                                                                                                                                                              |
| Skill details        | Definitions, metadata, source paths, estimated listing/body tokens, lint findings, recent invocations, trigger types, and retained invocation history. A shadowed project skill is distinguished from the global skill that takes precedence.                                                                                                                                                                                                                                                              |
| File viewer          | Searchable, virtualized, resizable tree; Markdown rendering and plain-text previews; explicit unreadable, too-large, and preview-limit states. Opening a file never executes its scripts.                                                                                                                                                                                                                                                                                                                  |
| Lint                 | Five deterministic checks: YAML frontmatter, description presence, local file references, referenced MCP configuration, and name collisions. Findings carry severity and explanations, with source lines where the rule supplies them. No semantic LLM analysis.                                                                                                                                                                                                                                           |
| Plugins              | Identity is `name@marketplace`. User, project, and local installs can have different versions and enablement. Inventory rows and details retain repository context; scoped skill counts come from each install's paths. Usage labeled “all projects” is broader than a selected install.                                                                                                                                                                                                                   |
| Plugin actions       | Enable, disable, update, and confirmed uninstall use Claude's CLI. Project/local actions need a recorded project and readable, granted settings. Missing folders, missing grants, unknown enablement, and unrecorded projects are distinct states. New plugin installation and marketplace management remain in the CLI.                                                                                                                                                                                   |
| Update indicators    | Available versions come from local marketplace data, rather than a live remote update check. A completed update requires restarting Claude Code to take effect.                                                                                                                                                                                                                                                                                                                                            |
| Activity and History | Activity shows recent prompts, sessions, active days, slash commands, chronological trends, weekday/hour patterns, and project rankings. History separately shows annual prompt contributions, year selection, shared intensity thresholds, and historical day details. Nonzero day and hour bars open details with the clipped interval, sessions, prompts, slash commands, and projects; prompt text is never stored.                                                                                    |
| Tokens               | Input, output (including thinking), cache reads, cache writes, total tokens processed, independent periods, hourly/daily trends, and model/project breakdowns. Time allocations are estimated; missing and undated records are disclosed separately.                                                                                                                                                                                                                                                       |
| Cost                 | Estimated API-equivalent usage, model/version breakdowns, time and project allocations, and hour/day drilldowns. Recorded cumulative cost is reconciled across continuations and subagents. Allocations are approximate; missing or undated data is reported as coverage gaps. These are not subscription bills.                                                                                                                                                                                           |
| Models               | Logical turns, distinct models, output tokens, recorded reasoning effort, and the model/effort matrix. Absent effort is labeled “Not recorded.”                                                                                                                                                                                                                                                                                                                                                            |
| Usage: Skills        | Recorded invocations, unique skills, active sessions, trends, trigger types, drilldowns, and proportional cost attribution. General work accounts for unassigned usage. User/autonomous classification uses a preceding-message heuristic.                                                                                                                                                                                                                                                                 |
| Resident tax         | Claude Code's own /context from an empty folder: a global used/window/percentage baseline, measured on first open per launch and on Refresh, cached in memory. Deferred tools and the autocompact reserve are separate. Category tables use /context values; other drilldowns read system blocks, tool definitions, cache breakpoints, SessionStart output, and MCP instructions from the newest qualifying interactive request on demand without persisting it. Character counts are not token estimates. |
| Listing budget       | A separate estimate for enabled, model-invocable global/plugin listings, excluding project, disabled, and user-only listings. It is not the resident-tax measurement.                                                                                                                                                                                                                                                                                                                                      |
| Projects             | Granted-folder and repository hierarchies, nested Git boundaries, empty repositories, aggregate and direct-item filters, and cached unavailable entries. Hierarchy labels preserve context and casing; nested sidebar entries show names relative to their group. Empty Git repositories nested in another are omitted.                                                                                                                                                                                    |
| Settings             | Light/Dark/System appearance, folder management, rescan, data-folder reveal, and app version. Appearance and section preferences persist in the desktop app; the browser sample resets on reload.                                                                                                                                                                                                                                                                                                          |

Activity, Tokens, Cost, Models, and Skills have independent rolling 24-hour, 7-day, and
30-day windows. Resident tax uses its qualifying session sample instead.

The desktop watches approved project folders, global skills, plugin stores, and
user configuration. Changes settle for one second before an inventory-only scan;
a five-second cap prevents starvation and a 30-second reconciliation recovers
missed events. These are scheduling intervals, not latency guarantees. Inventory
refreshes do not ingest Usage or invalidate open Usage/history queries. Startup,
focus, folder-grant changes, successful plugin actions, and manual full scans retain
their existing behavior. Resident tax still measures independently.

Confirmed missing discovered children below readable grants are removed from
the catalog and derived skill/plugin index. Deleting a `.claude` directory also
removes stale skills. Missing directly granted roots and unreadable sources keep
cached data. An unreadable child does not mark its healthy parent or siblings
unavailable. Removed selections recover to the nearest available ancestor and
removed details close. Moves rediscover paths without rewriting Claude's registry
or reassigning historical Usage. Settings retains the user's manual-rescan result
while current source details show newer background results.

The host's nine sample-change examples exercise live reconciliation without native
watchers, commands, or file access. The missing-project scenarios now explicitly
grant the retained missing repository and keep its readable parent available.
See [the November 5 review](upstream-sync-2026-11-05.md) for the full source audit.
The [follow-up review](upstream-sync-2026-11-05-usage-projects.md) covers the two
subsequent commits. Newly granted folders awaiting discovery remain quiet;
confirmed unavailable states persist during retry and clear after recovery.
Core inventory and analysis run locally without Megatron telemetry or external
LLM calls; Claude CLI plugin actions can use the network. Resident tax's /context
can start configured SessionStart hooks and MCP servers. Its recorded drilldowns
require a qualifying interactive Claude Code 2.1.300+ session and can include
project configuration, unlike the global baseline. The website simulates both APIs.

## November 4 upstream refresh

The [complete upstream review](upstream-sync-2026-11-04.md) covers all 66 changed
files. The renderer was reimported through `preview:sync`; the browser adapter
now implements `getContextBaseline` and `getRecordedRequest` independently of
the usage overview. Missing-only project scans preserve cached data and show
informational Settings details; mixed permission failures still show warnings.
The context illustration, FAQ, CLI setup guidance, design rules, and verification
scenarios reflect the new contract. The old resident-context fixture is removed.

## Corrections made to the site

1. **Renderer drift:** replaced the previous `3a2439c` snapshot with the reviewed
   current renderer. This brings in the current project labels, missing-folder
   explanations, scan lifecycle, scoped plugin displays, and usage labels.
2. **Incorrect plugin counts:** sample skills now live under their corresponding
   version's actual sample install directory. Frontend's user and project rows
   each show one installed skill instead of zero. Updates and uninstalls retain
   skills belonging to other installs, including shared versions.
3. **Incorrect lint destinations:** the missing reference is present on the
   reported line, the MCP warning refers to a real sample tool reference, and
   the missing-description warning opens the empty description field. Sample
   document metadata agrees with the inventory.
4. **Misleading enablement:** disabling only the user install no longer marks a
   plugin's skills disabled everywhere while its project install remains
   enabled. Missing granted projects return unknown enablement and block actions.
5. **Folder-grant fidelity:** the sample catalog includes an empty nested
   repository. The first Add Folder grants `docs-site`; a second Add Folder grants
   its `Clients` parent. Revoking overlapping grants preserves independently
   granted repositories. Revoked access also cancels a pending scoped mutation.
6. **Scan contract:** the browser adapter exposes matching scan-start and
   scan-finished events, active-scan state, and prior-success timestamps. Reset
   prevents stale pending work from mutating the restored sample session.
7. **Product explanations:** the marketing page names all five lint checks and
   all three plugin scopes, explains local marketplace indicators and restart
   requirements, and documents automatic/manual refresh and CLI network access.
8. **Verification maintenance:** browser locators follow the current hierarchical
   labels. The native reference build explicitly scans the original renderer for
   Tailwind classes; an ignored temporary build root must not omit classes held
   in source constants.
9. **October 19 renderer update:** imported `83da887`, `4518be1`, and `ae0f0a1`.
   Sample Activity days and hours now carry the per-bucket details the new
   dialog reads, reconciled with window totals. The nested `tools/cli` sample
   represents a repository with its own `.claude` settings, so it remains listed
   under the new empty-nested-repository rule and shows its parent-relative name.
   The landing page notes that any Activity day or hour opens its details.
10. **Real-installation data shape:** compared with a real Windows installation,
    the sample granted each repository directly, so the sidebar showed
    `Projects/web-app` where installations that grant a parent folder show
    `web-app` under it. The sample now grants the `C:\Dev` parent and uses
    native backslash paths throughout, as Windows installations record them.
11. **November 3 renderer refresh:** History is a separate Usage panel, with its
    own year selection. Activity retains recent-window charts. Compact token
    values expose exact counts on hover and keyboard focus across Tokens,
    Models, Resident tax, and historical details; exact display does not change
    the underlying estimation limits. Calendar weekday labels align with date
    rows, and unavailable-prompt days stay dashed even when token details exist.
12. **Scan and date fidelity:** the browser API emits archive progress with
    matching scan IDs and suppresses stale work after reset. Settings reports
    scanning, reloads displayed data, and then reports completion. Daily token
    buckets and history details recompute local midnight across daylight-saving
    jumps. Incomplete source scans preserve the app's previous archive.

## Visual and interaction preservation

The website retains its approved off-white, ink, acid-lime, Geist, and bordered
editorial design. Marketing styles remain isolated from app styles. The three
scope pills wrap within the existing feature layout; the update explanation is
static text without new hover or pointer behavior.

The app retains its rail/sidebar hover glides, expandable project tree, table
sorting and keyboard rows, command palette, lint/file navigation, tree resizing,
charts, time windows, tooltips, dialogs, theme controls, and reduced motion.
The host retains synchronized section tabs, Cost navigation, sample reset,
state-preserving expansion, focus return, and Escape ordering. Mobile retains
the actual desktop layout at a minimum 860px client width with contained panning
and focus reveal. Marketing navigation, copying, disclosures, and scroll effects
remain in place.

## Distribution and evidence limits

The official GitHub CLI release query returned no published releases on October
18, 2026. The site therefore provides source setup for macOS and Windows and a
link to check releases. Packaging configuration alone is not evidence of a
published downloadable installer. The project is currently MIT-licensed; the
site makes no promise about future pricing.

Every preview metric and definition is illustrative. Browser controls simulate
native actions and do not prove that a visitor's Claude installation, folders,
or CLI will work. Renderer comparison uses synthetic data in hidden Electron;
it does not run scanners or inspect personal Claude sessions. Windows reference
captures do not establish native macOS packaging or window-chrome parity.

## Previous verification results (November 3)

The current [November 5 verification](upstream-sync-2026-11-05.md#verification)
records 102 passing tests, 241 responsive captures without overflow or browser
errors, passing full production QA, and 82 exact native renderer comparisons.
The historical results below describe the earlier integration.

| Check                      | Result                                                                                                                                                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production build           | TypeScript, imported renderer integrity, and both Vite entries pass.                                                                                                                                                                                                        |
| Regression tests           | 82 pass. New tests were first observed failing for the path/count, lint-line, enablement, uninstall, grant, scan-event, missing-folder, revoked-action, and shared-version defects.                                                                                         |
| Native renderer comparison | 54 captures across 27 states at 1200×720 and 860×600, with zero differing RGBA pixels, including antialiasing. Both renderer processes report no browser errors.                                                                                                            |
| Responsive visual sweep    | 165 captures at 375/768/1024/1440px; zero page overflow, console warnings/errors, or uncaught page errors. All 16 new and 73 changed captures were reviewed and accepted; 76 matched existing baselines.                                                                    |
| Changed content            | Tokens/Activity/History links, updated analytics and setup guidance, and expanded history/token FAQ answers reviewed at 375px and 1440px. FAQ keyboard focus stays inside the question row.                                                                                 |
| Production interaction QA  | Passes inventory/search/sort, keyboard navigation, file previews/resizing, lint and history views, scoped plugin actions, all seven Usage panels/windows, reset, expansion/Escape, missing-folder action blocking, parent grants/revocation, and empty nested repositories. |
| Marketing and privacy QA   | Copying, FAQ disclosure, mobile navigation, contained panning/focus reveal, reduced motion, no-JavaScript content, and zero external runtime requests pass.                                                                                                                 |
| Repository quality         | ESLint, Prettier, generated-mirror integrity, and diff whitespace checks pass. The website update reads the app checkout without modifying it and preserves the real Git staging area.                                                                                      |

Local evidence stays in ignored directories: `.qa/app-reference/results.json`
contains native comparison results; `.qa/results.json` records interactive QA;
`.qa/site-sync-tests.log` and `.qa/site-sync-visual.log` record suite results.
`.qa/site-sync-review/` contains the current review sheets, expanded FAQ and setup captures, and accepted screenshot manifest. Accepted responsive baselines remain in
`.visual-verify-baselines/`.
