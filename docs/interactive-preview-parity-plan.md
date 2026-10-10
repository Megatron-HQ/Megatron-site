# Interactive preview parity plan

Status: proposed implementation, pending approval. This audit changes no implementation files.

Prepared on October 9, 2026, against:

- App: `C:\Megatron`, clean `main`, commit `6a8a79b471bb99f43da2ee958731284cd7ba7dcb`.
- Website: `C:\Megatron-site`, commit `28a1a028d66bc1af440855431cae2ea3ea73c2f5`.

## Intended result

The website should let someone explore the same interface they will get in Megatron: the same screens, hierarchy, wording, typography, icons, spacing, colors, hover effects, navigation, dialogs, charts, keyboard behavior, and state transitions. Sample records can differ from a visitor's installation; the interface and the meaning of those records should match the app.

Recommended implementation: use a versioned snapshot of Megatron's actual React renderer, hosted in a separate browser document, with a typed, in-memory replacement for its Electron `window.api` bridge. Keep the landing page in vanilla JavaScript. The app repository does not need to change for this implementation.

The current preview is a second implementation of the product. Improving its CSS would leave numerous screens and behaviors missing and create continuing maintenance work whenever the app changes.

## Audit basis and limits

The audit covered the application shell, all six view files, section sidebars, shared interface components, Usage chart components, navigation/state ownership, renderer helpers, shared IPC types, preload bridge, main-process handlers, permissions, and relevant ingest/query semantics. It also compared the website renderer, fixtures, preview styles, entry point, design system, browser QA, visual scenarios, and CI integration.

Reference files in the app:

- `src/renderer/src/App.tsx`, `main.tsx`, and `assets/main.css`.
- `views/SkillInventory.tsx`, `SkillDetail.tsx`, `SkillFileViewer.tsx`, `PluginInventory.tsx`, `PluginDetail.tsx`, and `UsageView.tsx`.
- `components/AppRail.tsx`, `Sidebar.tsx`, `PluginSidebar.tsx`, `UsageSidebar.tsx`, and the settings, command, budget, folders, activity, invocation, lint, file-tree, and badge components.
- All chart primitives in `components/usage/`, especially `ShareBars`, `SegmentBar`, `DayStrip`, `Punchcard`, `SkillAssociationTable`, and the two drilldown dialogs.
- `src/shared/ipc.ts`, `src/shared/version.ts`, `src/preload/index.d.ts`, `src/preload/index.ts`, and `src/main/index.ts`.
- `src/main/permissions.ts`, query functions, scan contracts, `DESIGN.md`, and the latest amendments in `docs/usage-view-ui-spec.md`.

Stored app baselines and website screenshots were inspected as visual evidence. App baselines span August through October 2 and predate some October 4 chart amendments. They are useful historical references, not a complete current acceptance baseline. No fresh app launch or live browser verification was performed during this planning audit. Implementation must capture the pinned current renderer before claiming an exact visual match.

Some documentation is stale. For example, the app's `AGENTS.md` describes three table columns; the current skills renderer implements six. The Usage specification also contains superseded chart designs. Use current code and the newest applicable specification amendments; do not reconstruct obsolete screens from older prose or screenshots. Actual native operating-system window controls and filesystem dialogs need explicit browser simulation; they cannot acquire desktop capabilities inside a website.

## What the application actually does

Megatron has three Electron layers: the main process reads permitted Claude Code data and maintains a derived SQLite index; the preload exposes a narrow typed API; the React renderer consumes that API through TanStack Query. Local navigation and presentation state live in React state. The browser preview needs the renderer and API response shapes, rather than the scanner, database, CLI, or Electron runtime.

Important rules that fixtures must respect:

