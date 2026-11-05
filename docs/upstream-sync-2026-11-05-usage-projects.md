# Usage projects and pending folder discovery

Reviewed the two commits after the site's `da368fe` pin and imported the actual
renderer at `ffd88643e368e66c7d2782d22ad661040ef66f93` (Megatron 0.1.0).
The combined range changes 45 files, with 2,161 insertions and 211 deletions.
The sibling app's tracked files were not modified by this website update.

During verification, `0f72565` followed these commits. Its only change is in
`src/main/ingest/plugin-registry.test.ts`: the alias regression fixture builds its
plugin install path from the canonical path returned by `grantPath`. Reviewed the
four-line diff; it changes no runtime behavior, renderer, or website contract.
The renderer pin remains at the last product change, `ffd8864`.

## Commit review

`83c73dc` — **Avoid false refresh warnings for newly granted folders**.
The app's availability resolver distinguishes a grant awaiting discovery from a
confirmed failure. Undefined discovery status stays quiet and keeps cached skill
and plugin counts. Known unavailable, missing, and access-required states remain
visible during retries; successful discovery clears them. The grant itself does
not prove availability, and a healthy parent does not inherit a child's failure.
`App.tsx`, `ProjectNavigation.tsx`, and `project-tree.ts` implement the renderer
behavior; scanner docs, project-tree tests, and both fixture mirrors describe it.

`ffd8864` — **Unify Usage project identity and retained prompt history**.
The native registry stores stable location identities in private preferences,
independently of current grants and discovered inventory. It associates nested
recorded paths with their nearest repository, preserves repository identity, and
separates an inferred child when that child becomes a repository. Explicit links
combine locations without editing source records or permissions and can be undone.
Similar basenames only suggest matches. Windows normalization remains insensitive
to path case and separators; POSIX path case remains significant.

All Usage project aggregates share that identity: Activity windows and buckets,
cost windows and buckets, token windows, calendar months, and day details. Labels
are disambiguated against the complete retained catalog, so switching periods does
not arbitrarily relabel projects. Search covers labels and every linked location,
including rows beyond the collapsed eight; filtered shares retain the full total.
History keeps its existing neutral scale, year ownership, and keyboard tooltips.

Activity now reads retained prompt multiplicities and session identities from the
same archive as History. Bare slash commands stay separate. Counts agree for
identical intervals; independently selected rolling windows and calendar years can
differ. Coverage distinguishes partial/unavailable records from complete zero
activity. The archive retains observed history after source pruning and stores no
prompt text. It cannot recover records removed before ingestion.

## File-by-file impact

