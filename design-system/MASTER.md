# Megatron website design system

## Approved direction

An editorial product site: off-white paper, near-black text, acid-lime accents, large typography, precise interface previews, and occasional dark sections. The marketing site extends the desktop application's palette and fonts while using a larger type scale suited to explaining the product.

The ui-ux-pro-max design-system searches informed the product-demo-first page structure, accessible controls, responsive layout, and motion rules. Product evidence and the existing Megatron identity override generic recommendations for testimonials, ratings, app-store buttons, unrelated palettes, and unsupported claims.

## Tokens

- Paper: `#f6f6f0`
- Ink: `#191a17`
- Accent: `#e4f222`, inherited from the desktop app
- Secondary text on paper: `#66675e`
- Rule lines: `#ddded5`
- Dark surface: `#20211d`
- Typeface: locally served Geist Sans; Geist Mono for technical labels and data
- Containers: 1264px maximum; consistent responsive gutters
- Shape: restrained 4–9px radii; borders provide most separation

## Content and conversion

- Audience: Claude Code users with skills across global, project, and plugin sources.
- Primary action: **Get Megatron**, leading to installation.
- Offer: currently free and open source; future pricing is undecided.
- Distribution: source setup for macOS and Windows. No published releases were present on October 18, 2026. Recheck official releases before adding download links.
- Product tour: Skills, Plugins, and Usage with explicitly labeled sample data. The preview never reads a visitor's local files.
- Cost language: estimated API-equivalent usage, not bills or subscription charges.
- Token language: input + output + cache reads + cache writes; thinking is included in output. Time-based figures are estimated shares of recorded session totals. Missing and undated data are identified separately.
- Activity and History: Activity shows recent windows; History has annual readouts for active days, longest verified streak, busiest day, and prompts per active day, followed by the contribution calendar and monthly project timeline. Its pinned year selector controls the whole panel independently of recent windows. Calendar intensity shares one scale across years; project-month intensity shares one neutral scale within the selected year. Unavailable prompt history remains dashed even when token details are available. The desktop app archives usage locally without prompt text; the website shows session-only examples.
- Token display: compact values expose exact counts on hover and keyboard focus across usage views. Exact counts retain the source data's estimation limits.
- Usage identity: retained locations have identities independent of inventory and grants. Existing confirmed location links remain honored; manual linking and unlinking are deferred and have no Usage entry point. Similar names do not merge projects. Links preserve source paths and totals and never grant folder access. Activity and History use retained prompt multiplicities for matching intervals, exclude bare slash commands, and disclose incomplete coverage.
- Context language: the configured skill-listing budget is separate from Resident tax. Resident tax uses Claude Code's own /context, measured from an empty folder as a global baseline; show used/window/percentage, deferred tools outside the total, and the autocompact reserve. Measurement happens on first open per launch and on Refresh. Category tables use /context's token values; recorded-request details use exact character sizes without inventing token estimates.
- No invented customer logos, testimonials, ratings, savings, or performance claims.
- Product terminology: user, project, and local plugin installs; locally cached marketplace versions; restart Claude Code after updates. New plugin installation stays in the CLI.
- Refresh: the desktop watches approved inventory locations, coalesces file changes, and periodically reconciles missed events. Inventory-only refreshes leave open Usage and historical-activity queries alone. Full refreshes retain startup, window-focus, folder-grant, plugin-action, and Settings → Rescan now behavior. Resident tax measures independently through its own Refresh. Confirmed missing discovered children beneath readable grants are pruned; missing explicit grants and unreadable sources retain cached data. Warnings stay scoped to the affected folder, and unreadable sources retry automatically. Missing-only scans remain informational. Automatic discovery skips temporary/build directories while preserving explicit grants.
- The sample plugin skill paths, scoped counts, lint destinations, and project catalog must agree. See `docs/product-fidelity-audit.md` for the capability audit.

## Interaction inventory and preservation

The interactive preview uses the pinned actual Megatron renderer in `vendor/megatron/`; its stylesheet and components are authoritative inside the iframe. Marketing tokens above apply to the surrounding website. Keep these style scopes separate. Renderer updates go through `scripts/preview/sync-renderer.mjs` and record all patches in provenance.

Contribution squares use darker neutral shades in light mode and lighter shades in dark mode. Hover and keyboard focus show summaries; clicking opens day details with focus restored on close. Year selection is independent of the Activity period selector. Tokens has its own period selector.