- Skill sources are global, explicitly granted project roots, and installed plugins. Synced skills remain a global-source variant. Nested project names and plugin-qualified identifiers have separate display rules.
- Inventory, lint, disabled state, user-invocable-only state, hook declarations, and shadowing are distinct facts. A disabled skill can still have lint findings.
- Listing budget counts enabled, model-invocable global/plugin skills. It excludes project skills and separately accounts for disabled and user-invocable-only exclusions. The reference limit is 2,666 estimated tokens; warning starts above 80%.
- Plugin identity is `name@marketplace`. Each user/project/local installation has its own version, owning project, enablement knowledge, and actions. Mixed versions and Unknown enablement are real states.
- Plugin skills currently resolve disabled state at user scope. A project/local install action must not blindly disable every skill with the same plugin name.
- Activity measures prompt history and separately reports bare slash commands. Model turns and skill invocations are different measures, so their totals need not equal prompt counts.
- Cost originates in recorded session cost. Window/model/project distributions and output-share skill attribution are estimates. Coverage gaps, unknown pricing, undated cost, and General work have explicit meanings.
- Resident tax is a qualifying cold session's measured first-turn cache write. Its itemized categories are estimates; the remainder is unitemized measured context.

## Screen-by-screen gaps and required parity

| Surface          | Current website                                                                                                        | App behavior the preview must reproduce                                                                                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell            | 43px rail, 181px sidebar, 29px rail buttons, 49px content header; invented 33px title bar and Local label; lock footer | 48px rail, 220px sidebar, 32px rail buttons, 40px inventory/Usage headers; Megatron wordmark; actual section icons; Settings button; current platform framing                                                                                                                       |
| Visual system    | Independently chosen neutral colors, smaller type, different radii and icon stroke                                     | Actual light/dark CSS tokens, Geist font weights, Lucide React assets, 13px table text, 11px captions, 12px mono data, scoped 30px Usage numerals, app borders and scrollbars                                                                                                       |
| Skills sidebar   | Four flat source buttons; decorative budget progress bar                                                               | Expandable project/plugin groups, per-root/plugin counts and identity disambiguation, distinct selection/expansion behavior, animated hover glide, clickable budget readout and audit filters                                                                                       |
| Skills inventory | Six approximate columns; inline search filters rows; only names open details                                           | Actual six sortable columns and conditional Source visibility; whole-row activation; display-name stripping, source badges and locks, synced/hooks/manual-only/shadowed/disabled icons; Claude Code header, search palette, keyboard hints, project-folder action                   |
| Skill detail     | Two stats, one finding, invented generic SKILL.md block                                                                | Header and View files action; shadowing banner and global-skill link; expandable applicable lint checks; status/source chips; Uses, Listing tokens, Body tokens, Last used, Modified/Scanned; description, usage mix, projects, recent activity, metadata and frontmatter details   |
| Skill history    | Absent                                                                                                                 | Trigger-specific activity dialog, text search, counts, prompt expansion, project/branch/time/subagent metadata, screenshot-run grouping, full retained history and empty/error/loading feedback                                                                                     |
| File viewer      | Absent                                                                                                                 | Read-only virtualized tree, directory expansion, file filtering, Markdown and plain-text views, internal Markdown links, pointer/keyboard tree resizing, lint panel, binary/unreadable/too-large/preview-limit states                                                               |
| Plugin sidebar   | Static All installs entry                                                                                              | All Plugins, User, expandable Project and Local groups, per-project selection and counts, matching hover behavior                                                                                                                                                                   |
| Plugin inventory | Four columns and instant switches                                                                                      | Name, Marketplace, Install Version, Marketplace Version, Scope, Skills, Status; sorting; conditional Scope visibility; mixed versions, update indicators, Enabled/Disabled/Unknown pills; whole-row detail navigation                                                               |
| Plugin detail    | Absent                                                                                                                 | Version/marketplace/status header, five summary values, separate install cards, enable/disable/update/uninstall buttons, scope/grant restrictions, pending/error states, uninstall confirmation, View skills navigation, success toasts                                             |
| Activity         | Generic 137px plot, generated dot pattern, project/pattern blocks side by side                                         | Active days / Sessions / Prompts in app order; bare slash-command caption; 24-hour trend or 72px daily strip; weekend shading, current-day outline, dated labels; stacked time-of-day punchcard with hour/weekday marginal bars; project shares and disclosure                      |
| Cost             | Rounded cents headline, family-only legend, generic bars that pin values                                               | App money formatting, segmented spend bar and family/version legend; model cards and older-version note; coverage captions; day/hour dialogs and focus restoration; punchcard, project shares, partial buckets, unknown and undated cost states                                     |
| Models           | Family-only percentage ranking and four passive effort segments                                                        | Turns and Output share bars with linked family/version hover; stable family hues/version tints; matrix effort buttons, row-local hover and cross-row selection, selected/total readout, output column and totals; conditional Not recorded hatch; Escape clearing                   |
| Skills usage     | Four top skills, no cost attribution; every trend point pins                                                           | Windowed invocations, skills and sessions; bucket invocation dialogs; eight-row ranked disclosure and percentages; installed skill detail links versus ambiguous/removed history links; trigger distribution; additive cost attribution, General work, totals and coverage captions |
| Resident tax     | Generic composition rows and shortened Remainder label                                                                 | Measured headline; synchronized composition/row hover and focus; item counts, approximation marks, actual unitemized label, project/model/Claude version/sample time; qualifying-sample empty state                                                                                 |
| Shared dialogs   | Absent                                                                                                                 | Command palette, context budget, Settings with Light/Dark/System, project-folder management, all existing focus/close behavior and error/loading states                                                                                                                             |
| State ownership  | One shared time window; section switching clears selected details                                                      | Independent Activity/Cost/Models/Skills windows; actual rail/filter behavior; inventory/detail/file navigation; Usage-to-detail return paths, including reopening the invocation dialog with its filters                                                                            |

