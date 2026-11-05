# Megatron upstream review — November 5, 2026

Compared the website's pinned `975605b4f0fb489db3842e7720ca2f1cbef11045`
with the app's clean committed checkout at
`da368fef9e681840fa40f3e85df6638ba9345205` (0.1.0).
The only newer commit is **Refresh skill and plugin inventory after filesystem
changes**: 31 changed files, 1,362 insertions, and 98 deletions. The site's previous
snapshot already contained the November 4 annual History summary and project
timeline; the earlier History, Tokens, and `/context` rebuilds remain included.

## Detailed source review

All paths below are relative to the app checkout. Renderer imports exclude its
test files. Native scanners and watchers remain desktop-only; the website
demonstrates their effects with synthetic state.

| App files                                                                                                                                               | Reviewed behavior and website impact                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main/index.ts`                                                                                                                                     | Starts and closes the watcher; updates watch roots after grants change; requests quiet, fresh inventory-only scans. Website needs scoped completion notifications, not native watchers.                                                                                 |
| `src/main/inventory-watcher.ts`                                                                                                                         | Coalesces relevant events after one second, caps deferral at five seconds, reconciles every 30 seconds, retries failures, ignores generated directories and unrelated source edits, and suppresses stale/shutdown callbacks. No latency guarantee is implied.           |
| `src/main/permissions.ts`                                                                                                                               | Validates requested and canonical watch roots, closes stale/redirected watches, exposes notifications only, and preserves guarded file reads. Browser sample adds no file capability.                                                                                   |
| `src/main/ingest/scan-all.ts`                                                                                                                           | Adds the inventory scope and stable task selection; keeps plugin requests prioritized while preserving queued full/inventory requests. Sample events identify inventory sources.                                                                                        |
| `src/main/ingest/scan-worker.ts`                                                                                                                        | Selects skills, plugin registry, and lint tasks for inventory refresh; excludes transcript and usage archives. Open Usage/history queries remain untouched.                                                                                                             |
| `src/main/ingest/project-discovery.ts`                                                                                                                  | Prunes confirmed missing discovered children beneath readable grants; preserves explicit grants and uncertain traversal areas; keeps healthy parents/siblings available. Sample catalog, notices, and copy must reflect these distinctions.                             |
| `src/main/ingest/skills-scanner.ts`                                                                                                                     | Removes deleted skills, removed `.claude` roots, and old moved-project paths; scopes unavailable status to the owning project; retains unreadable and explicitly granted missing sources. Sample changes exercise additions, edits, deletion, moves, and unreadability. |
| `src/main/ingest/plugin-registry.ts`                                                                                                                    | Drops derived installs for missing discovered projects without editing Claude registry files; preserves shared user installs and explicit missing grants. Sample cleanup retains definitions still used by another install.                                             |
| `src/main/plugin-action-service.ts`                                                                                                                     | Narrows action refresh scopes to full/plugins; existing CLI-managed actions remain intact. No website dependency or new API is required.                                                                                                                                |
| `src/renderer/src/App.tsx`                                                                                                                              | Uses completion source scope, recovers removed Skills/Plugins selections to the nearest surviving ancestor, closes disappeared details, and stops propagating child warnings to healthy aggregates. Imported unchanged except the existing host-navigation patch.       |
| `src/renderer/src/components/ProjectAvailabilityNotice.tsx`                                                                                             | Explains retained cached data and automatic retry for unreadable folders. Imported directly.                                                                                                                                                                            |
| `src/renderer/src/components/SettingsDialog.tsx`                                                                                                        | Retains the manual-rescan result through later background summaries while showing current source diagnostics. Imported directly.                                                                                                                                        |
| `src/renderer/src/lib/project-tree.ts`                                                                                                                  | Resolves removed selections with path boundaries and keeps a child's unavailable status independent of its parent. Imported directly.                                                                                                                                   |
| `src/renderer/src/lib/refresh-scan-queries.ts`                                                                                                          | Inventory-only completion invalidates inventory/detail/file queries without invalidating Usage, skill history, or Usage invocation queries. Full and manual refresh behavior is retained. Imported directly.                                                            |
| `src/main/inventory-watcher.test.ts`, `src/main/permissions.test.ts`                                                                                    | Cover event coalescing, ignore rules, maximum delay, follow-up scans, retry, shutdown, revoked roots, approved nested events, and rejected symlink escapes. These native tests were reviewed, not run by the website suite.                                             |
| `src/main/ingest/project-discovery.test.ts`, `src/main/ingest/skills-scanner.test.ts`, `src/main/ingest/plugin-registry.test.ts`                        | Cover removal, moves, independent warnings, uncertain traversal, explicit grants, shared installs, and unchanged registry contents. Website tests assert the corresponding sample outcomes.                                                                             |
| `src/main/ingest/scan-all.test.ts`, `src/main/ingest/scan-worker.test.ts`                                                                               | Cover task scopes and retained queued inventory requests. Website tests check emitted source scope.                                                                                                                                                                     |
| `src/renderer/src/lib/project-tree.test.ts`, `src/renderer/src/lib/refresh-scan-queries.test.ts`                                                        | Cover path-safe ancestor recovery, independent parent status, and selective query invalidation. Actual renderer behavior is exercised through browser QA.                                                                                                               |
| `.claude/skills/visual-verify/fixture-entry.mjs`, `.claude/skills/visual-verify/project-tree-fixture.mjs`, `.claude/skills/visual-verify/scenarios.mjs` | Isolate synthetic scan timelines from native scans and add unreadable-child, removed-selection/detail, and retained-manual-feedback scenarios. Website QA adds equivalent browser examples.                                                                             |
| `.agents/skills/visual-verify/fixture-entry.mjs`, `.agents/skills/visual-verify/project-tree-fixture.mjs`, `.agents/skills/visual-verify/scenarios.mjs` | Generated app mirrors of the preceding three files; no separate website product behavior.                                                                                                                                                                               |
| `docs/skill-scanner.md`, `docs/security-hardening.md`                                                                                                   | Define live scan semantics, permission boundaries, missing versus unreadable retention, registry immutability, and upstream verification evidence. Current website copy and docs now follow these rules.                                                                |

There are no changes to `package.json`, the lockfile, shared IPC types, or preload
contracts in this range. No website dependency or fifth renderer patch is needed.

## Website propagation

- Imported the five changed renderer files with `preview:sync`, retaining all
  four browser integration patches and recording upstream/output hashes.
- Added six **Try live refresh** examples outside the renderer. A labeled native
  select and Simulate change button preserve existing tabs, reset, expansion,
  focus, hover, reduced motion, and contained panning.
- Added a pure sample inventory transformation and source catalog independent of
  displayed folder grants. Granting another folder does not resurrect deleted
  skills or projects. Shared user plugin installs survive project cleanup.
- Moves rediscover skills under a new identity/path without rewriting registry
  installs or historical project paths. Cached entries remain for unreadable and
  explicitly granted missing sources. Missing-project fixtures now grant the
  retained repository explicitly and keep its parent healthy.
- Validated inventory messages through the existing origin/source boundary.
  Inventory completion events contain only `scanSkills`, `scanPluginRegistry`,
  and `runLinter`; Reset suppresses stale changes and notices.
- Updated inventory feature copy, setup, FAQ, README, design rules, implementation
  notes, and fidelity audit. Historical dated reviews remain historical.

## Verification

New API/protocol tests were observed failing before implementation. The browser
regression was observed failing because the sample-change control was absent.

- All 102 automated tests passed, including browser CLI failure reporting and
  process-lifecycle checks. The strengthened addition check observes 20 → 21
  rows and repeated additions remain idempotent. Follow-up API/protocol tests
  pass after choosing a unique added skill name.
- Production build, TypeScript, renderer provenance, lint, formatting, generated
  mirrors, and whitespace checks pass. Vite retains its large renderer-chunk
  advisory; the build succeeds.
- The full visual sweep captured 241 states at 375/768/1024/1440px, with three
  desktop-navigation skips and no page overflow, console warnings/errors, or
  uncaught page errors. All 240 changed captures were reviewed; one capture
  matched its existing baseline. The added host strip explains the broad pixel
  changes. App minimum width and contained panning are intentional.
- The native reference uses the same document mounting rules as the iframe.
  A diagnostic established that the original harness's outer scrollbar reduced
  usable width by 10px at 860×600; normalizing outer body overflow removed the
  History difference without changing any renderer token or component.

- Final production interaction QA passed, including all six sample changes at
  all four widths, deleted detail/selection recovery, scoped warnings, Reset,
  retained manual-rescan feedback, and an API read-count assertion proving that
  inventory refresh does not refetch open Usage. Existing plugin actions, all
  seven Usage panels, independent periods/years, keyboard controls, expansion,
  mobile navigation, copying, reduced motion, and no-JavaScript content pass.
  No browser errors or external runtime requests were observed. The owned QA
  preview stopped cleanly.
- Final native comparison passed all 82 captures across 41 states at 1200×720
  and 860×600, with zero differing RGBA pixels, including antialiasing, and no
  renderer errors. This is synthetic Windows renderer evidence; native scanners,
  macOS packaging, and operating-system window chrome are outside this check.

Evidence remains in ignored `.qa/results.json`, `.qa/inventory/`,
`.qa/app-reference/results.json`, `.qa/test-run.log`, `.qa/visual-run.log`, and
`.visual-verify/`. The 240 reviewed visual changes were promoted to local ignored
baselines. New sample actions were rechecked against the final production build.

The app checkout is only read. Website examples never run native commands,
watch visitor folders, mutate Claude configuration, or access personal sessions.