History's busiest-day readout opens the same day-details dialog and restores its trigger's focus. Project-month cells inspect prompt counts, monthly share, and coverage through hover/focus tooltips and arrow navigation; they do not open dialogs. Project rows expand beyond eight and reset their expansion when the mounted year changes. The renderer owns year-switch loading/error/retry states, neutral fills, and reduced-motion behavior.

Usage rankings and History's timeline search all project labels and linked locations, including collapsed rows. Filtering preserves shares against the full total; clearing search preserves the expansion choice. The Usage header does not expose or mount the deferred Manage projects dialog. Existing catalog identities, links, labels, search, totals, time controls, and Resident tax Refresh remain intact.

The app's rail/sidebar hover, command palette, row sorting and keyboard navigation, lint inspection, file tree and Markdown links, dialogs, plugin management, chart interactions, and independent windows remain app-owned. Folder selection, native plugin commands, rescan, external links, and data-folder reveal act on session-only illustrative data and announce their browser behavior through the host.

Resident tax retains the app's synchronized bar/row hover and focus, category identity fills, neutral system overhead, reserved-space hatch, deferred-tool list, refresh spinner, category dialogs, disclosure rows, and focus restoration. Baseline/category data and recorded requests are synthetic in the website. The desktop /context command can start configured SessionStart hooks and MCP servers; the website simulates it without running commands. Recorded details can include project configuration even though the measured baseline excludes it.

Follow the work pairs all seven benefits with static previews of their corresponding Usage panels. Inline previews use identical landscape windows, crop from the top without stretching, and fade at the lower edge to indicate more content. The complete original panel remains available through View full panel. Each snapshot shows a single selected state with dialogs closed and lists at their default expansion. All use the actual pinned renderer in light mode with synthetic data: 7 days for recent windows, 2026 for History, and the global baseline for Resident tax. Preserve every chart, breakdown, heading, and note in the full-size image. Desktop rows use balanced columns, center the copy and Explore action together beside the preview, and use compact spacing independent of the source image height. Mobile rows order text, preview, then Explore. Snapshots disclose sample data and open a native image-viewer dialog at their original readable width, with contained panning, keyboard scrolling, Escape/close, focus restoration, page-scroll locking, and reading-position restoration. Pictured app controls are inactive; existing Explore buttons select the corresponding panel in the main interactive preview. Resident tax interactions remain in that preview. Row reveals respect reduced motion and trigger independently so the taller section does not prevent reveals.

External section tabs and Tokens/Activity/History/Cost navigation synchronize with app state. Reset restores the sample session and cancels pending scan progress. Expansion uses the same iframe in a native modal dialog, preserves app state, and restores focus on close. App dialogs, tooltips, file/detail back paths, and effort selection get Escape first. The preview retains an 860px minimum client width on small screens, with contained horizontal panning and automatic focus reveal. Vertical scrolling continues into the page at a preview edge.

Marketing navigation, mobile menu/Escape, native FAQ disclosure, installation copying, scroll effects, and reduced motion are preserved. The old mobile dropdowns and generic chart pinning are replaced by the app's actual controls.

The toolbar exposes section tabs, reset, and expansion. Inventory simulations remain in the QA harness through the validated sample protocol; no visitor-facing live-refresh strip is rendered. Tests retain pending-folder, retry, recovery, and deleted-selection coverage without adding controls to the product flow.

The main interactive preview retains Light, Dark, System, and Reset behavior. Follow the work snapshots stay in light mode independently of the preview theme. Refresh snapshots with `node scripts/qa/capture-analytics.mjs` against a running local site, using `MEGATRON_TEST_URL` to override the default address. The script freezes time, locale, timezone, and theme, captures each full panel including content below the fold, verifies the panel fits without clipping, and records dimensions and selected periods in `public/analytics/manifest.json`. Regenerate snapshots when importing renderer changes, then visually review them and keep the image dimensions in `index.html` synchronized with the manifest.

## Verification targets

375px, 768px, 1024px, and 1440px; keyboard tabs and focus; mobile menu and Escape; all usage panels and time windows; skill search and inspection; sample plugin state; installation-copy feedback; FAQ disclosures; no page-level horizontal overflow; reduced motion; production build.