## Implementation architecture

### 1. Keep a reproducible renderer snapshot

Add `vendor/megatron/` containing the renderer views, components (including vendored shadcn UI), helpers, stylesheet, required shared files, and API type declaration. Preserve the upstream relative directory structure so its shared imports remain valid. Include the MIT license and existing third-party attribution, including the TextLink attribution.

Record upstream revision, app version, included files, hashes, and any necessary browser integration patches in `vendor/megatron/provenance.json`. Add an explicit sync/check script. Updating the snapshot is a reviewed development step. Production and ordinary CI must build from committed website files without a sibling app checkout or runtime fetch.

Do not hand-redraw the table, charts, badges, dialogs, or motion. Keep browser adaptations outside the snapshot wherever possible. Any small required integration patch must be recorded and checked independently from upstream files.

### 2. Give the preview its own browser document

Create `preview/index.html` and a React/TypeScript entry at `src/preview/main.tsx`; load it through a same-origin iframe in the product stage. Build it as a second Vite HTML entry with its own CSS assets and the app's alias resolution.

This lets the renderer retain its full-height layout, document-level shortcuts, dark class, Radix portals, fixed overlays, and toast positioning without inheriting marketing styles or covering the landing page. Initialize the demo API before importing/mounting the app, because theme, version, and initial section are read synchronously.

Use the app's fonts and resolved dependency versions. Add React/React DOM, TanStack Query/Table/Virtual, Lucide React, Motion, Radix, cmdk, Markdown/GFM/YAML helpers, class utilities, TypeScript and compatible build/lint support as needed by actual imports. Do not bring Electron, better-sqlite3, or main-process modules into the browser bundle. Validate Tailwind source discovery and separate CSS output in both dev and production.

### 3. Replace the preload bridge with a complete demo API

Implement the exact public API from `src/preload/index.d.ts`, backed by session-scoped in-memory sample state. Provide typed methods for inventories, details, files, histories, usage overview/slices, theme/section preferences, folders, rescan results, version, plugin actions and scan-complete subscriptions.

Return coherent snapshots, validate IDs and action targets, preserve asynchronous pending/error behavior, and clean up subscriptions under React StrictMode. Plugin actions update the targeted installation, aggregate inventory state, relevant skills/budget, and subsequent queries according to the app's scope rules. Uninstall changes sample data and retains historical usage. Emit scan-complete notifications so the real Query invalidation behavior runs.

