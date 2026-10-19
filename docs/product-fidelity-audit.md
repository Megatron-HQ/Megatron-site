# Megatron product fidelity audit

Reviewed on October 18, 2026 and updated on October 19, 2026 against the clean
desktop app checkout at `ae0f0a1a862cac263880274fed4c46c27a9a18fc` (Megatron
0.1.0).

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
contains 92 source/license files and a provenance manifest. Four integration
patches scope Tailwind discovery, support trusted host navigation, and prevent
the two inventories from taking focus from an inactive iframe. Renderer files
are never manually edited.

## What the product displays

| Area              | Actual behavior and its limits                                                                                                                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Skills            | Global, explicitly granted project, and installed plugin skills share an inventory. Search, source/project/plugin filters, sorting, lint status, token estimates, disabled states, synced copies, hook declarations, and usage help explain each row. Codex `.agents/skills` are outside its inventory scope.            |
| Skill details     | Definitions, metadata, source paths, estimated listing/body tokens, lint findings, recent invocations, trigger types, and retained invocation history. A shadowed project skill is distinguished from the global skill that takes precedence.                                                                            |
| File viewer       | Searchable, virtualized, resizable tree; Markdown rendering and plain-text previews; explicit unreadable, too-large, and preview-limit states. Opening a file never executes its scripts.                                                                                                                                |
| Lint              | Five deterministic checks: YAML frontmatter, description presence, local file references, referenced MCP configuration, and name collisions. Findings carry severity and explanations, with source lines where the rule supplies them. No semantic LLM analysis.                                                         |
| Plugins           | Identity is `name@marketplace`. User, project, and local installs can have different versions and enablement. Inventory rows and details retain repository context; scoped skill counts come from each install's paths. Usage labeled “all projects” is broader than a selected install.                                 |
| Plugin actions    | Enable, disable, update, and confirmed uninstall use Claude's CLI. Project/local actions need a recorded project and readable, granted settings. Missing folders, missing grants, unknown enablement, and unrecorded projects are distinct states. New plugin installation and marketplace management remain in the CLI. |
| Update indicators | Available versions come from local marketplace data, rather than a live remote update check. A completed update requires restarting Claude Code to take effect.                                                                                                                                                          |
| Activity          | Prompts, sessions, active days, slash commands, chronological trends, weekday/hour patterns, and project rankings. Nonzero day and hour bars open details with the clipped interval, sessions, prompts, slash commands, and projects; prompt text is never stored.                                                       |
| Cost              | Estimated API-equivalent usage, model/version breakdowns, time and project allocations, and hour/day drilldowns. Recorded cumulative cost is reconciled across continuations and subagents. Allocations are approximate; missing or undated data is reported as coverage gaps. These are not subscription bills.         |
| Models            | Logical turns, distinct models, output tokens, recorded reasoning effort, and the model/effort matrix. Absent effort is labeled “Not recorded.”                                                                                                                                                                          |
| Usage: Skills     | Recorded invocations, unique skills, active sessions, trends, trigger types, drilldowns, and proportional cost attribution. General work accounts for unassigned usage. User/autonomous classification uses a preceding-message heuristic.                                                                               |
| Resident tax      | One qualifying recent cold session's measured first-turn cache write. Skills, agents, SessionStart hooks, MCP instructions, and project instructions are estimated categories; the remainder is not safely itemized. The empty state explains when a sample is unavailable.                                              |
| Listing budget    | A separate estimate for enabled, model-invocable global/plugin listings, excluding project, disabled, and user-only listings. It is not the resident-tax measurement.                                                                                                                                                    |
| Projects          | Granted-folder and repository hierarchies, nested Git boundaries, empty repositories, aggregate and direct-item filters, and cached unavailable entries. Hierarchy labels preserve context and casing; nested sidebar entries show names relative to their group. Empty Git repositories nested in another are omitted.  |
| Settings          | Light/Dark/System appearance, folder management, rescan, data-folder reveal, and app version. Appearance and section preferences persist in the desktop app; the browser sample resets on reload.                                                                                                                        |

Activity, Cost, Models, and Skills have independent rolling 24-hour, 7-day, and
30-day windows. Resident tax uses its qualifying session sample instead.

The desktop app refreshes on focus, folder-grant changes, successful plugin
actions, and manual rescan. It does not continuously watch the filesystem.
Core inventory and analysis run locally without Megatron telemetry or external
LLM calls; Claude CLI plugin actions can use the network.

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

## Verification results

| Check                      | Result                                                                                                                                                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production build           | TypeScript, imported renderer integrity, and both Vite entries pass.                                                                                                                                                                                                       |
| Regression tests           | 68 pass. New tests were first observed failing for the path/count, lint-line, enablement, uninstall, grant, scan-event, missing-folder, revoked-action, and shared-version defects.                                                                                        |
| Native renderer comparison | 34 captures across 17 states at 1200×720 and 860×600, with zero differing RGBA pixels, including antialiasing. Both renderer processes report no browser errors.                                                                                                           |
| Responsive visual sweep    | 125 captures at 375/768/1024/1440px; zero page overflow, console warnings/errors, or uncaught page errors. All 70 changed captures were reviewed and accepted; 55 matched existing baselines.                                                                              |
| Changed content            | Complete plugin explanations and the expanded privacy FAQ answer reviewed separately at 375px and 1440px.                                                                                                                                                                  |
| Production interaction QA  | Passes inventory/search/sort, keyboard navigation, file previews/resizing, lint and history views, scoped plugin actions, all five Usage panels/windows, reset, expansion/Escape, missing-folder action blocking, parent grants/revocation, and empty nested repositories. |
| Marketing and privacy QA   | Copying, FAQ disclosure, mobile navigation, contained panning/focus reveal, reduced motion, no-JavaScript content, and zero external runtime requests pass.                                                                                                                |
| Repository quality         | ESLint, Prettier, generated-mirror integrity, and diff whitespace checks pass. The desktop app checkout and the real Git staging area are unchanged.                                                                                                                       |

Local evidence stays in ignored directories: `.qa/app-reference/results.json`
contains native comparison results; `.qa/results.json` records interactive QA;
`.qa/accuracy-tests.log` and `.qa/accuracy-visual.log` record suite results.
`.qa/product-fidelity-review/` contains review sheets and the complete changed
content captures. Accepted responsive baselines remain in
`.visual-verify-baselines/`.
