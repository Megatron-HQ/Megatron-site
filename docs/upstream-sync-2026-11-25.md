# Megatron v0.5.1 website sync

The site started with desktop v0.4.0 at `08a04051443b5350cc84df4739608a71419248e3`. The new renderer pins v0.5.1 at `f48cacf8d0e27523c31c48841a183fd9d081e2e7`, which matched desktop `main` during the audit. The tracking issue covers all 31 commits, including the v0.4.1 release, the v0.5.0 release, and the v0.5.1 connector fix. [Commit audit](https://github.com/Megatron-HQ/Megatron-site/issues/9) · [Desktop comparison](https://github.com/Megatron-HQ/Megatron/compare/v0.4.0...v0.5.1)

| Issue                                                         | Website change                                                                                                                                                                   |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#10](https://github.com/Megatron-HQ/Megatron-site/issues/10) | The Windows installer points to v0.5.1. The public asset returned HTTP 200 and is 112,370,786 bytes, shown as 107 MB. The versionless Homebrew and curl paths resolve to v0.5.1. |
| [#11](https://github.com/Megatron-HQ/Megatron-site/issues/11) | The imported renderer adds the Settings panes, inline project folder grants, four-area welcome, and release catalog. About shows 0.5.1 and replays the v0.5.0 highlights.        |
| [#12](https://github.com/Megatron-HQ/Megatron-site/issues/12) | Sample MCP Add, JSON paste, declaration precedence, missing commands, and sign-in including the zero-call connector use in-memory fixtures.                                      |
| [#13](https://github.com/Megatron-HQ/Megatron-site/issues/13) | Archived usage appears in inventory and rolling Usage. Resident tax asks before the first sample measurement in both entry points.                                               |
| [#14](https://github.com/Megatron-HQ/Megatron-site/issues/14) | The landing page, setup and FAQ explain the new behavior. The walkthrough opens and closes the MCP Add form before showing a server detail.                                      |
| [#15](https://github.com/Megatron-HQ/Megatron-site/issues/15) | The release checks cover the exact renderer pin, responsive layout and end-to-end browser interactions.                                                                          |

## Verification

- Verified the installer version and download URL with and without JavaScript, keyboard platform switching, and the install section at 375, 768, 1024 and 1440px.
- Focused production browser checks covered Settings pane memory, keyboard navigation, folder grants, Hide and Show, and release links. They also covered MCP-only and empty welcome, Add with JSON, sign-in for a newly discovered connector, a missing-command notice, the pruned Skill activity log, and Resident tax consent in both preview entry points.
- On Windows, all 192 tests passed, along with lint, formatting, mirror checks, and the production build. Production browser QA passed across 375, 768, 1024 and 1440px. It covered the walkthrough, all eight Usage panels, the landing page, and download and FAQ access without JavaScript.
- The final full responsive sweep passed with 293 captures at 375, 768, 1024 and 1440px, with zero scenario failures, horizontal overflow, or browser errors.
- All 166 upstream source hashes matched the tagged checkout. Renderer parity captured 118 comparisons at 1200×720 and 860×600 with zero browser errors. The strict pixel comparison reported differences between Electron and Chromium. At the visual suite's 0.1 pixel threshold, the largest difference was 0.03% of any frame.