Native-only steps need visible demo behavior: Add Repository chooses a predefined sample repository; rescanning operates on fixtures; Reveal data folder explains the sample environment. Never request real folder grants, read visitor files, execute plugin commands, or silently pretend a native action happened. Place the sample-data explanation outside the app interface and give the wrapper a Reset sample action for recovery after destructive sample operations.

### 4. Make fixtures sufficient to exercise every interface branch

Replace the current compressed fixture shape with records matching the app's actual contracts. Include clean/warning/error skills, a synced skill, hook declarations, disabled and user-invocable-only skills, shadowing, nested project names, extra metadata, all trigger types, image prompts, and enough history/projects/skills to exercise disclosure.

Include plugin identities from different marketplaces, mixed install versions, user/project/local installs, known and unknown settings, available updates, and installs missing their owning project. Include Markdown with frontmatter and internal file links, nested text/code files, enough tree rows for virtualization, and every file status.

Use a coherent synthetic event dataset or validated response builders for all three windows. Derive drilldown rows, chart totals, punchcard margins, model effort/output totals, plugin skill counts, context budget and attribution totals from the same records. Use integer cents for additive attribution. A separate QA scenario layer should inject empty, pending, missing, partial-scan and error states without putting test controls into the public product flow.

Freeze clock, locale and timezone for reference captures; use consistent relative dates for the public sample. Preserve model identities from the pinned renderer rather than inventing labels or claiming they describe currently available models.

### 5. Keep website controls connected to actual app navigation

Keep `mountProductDemo()` and `showCost()` as the landing-page integration boundary. Replace the innerHTML product implementation with an iframe controller, retaining the landing page's icon refresh export or moving it deliberately with all callers updated.

If external Skills/Plugins/Usage tour tabs remain, keep them outside the app frame and synchronize their state with the rail. Add the smallest explicit navigation integration needed for tour tabs and the existing Cost CTA; do not automate hidden clicks or reload the iframe to navigate. Validate message origin, sending window and payload, support a ready/command handshake, and retain app state across wrapper navigation and expansion.

## Responsive presentation

The app window is configured at 1200×720, with an 860×500 minimum outer window. Native borders mean renderer client dimensions are smaller; record `window.innerWidth/innerHeight` and device scale from the reference rather than treating outer window dimensions as screenshot dimensions.

At sufficient website width, render the preview at 1:1 CSS scale with the app's real responsive rules. Let the app handle its existing 900/1000px adaptations; never shrink individual font sizes or sidebar dimensions to imitate fit.

Below desktop width, keep an app viewport at its supported minimum and contain horizontal panning inside the preview wrapper. Provide Expand preview, clear touch-panning access, and focus-driven visibility of offscreen controls. Expanded mobile presentation still contains the desktop viewport; it must not claim the app has a mobile layout. Uniform scaling may be offered as a fit overview, but must not be the only interaction mode or make tiny controls the only way to explore.

Test the wrapper at 375, 768, 1024 and 1440px. The landing page must never overflow horizontally. Preview content may pan within its explicitly contained desktop viewport; dialogs and tooltips must remain reachable, keyboard focus must stay visible, and the expanded wrapper must have usable close/focus-return behavior. Moving between embedded and expanded presentation must retain the same iframe and sample state. Verify page scrolling at preview edges and touch gestures rather than assuming iframe scroll chaining works.

Windows renderer behavior is the initial reference for this local audit. Preserve the app's macOS 32px drag-strip branch and platform shortcut labels, and verify it separately. Put any simulated native window framing outside the renderer and compare renderer pixels separately from operating-system chrome.

## Existing interaction inventory: preservation and intentional changes

