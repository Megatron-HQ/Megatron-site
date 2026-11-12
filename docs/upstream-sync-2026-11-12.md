# Megatron 0.2.0

Reviewed the 35 commits after the site's `61084a2` pin and imported the actual
renderer at `c86e8af605b3fc7224a6892aeb4fe450469bcb7a` (tag `v0.2.0`). The
range changes 135 files, with 8,723 insertions and 5,950 deletions. The import
came from a clean worktree at the tag. The working app checkout, which had
uncommitted Windows ACL changes on `fix/windows-private-data-hardening`, was
not read or modified.

## Commit review

| Commits                                                  | Change                                                                                                                                                                                                                            | Website treatment                                                                                                                                                                                                                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e7345fa`, `16560b6`, `4356f1a`, `6ad5c3b`               | Warm Paper neutrals, a darker frame around a white sheet, five status tones, entity identity colors and glyph steps, screen/title/data/dialog motion (`tw-animate-css`), entity glyph tiles in ⌘K, SkillDetail, and PluginDetail. | Imported. Added `tw-animate-css@1.4.0`. The landing deck's Resident tax colors now use the base entity hues in both themes; QA asserts the new computed colors.                                                                                                              |
| `2d5b849`                                                | Stale skills: a dormant Clock in the inventory tray for skills unused for 30 days of covered history while they existed and their scope was active. `SkillsListResult.skills` became `InventorySkillRow[]`.                       | `src/preview/stale-skills.ts` mirrors the desktop rule over the sample: incomplete coverage, recent installs, idle scopes, disabled and shadowed skills give no signal. Four sample skills derive as stale.                                                                  |
| `6ad5c3b`                                                | PluginDetail lists each install's MCP servers, agents, commands, hooks, and LSP servers. `PluginDetailResult.components`.                                                                                                         | Sample components per plugin, resolved to the newest install's path, with MCP details limited to transport and host or command name. See the duplicate-key note below.                                                                                                       |
| `ffa6b1f`, `be7cae4`                                     | Non-overlapping folder grants, narrowing (`narrowAllowedPath`), skipped picks (`GrantChangeResult`), home-path IPC, a project tree that mirrors folder structure, name-first labels, and a two-step revoke.                       | `src/preview/folder-grants.ts` mirrors the grant rule. Add Folder grants `docs-site`, then `Clients` (absorbing it), then reports `docs-site` as already included. Keep some folders… keeps the first sample repository. QA follows the new labels and empty-project groups. |
| `323f971`                                                | First-run welcome: brief, live overview, and guided folder access; replay from Settings.                                                                                                                                          | Closed on load (`getInitialOnboarding` is false unless `?scenario=onboarding`); Settings → Show welcome opens it with sample data.                                                                                                                                           |
| `ddda97a`, `137bf14`, `cfb5d97`, `077b595`, `c86e8af`    | Update checks against GitHub with a Settings section and gear dot; tag-driven draft releases, unsigned builds, a Homebrew tap; v0.1.0 and v0.2.0 published.                                                                       | Preview reports the `unsupported` update state, so Check now is disabled while the automatic-check switch works for the session. The install panel's release block moves to v0.2.0; the privacy section and FAQ disclose the update check.                                   |
| `a642580`                                                | Resident tax bar drawn against a 200K reference on larger windows, with a caption.                                                                                                                                                | Imported. The 1M-window sample now shows "Bar shows the first 200K of 1M". Deck cards compare categories with each other and are unaffected. FAQ explains the scale.                                                                                                         |
| `44f5f6e`                                                | Manage projects removed from the Usage header (already reviewed by hash in the previous pin).                                                                                                                                     | Unchanged; QA still asserts the button is absent.                                                                                                                                                                                                                            |
| `dc99c40`, `40a1d69`, docs commits, `2e3fe8b`, `a1a0554` | Schema-change rebuilds, grants in preferences, native visual-verify fixes, CI, and documentation consolidation.                                                                                                                   | Reviewed; no renderer or website contract change. Native fixtures are not copied.                                                                                                                                                                                            |

## Integration changes

- **Patch seam.** 0.2.0 removed the inventories' `if (!hasRows) return`. The
  inactive-frame focus guard now follows `focusShownRows`' active-element
  check, so a pending Back focus restore stays pending until the frame is
  active. A regression test covers both inventories and the stop-on-missing
  seam.
- **Preload order.** `OnboardingDialog.tsx` reads `window.api.platform` at
  import time. The preview installed `window.api` in `main.tsx`'s body, after
  static imports evaluated, so the frame never loaded. `src/preview/runtime.ts`
  now installs it first, as the desktop preload does, and `parseSamplePanel`
  moved to `protocol.ts` so the runtime imports no app modules.

## Merge with the install panel redesign

This sync was rebased onto three site commits made in parallel (`b40b0ed`,
`f91e890`, `2d8cf62`): `DESIGN.md` and `PRODUCT.md` replaced
`design-system/MASTER.md`, the preview scales to fit below 860px instead of
panning, and the install section became a platform-tabbed panel. That panel
was kept as designed. This sync only moved its release block to v0.2.0 (label,
both download links; the rounded sizes are unchanged at 136 MB and 115 MB) and
dropped its own earlier install rewrite and source-build disclosure. The
update-check disclosure, FAQ additions, plugin and stale-skill copy, the
`#install` setup link, the deck colors, and the welcome sentence were carried
onto the redesigned page. `PRODUCT.md` now records v0.2.0, the published
Homebrew tap (0.2.0 as of November 12), the welcome, non-overlapping grants,
and the update check; `DESIGN.md` records the deck's entity colors.

