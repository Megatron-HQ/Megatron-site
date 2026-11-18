# Megatron v0.3.0 website sync

The website started at `c01c0c5`. Its interactive preview pinned app v0.2.1 (`75e8faa`), and its Windows install button still pointed to that release. Megatron published [v0.3.0](https://github.com/Megatron-HQ/Megatron/releases/tag/v0.3.0) on November 18, 2026 at `5d9c9c1`. That tag and the original app `staging` head `2dbf062` had the same source tree. The initial review covered 61 commits after the v0.2.1 pin and found 43 changed files under the app renderer, shared modules, and preload.

The website already offered Homebrew and the latest-release curl installer. The remaining gap included the desktop updater contract, the faster History calendar, What's New, linked skills, Git worktree attribution, Claude Code Folder switching, and token drilldowns.

## Reviewed changes

| App commits                                                  | Website treatment                                                                                                                                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `030e40d`, `5703dec`, `ae8e94f`                              | Match the published Windows and Apple silicon release paths and macOS update behavior. The browser reports the desktop's unsupported updater state and retains a session-only automatic-check setting. |
| `eb998fd`, `4524b14`, `44fca20`, `51cf865`                   | Import History's retained calendar, the restored left rail, and the sidebar brand asset. Keep host navigation, iframe focus guards, and scale-to-fit integration.                                      |
| `8b9c69d`, `4b62bd5`, `6a0089e`, `30c2099`                   | Read the bundled release catalog for What's New. Show a linked skill's target and a sample repository-link warning with its destination and grant action.                                              |
| `427487e` through `06878d0`, `ed6667f`, `28681f8`            | Attribute a sample worktree session and its skill invocation to the Canonical Checkout. Preserve the recorded worktree path in history. Explain checkout ownership and project grants on the site.     |
| `c485acb`                                                    | Compute token buckets with clipped boundaries, missing-data states, and model and project breakdowns. Use the imported dialog and verify both daily and hourly keyboard flows.                         |
| `ec4ef1c` through `86a7f28`, `204e03a`, `d1be469`, `2dbf062` | Simulate Claude Code Folder choices, separate sample inventories and usage, paused or refused folders, and reset. Explain folder selection and per-folder local archives on the landing page.          |

App `staging` advanced to `d2221d2` during the sync. `fbd6c4c` gives unpackaged desktop runs their own data folder. `8978cb7` and `d2221d2` adjust contributor settings. A diff against the published tag found no changes in renderer, shared, preload, or sidebar icon files. Native indexing, update delivery, Git discovery, packaging, and contributor workflow changes stay in the app repository.

## Implementation tickets

1. **Update the downloads** (`3d4dcc6`). Update `index.html`, `README.md`, and `PRODUCT.md`. Verify the published Windows URL and its 107 MB display. Use `scripts/qa/verify.mjs` to check the release label, Windows download, and existing platform-tab and clipboard flows.
2. **Import the renderer and adapt the browser sample** (`005df07`). Regenerate `vendor/megatron/` through `scripts/preview/renderer.mjs` and record the exact upstream revision. In `src/preview/`, implement the shared API contract, interval breakdowns, folder choices, release replay, linked-skill metadata, and worktree attribution. Verify preserved landing-page navigation, preview tab and analytics links, focus, reset, scaling, and expansion.
3. **Verify the new preview flows** (`45ffc51`). Add browser cases under `scripts/qa/` and baseline scenarios in `.claude/skills/visual-verify/scenarios.mjs`. Verify hourly and clipped daily intervals, keyboard focus return, both What's New destinations, paused folder recovery, and the linked-skill warning. Compare matching browser and Electron renders at both reference sizes.
4. **Update product copy and verify staging.** Update the landing page's skills, analytics, privacy, setup, and FAQ sections. Update `README.md`, `PRODUCT.md`, and the current preview documentation. Run local quality and browser checks, then push to website `staging` and verify its Vercel preview and the GitHub Actions platform matrix.

## Verification

- GitHub published `megatron-0.3.0-setup.exe` at 112,256,534 bytes. The installer URL returned HTTP 200, and the Homebrew tap was on v0.3.0.
- Local preview verification passed 175 tests, production interaction QA, and a 265-capture responsive sweep at 375, 768, 1024, and 1440px. The sweep reported zero scenario failures, overflow, console errors, or page errors.
- The original v0.3.0 renderer and the site preview matched pixel for pixel in 96 comparisons at 1200×720 and 860×600. Both used the same synthetic API and frozen clock. The local comparison report is `.qa/app-reference/results.json`.
- Website `main` serves production. The `staging` branch deploys to the authenticated Vercel preview. The `CI` workflow supports manual dispatch on `staging` for Linux, Windows, and macOS verification.