| Interaction                                                                                   | Treatment                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing-page navigation, mobile menu/Escape, FAQ, installation copying, header/scroll effects | Preserve behavior and appearance; rerun their existing QA                                                                                                                                                      |
| External preview section tabs and Cost CTA                                                    | Preserve their navigation capability; synchronize with app state without remounting                                                                                                                            |
| Inline skill search                                                                           | Intentionally replace with the app's Search button and command palette; search skills and plugins with app matching/navigation                                                                                 |
| Skill-name-only activation                                                                    | Intentionally replace with whole-row click, roving ArrowUp/Down, Enter/Space, sorting and app focus behavior                                                                                                   |
| Flat source filters                                                                           | Preserve filtering capability through the app's source groups, per-project/plugin filters and budget audit links                                                                                               |
| Instant plugin switches                                                                       | Intentionally replace with install-specific buttons on Plugin detail, pending feedback, uninstall confirmation and toasts                                                                                      |
| Generic chart click-to-pin                                                                    | Intentionally replace with each app chart's behavior: hover readouts, cost/invocation dialogs, or effort selection where implemented                                                                           |
| Chart hover color change                                                                      | Replace lime-tinted marks with the app's ink, crosshair, opacity, tooltip and series-color behavior                                                                                                            |
| Mobile source/panel dropdowns                                                                 | Replace with access to the actual sidebar in a contained/expanded desktop preview                                                                                                                              |
| Search cursor/focus restoration and live feedback                                             | Preserve through actual React/Radix focus behavior plus wrapper announcements for ready/error/reset                                                                                                            |
| Motion and pointer feedback                                                                   | Preserve app spring glides (500 stiffness / 40 damping), expansion/fade timing, chart entry motion, link sweep and reduced-motion behavior; document any upstream discrepancy rather than silently changing it |

## File-specific implementation map

| File or group                                                                                                                                | Intended change                                                                                                   | Behavior to preserve                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `index.html`                                                                                                                                 | Product-stage iframe/fallback and external sample/expand/reset affordances                                        | Semantic section, no-JS product information, anchors and landing content                   |
| `src/product-demo.js`                                                                                                                        | Replace product markup/state renderer with preview host/controller                                                | Public mount and Cost-navigation contract; deliberately retain/update icon refresh callers |
| `src/main.js`                                                                                                                                | Connect ready navigation and Cost CTA to controller                                                               | Navigation, copy, scroll effects and reduced motion                                        |
| `src/styles.css`                                                                                                                             | Retire only obsolete preview internals; add iframe sizing, containment and expanded host styles                   | Marketing tokens/styles, page responsiveness and zero page overflow                        |
| `src/demo-data.js`                                                                                                                           | Retire or migrate obsolete flat sample exports after checking all consumers                                       | Sample-only data boundary                                                                  |
| `preview/index.html`, `src/preview/main.tsx`, `src/preview/styles.css`, `src/preview/navigation.ts`, `src/preview/env.d.ts` (new)            | App boot, separate styles, typed host navigation and browser API declaration                                      | Upstream theme initialization, portals, shortcuts and state                                |
| `vendor/megatron/src/renderer/src/`, required `src/shared/` files, API declaration, license and provenance (new)                             | Reproducible app renderer snapshot with recorded integration patches                                              | Actual components, helpers, labels, tokens, icons and motion                               |
| `src/preview/api.ts`, `state.ts`, `fixtures/`, focused tests (new)                                                                           | Typed fixture API, pure derived data helpers, coherent sample state and QA scenarios                              | App API contracts, installation scope, budget and analytics semantics                      |
| `scripts/preview/sync-renderer.mjs`, `check-renderer.mjs` (new)                                                                              | Explicit snapshot import and provenance verification                                                              | Standalone website builds and intentional upstream updates                                 |
| `vite.config.js`, `package.json`, `package-lock.json`, preview TypeScript config (new), `eslint.config.mjs`, formatting exclusions if needed | React multi-entry build, type checks, dependencies, authored TypeScript linting and preserved upstream formatting | Current website tooling; no Electron/native runtime in bundle                              |
| `scripts/qa/verify.mjs` and new preview-specific QA helpers                                                                                  | Frame-aware actual app interactions and wrapper checks                                                            | Existing marketing interaction and browser-error gates                                     |
| `.claude/skills/visual-verify/scenarios.mjs`, canonical skill documentation if screen names change                                           | Add all preview screens/states and frame-aware navigation                                                         | Existing screen scoping, responsive sweep and error reporting                              |
| `.github/workflows/ci.yml`                                                                                                                   | Add typecheck/provenance and new portable preview checks                                                          | Linux/Windows/macOS website QA and failure evidence                                        |
| `design-system/MASTER.md`, `README.md`, `CLAUDE.md` if layout/commands change                                                                | Document renderer authority, browser simulation, mobile presentation and workflow                                 | Privacy, source delivery and canonical documentation ownership                             |

