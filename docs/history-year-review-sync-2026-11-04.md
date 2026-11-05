# History year-in-review website integration

Reviewed the approved app-session plan, the November 4 amendment in the app's
`docs/usage-view-ui-spec.md`, and its completed renderer and database implementation.
The website imports Megatron revision `975605b4f0fb489db3842e7720ca2f1cbef11045`.
All 104 source/license files match the reviewed app source hashes; the four existing
browser integration patches remain recorded in `vendor/megatron/provenance.json`.
The app repository was only read.

The actual `HistorySection` and `ProjectTimeline` components now render the annual
summary, contribution calendar, and monthly project timeline. The pinned header's
year selector controls all three. Calendar tooltips, arrow navigation, day details,
dialog focus return, sidebar interactions, independent rolling windows, and reduced
motion remain owned by the app renderer.

The browser adapter derives annual summaries, coverage, month totals, and project
breakdowns from the same sample daily records. It preserves earliest tied streaks
and busiest days, treats unavailable days as gaps in verified streaks, excludes
future records and bare slash commands from prompt totals, and distinguishes
unobserved years from observed empty days. Historical samples distribute activity
across ten projects so timeline expansion works in every retained year. The sample
stores no visitor data and resets through the existing host controls.

The Analytics History feature, retention FAQ, README, implementation notes, and
design-system interaction inventory now describe the expanded annual view. Browser
checks cover metric/API agreement, busiest-day keyboard activation and focus return,
project expansion, monthly coverage and share tooltips, arrow navigation, empty
History, and existing cross-panel and host behavior.

## Verification

- All 92 regression tests pass when run sequentially, including five new annual
  history regression cases.
- TypeScript, production build, snapshot integrity, ESLint, Prettier, and generated
  mirror checks pass.
- Production interactive QA passes all existing flows and the new History checks,
  all seven Usage panels at 375/768/1024/1440px, reduced motion, no-JavaScript
  installation content, and zero page overflow or browser errors.
- The full visual sweep passes 241 captures with zero page overflow, console
  warnings/errors, or uncaught page errors. All 12 new and 34 changed captures
  were reviewed and accepted; 195 match their prior baselines. The unrelated
  desktop hourly Tokens difference is its existing empty-bucket hover state,
  with unchanged values. The new month-tooltip scenario uses Arrow key navigation
  after a focus-only capture timed out; its isolated check passes all four widths.
- Eight additional captures verify the updated History marketing article and
  keyboard-opened retention FAQ at all four widths, with no page overflow or errors.
- The raw hidden-Electron reference has 74 exact matches out of 82 comparisons,
  with zero browser errors. The eight differences are History states at 860px:
  the native app document adds an outer scrollbar, while the website's existing
  `body { overflow: hidden }` keeps scrolling inside the embedded app. That extra
  native scrollbar reduces available content width by 10px. All eight History
  states at both 1200x720 and 860x600 match exactly when the reference uses the
  same document containment (16 comparisons, zero differing pixels). Raw and
  contained evidence are retained separately; the app source and website
  containment styles were not changed to normalize the result.

Evidence remains in the ignored `.qa/` verification logs and screenshots.
The initial parallel verification runs hit resource-related timeouts on the shared
Windows machine; the complete regression run passed after checks were serialized.