| Upstream files                                                                                                                                                                                                                                                                                                                                                                                                           | Website treatment                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main/usage-projects.ts`, `src/main/usage-projects.test.ts`                                                                                                                                                                                                                                                                                                                                                          | Reviewed registry reconciliation, explicit link/unlink validation, nearest-repository ownership, status retention, and stable labels. The sample catalog models these rules in memory; native persistence and filesystem probing are not imported. |
| `src/main/db/queries.ts`                                                                                                                                                                                                                                                                                                                                                                                                 | Reviewed project grouping for Activity, cost, and token responses. The adapter uses the imported shared grouping helpers after computing synthetic aggregates.                                                                                     |
| `src/main/db/usage-history-queries.ts`, `src/main/db/usage-history.test.ts`                                                                                                                                                                                                                                                                                                                                              | Reviewed retained prompt copies, session counts, bare slash exclusion, coverage, and calendar/day grouping. Sample prompt records feed both Activity and History separately from token events.                                                     |
| `src/main/index.ts`, `src/main/theme.ts`                                                                                                                                                                                                                                                                                                                                                                                 | Reviewed registry load/persistence and private preference integration. The browser keeps session-only links and resets them explicitly. No native theme or preference-file operation is copied.                                                    |
| `src/main/ipc-security.ts`, `src/main/ipc-security.test.ts`                                                                                                                                                                                                                                                                                                                                                              | Reviewed ID-only mutation boundaries. Browser mutations reject unknown IDs, self links, invalid payload fields, primary unlinking, and inferred unlinking. No paths become access grants.                                                          |
| `src/preload/index.ts`, `src/preload/index.d.ts`, `src/shared/ipc.ts`, `src/shared/usage-projects.ts`                                                                                                                                                                                                                                                                                                                    | Imported API types and shared grouping/ownership/search contract. Implemented `getUsageProjects`, `linkUsageProjects`, and `unlinkUsageProject` in the browser adapter. Native preload implementation remains native.                              |
| `src/renderer/src/App.tsx`, `src/renderer/src/components/ProjectNavigation.tsx`, `src/renderer/src/lib/project-tree.ts`, `src/renderer/src/lib/project-tree.test.ts`                                                                                                                                                                                                                                                     | Imported availability resolver and quiet unknown states. Added pending/retry/recovered sample examples in both inventories, retaining cached rows and child-specific warnings. Source tests were reviewed; website tests exercise the imported UI. |
| `src/renderer/src/components/usage/ManageUsageProjectsDialog.tsx`, `src/renderer/src/lib/use-usage-projects.ts`, `src/renderer/src/views/UsageView.tsx`                                                                                                                                                                                                                                                                  | Imported Manage projects, catalog query/mutations, loading/error states, link target selection, reversible links, and refreshed Usage queries.                                                                                                     |
| `src/renderer/src/components/usage/ProjectSearch.tsx`, `src/renderer/src/components/usage/ProjectRankedList.tsx`, `src/renderer/src/components/usage/RankedList.tsx`, `src/renderer/src/components/usage/ProjectTimeline.tsx`                                                                                                                                                                                            | Imported full-catalog search, visible counts, full-total shares, expansion preservation, and monthly timeline filtering.                                                                                                                           |
| `src/renderer/src/components/usage/ActivityDetailsDialog.tsx`, `src/renderer/src/components/usage/CostDetailsDialog.tsx`, `src/renderer/src/components/usage/CostSection.tsx`, `src/renderer/src/components/usage/HistorySection.tsx`, `src/renderer/src/components/usage/ResidentDrillDialog.tsx`, `src/renderer/src/components/usage/SkillInvocationDialog.tsx`, `src/renderer/src/components/usage/TokensSection.tsx` | Imported project labeling/search consumers and Activity coverage display. Existing dialogs, hover/focus, independent periods, token details, and context interactions remain app-owned.                                                            |
| `src/renderer/src/lib/usage-project-label.ts`, `src/renderer/src/lib/usage-project-label.test.ts`                                                                                                                                                                                                                                                                                                                        | Imported global retained labels; reviewed basename disambiguation tests.                                                                                                                                                                           |
| `docs/data-model.md`, `docs/skill-scanner.md`, `docs/usage-analytics.md`, `docs/usage-view-ui-spec.md`                                                                                                                                                                                                                                                                                                                   | Updated landing copy, README, design rules, implementation notes, and fidelity audit for identity, retained records, search, explicit linking, and pending discovery.                                                                              |
| `.claude/skills/visual-verify/fixture-entry.mjs`, `project-tree-fixture.mjs`, `scenarios.mjs`, `usage-history-fixture.mjs`, and their four `.agents/skills/visual-verify/` mirrors                                                                                                                                                                                                                                       | Reviewed native fixture changes. Website QA uses its own typed synthetic adapter, tests, responsive captures, and original-renderer comparison; these native fixtures are not copied.                                                              |

## Website implementation and preserved behavior

- Reimported 109 pinned source/license files through `preview:sync`. The original
  four integration patches remain; a fifth makes the shared helper's `.ts` import
  explicit for Node's TypeScript adapter tests. Provenance records both hashes.
  No vendor file was hand-edited.
- Added independent old/current same-name sample locations, a previous-name
  location, and a parent-only historical location. Sample identities survive
  inventory removal and lost grants; link/unlink only changes Usage grouping.
  Reset cancels pending mutations and restores separate identities.
- Kept prompt copies independently of token events. Partial/unavailable examples
  exercise coverage without inventing token records or complete empty history.
- Extended Try live refresh from six to nine examples: awaiting discovery,
  confirmed failure during retry, and successful completion. Native watchers and
  CLI operations remain simulated. Existing inventory-only query invalidation,
  selection recovery, manual feedback, plugin actions, and permission behavior stay
  intact.
- Preserved marketing hover effects and motion, app-owned chart/row interactions,
  keyboard navigation, iframe isolation, 860px client width, contained panning,
  expansion, and trusted host messaging. No remote service or dependency was added.

The upstream Manage projects dialog dismisses with Escape but has no explicit
launch-button focus return. The website preserves this upstream limitation.
Link/unlink mutations retain the app's heading/search focus behavior. Native
database, persistence, filesystem security, and ingestion tests were reviewed,
not run or claimed as website test results.

## Verification

| Check                        | Result                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regression tests             | 112 passed. New tests were observed failing before implementation for project APIs/grouping, retained prompt copies, pending discovery, and inferred repository promotion. Additional regressions protect Windows path aliases and sibling boundaries, plus distinct POSIX path case, access boundaries, and stable identities.                                                                                                               |
| Build and quality            | TypeScript, renderer hashes, production build, ESLint, Prettier, generated mirrors, and whitespace checks passed.                                                                                                                                                                                                                                                                                                                             |
| Full responsive sweep        | 241 captures: 95 changed screenshots reviewed and accepted, 146 unchanged. No page overflow, console warnings/errors, or uncaught page errors. Reviewed screenshots promoted to the local baselines.                                                                                                                                                                                                                                          |
| Production interaction QA    | Passed all existing controls and all nine refresh examples. Added 56 captures for pending/retry/recovery in Skills/Plugins, explicit linking/unlinking, old-path search in rankings/timelines, coverage, project loading/errors, and mutation failure at 375/768/1024/1440px. Pending mutations are held and released at the API boundary so the disabled-state check does not race the sample delay. No browser errors or external requests. |
| Updated FAQ copy             | Both changed answers opened by keyboard and captured at all four widths: eight reviewed captures, no page overflow.                                                                                                                                                                                                                                                                                                                           |
| Original renderer comparison | 90 comparisons across 45 scenes at 1200×720 and 860×600; zero differing RGBA pixels, including antialiasing. New scenes cover the project manager, confirmed links, linked ranking search, and linked timeline search. Both capture backends hide text carets, removing the identified 16-pixel blinking-caret artifact without changing app styling.                                                                                         |

The app checkout advanced during verification, so reference captures used an
isolated worktree at `ffd8864` with the installed Electron dependencies. The user's
working checkout was left intact. This checks the original renderer with synthetic
browser responses, not native ingestion, database persistence, or macOS behavior.

Evidence remains in ignored `.qa/usage-tests.log`, `.qa/usage-quality.log`,
`.qa/usage-visual.log`, `.qa/results.json`, `.qa/usage-projects/`,
`.qa/usage-copy-*.png`, `.qa/app-reference/results.json`, and `.visual-verify/`.