Never hand-edit generated `AGENTS.md` or `.agents/skills/` mirrors. Regenerate them from canonical sources through the existing hook when applicable.

## Delivery sequence

1. **Reference and first vertical slice.** Capture current app renderer using synthetic API responses, pinned viewport/DPR/theme/clock. Import the snapshot, establish browser boot and typed bridge, render shell + Skills inventory + command palette + appearance. Compare before migrating remaining areas.
2. **Skill inspection.** Populate details, lint branches, activity history, budget audit and complete file browsing. Exercise all back paths, tree keyboard controls and resizing.
3. **Plugins.** Populate real inventory and per-install management. Validate scope/grant rules, pending/error paths, updates, uninstall and historical-data retention; connect plugin-to-skills navigation.
4. **Usage.** Populate all five panels, all independent windows, current chart primitives and drilldowns, model selection, attribution and Resident tax states.
5. **Website integration and small screens.** Connect tour/Cost controls, keep sample state during expansion, verify touch/keyboard access and landing interactions, remove obsolete renderer/styles only after the replacement covers them.
6. **Acceptance and maintenance.** Complete reference comparisons, portable browser QA and quality gates; record upstream provenance and the update procedure. Deliver screenshots and any remaining deviations for review. Do not deploy an intermediate partial replica as the completed result.

Apply the repository's test-driven-development instructions to new behavioral code and visual-verify instructions to the UI implementation. Build focused tests for adapter derivation, scope changes, subscriptions, navigation and message validation; avoid tests that only repeat static markup.

## Acceptance checks

**Visual reference:** capture current Electron renderer and website iframe with the same fixtures, CSS client dimensions, DPR, font readiness, theme, locale, timezone and frozen time. Compare renderer crops at default and minimum sizes, including light/dark, hover/focus, expanded rows, open dialogs and scroll positions. Existing broad screenshot thresholds are not proof of exact parity. Require no unexplained visual differences; record and inspect any platform text-rasterization tolerance. Never auto-approve replacement screenshots.

**Behavior:** cover source-group click versus chevron behavior; all sort columns and conditional columns; palette selection from another section; disabled/manual-only budget filters; detail/file/history back chains; resize/filter/tree links and file statuses; all plugin actions and restrictions; independent Usage windows; cost day/hour details with restored focus; invocation filtering and dialog-to-detail-to-dialog return; model/effort selection, Escape and Not recorded absence/reappearance; Resident composition hover/focus; all empty/loading/error/partial states.

**Responsive and accessibility:** run the 375/768/1024/1440px website sweep, supported app client sizes, keyboard-only navigation, visible focus, dialog containment, touch panning/expansion, preview-edge scrolling, both themes and reduced motion. Keep page overflow distinct from deliberately contained desktop-preview panning. Check parent and iframe console/page errors.

**Data and privacy:** verify fixture totals and drilldown counts; punchcard margins; model shares and output/effort totals; attribution cents sum to headline; plugin counts/state and budget exclusions; removed/ambiguous history remains coherent. Audit production imports and browser requests so only local static assets are required and no visitor filesystem/CLI/backend access exists.

**Production:** run the new TypeScript and provenance checks, `npm test`, `npm run lint`, `npm run format:check`, `npm run pre-commit:check`, `npm run build`, the full `npm run verify:visual`, and `npm run verify:qa:ci`. Validate direct preview URL, iframe entry/assets, loading/failure fallback and Cost navigation in the production bundle. Normal CI must not require `C:\Megatron`; refreshing the Electron reference is a separate reproducible development step.

Completion means every app-owned screen/control in the audit is represented by the actual renderer, every listed interaction has been exercised, the current reference comparisons have been reviewed, and any unavoidable browser/native difference is explicitly recorded. A build or lint pass alone does not meet this bar.