## After v0.2.0 (unreleased)

Reviewed `v0.2.0..7f58033` (app `main`, PRs #20–#22) the same day. None of it
touches `src/renderer/src`, `src/shared`, or `src/preload`, so they needed no renderer re-sync; the snapshot later moved to app `main` at `e1399c4` for the changes below. A v0.2.1 release shipping
these PRs is planned but not started; when it is published, update the install
panel's release block (label, both links, and the Windows size).

| Change                                                                 | Website treatment                                                                                                                               |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Window titled Megatron instead of Electron (`src/renderer/index.html`) | Not part of the snapshot; the preview page is already titled "Megatron interactive preview".                                                    |
| One running copy per data folder; a second launch focuses it           | Not released, so not advertised.                                                                                                                |
| Windows ACL step fails open and runs once per process                  | Main-process hardening, not released; the site makes no ACL claim.                                                                              |
| Only the target platform's SQLite runtime ships                        | Not released. The next release's Windows installer drops from 114.6 MB to about 107 MB: update the install panel's rounded size with the links. |
| Retry cleanup of a locked CLI test fixture on Windows (PR #22)         | Tests only.                                                                                                                                     |

## Upstream issue

`getPluginDetail` returns components for every install path, and PluginDetail
keys rows by name. A plugin installed at two versions lists each component
twice and repeats React keys. The sample shows each component once, from the
newest installed version; the app should deduplicate by kind and name.

## Preserved behavior

Marketing hover and motion, the analytics deck, the platform-tabbed install
panel and its exact Homebrew copy, native FAQ disclosure, keyboard access,
iframe isolation, the 860px layout width with scale-to-fit and expansion,
trusted host messaging, and reduced motion. No remote service or runtime dependency was
added; the only new package is the app's stylesheet dependency.

## Verification

| Check                        | Result                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regression tests             | 149 passed (126 before the sync). New tests were observed failing first for the moved patch seam, stale skills, and the preview API additions; they cover the grant rule (absorb, skip, narrow, Windows case), stale-skill unknowns, plugin contents and version follow-through, update state, welcome, and home path.                                                                                   |
| Build and quality            | TypeScript, renderer hashes, production build, ESLint, Prettier, and whitespace checks passed. The generated `.agents/` mirror is regenerated by the pre-commit hook. The build warns that the preview chunk exceeds 500 kB; that was not compared against the previous build.                                                                                                                           |
| Production interaction QA    | All groups passed with no browser errors or external requests, including a new 0.2.0 group: unsupported update state and switch, welcome replay by keyboard, stale markers and tooltip, plugin contents, the 200K caption, and narrowing. Existing checks were updated for name-first labels, empty-project groups, two-step revoke, entity colors, the taller Settings dialog, and the install section. |
| Full responsive sweep        | 245 captures at 375/768/1024/1440px: 239 changed (palette and shell), 4 new (analytics deck open), 2 unchanged. No overflow or console/page errors. A representative sample was reviewed (hero, install at desktop and mobile, why local, analytics section, deck open, plugin contents, welcome) and the baselines were promoted.                                                                       |
| Original renderer comparison | 86 comparisons across 43 scenes at 1200×720 and 860×600 against `v0.2.0` in Electron: zero differing pixels. The reference entry now installs `window.api` before importing the app; the History tooltip and project-tree scenes follow 0.2.0's fade and empty-project grouping.                                                                                                                         |

The worktree's Electron binary was copied from the main checkout's identical
43.8.7 install rather than downloaded. The comparison checks the original
renderer with synthetic browser responses, not native ingestion, updates,
permissions, or macOS behavior.

After rebasing onto the install panel redesign, production QA, the full
responsive sweep (245 captures, no overflow or browser errors), and the
original-renderer comparison (86 captures, zero differing pixels) were rerun
and passed. CI's macOS browser job then failed once: a History day's tooltip,
still fading out, took the first Escape before the day dialog did. QA now
presses Escape until the dialog closes (at most three times). The comparison
also finishes finite animations on both pages before each capture, because
the hidden Electron window can stall 0.2.0's fades; looping animations are
left running.

## Fork lineage cost, Claude app chats, and entrance animations (app `main` at `e1399c4`)

Synced the renderer to app `main` at `e1399c465299e020b12084076c1522cdc377e7b4` (`package.json` still 0.2.0; dependencies unchanged). Three merged changes alter what the preview shows:

- `e664137` counts each fork lineage's cost once. `CostWindow`, `CostDay`,
  and `CostHour` gain `hasEstimatedCost`, set when a lineage lost a shared
  ancestor, and Cost and its detail dialog show a caveat. Sample events carry
  an optional `costEstimated` mark derived into those flags; the
  `?scenario=cost-estimated` preview marks the newest priced session, keeping
  every total unchanged.
- `06ea447` folds folderless Claude desktop chats into one "Claude app chats
  (N)" row in every project ranking and the project timeline, named by title
  or local start date and never by path, and keeps them out of grant
  suggestions. Five sample chats under the sample home's
  `AppData\Roaming\Claude\scratch-workspaces` (four titled, one with a `/`,
  one untitled) take the rotation slots of five folders that own no skills, so
  skill ownership, stale markers, and the 13-project timeline are unchanged.
  The sample catalog marks each chat at read time with its title and earliest
  recorded start, like the desktop.
- PR #24 (merge `e1399c4`) gives History and Tokens the staggered chart entrance: Tokens trend bars rise from the baseline, contribution days pop in on a diagonal sweep (delays capped at 0.4s), and timeline fills sweep to their data shade, including chat rows revealed by the group chevron. Each skips animation under reduced motion, and the original-renderer comparison finishes finite animations before capturing.

These changes ship in v0.2.1 (tag `75e8faa`; its renderer is unchanged since `e1399c4`). The landing page describes them once v0.2.1 is published: Cost and its FAQ say resumed, rewound, and forked conversations count once and note the estimate caveat, and Activity says folderless Claude app chats share one row. The install panel moves to v0.2.1 at the same time: label, both links, and sizes of 126 MB (DMG, 132,393,212 bytes) and 107 MB (Windows installer, 112,235,465 bytes), in the panel's binary-megabyte rounding.
