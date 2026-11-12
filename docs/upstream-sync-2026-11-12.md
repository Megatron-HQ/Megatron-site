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
