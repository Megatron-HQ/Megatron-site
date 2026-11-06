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

The Follow the work panel is a card stack: one card per analytics view (Tokens, Cost, Activity, History, Models, Skills, Resident tax), fanned downward in list order with Resident tax in front. Every card has the same width; overlap and a soft top shadow give the pile its depth. Back cards show a strip with the number, title, and headline figure. The front card adds its figure, caption, the composition bar, and a category legend. Card faces are designed HTML, never screenshots. Their figures come from the same synthetic sample and clock as the opened views, using the app's default 30-day window, so a card never disagrees with the view behind it. Hover or focus lifts a card a few pixels and reveals its open arrow.

Opening a card, from the card itself or the list's Explore link, loads the actual Usage view without the app sidebar in one lazily created iframe. When the panel is at least 440px wide, the view grows from the card into the panel and replaces the stack completely; other cards stay hidden until it closes. Narrower panels (1024px laptops, tablets, phones) open the view in a full-screen native modal instead, because the app's headers wrap below that width. In place, Expand opens the same iframe full screen and Escape collapses it. Close or Escape returns to the stack and restores focus to whatever opened the view. While a view is open, Explore links switch it in place, and every open starts fresh on the card's window. Escape inside a sample dialog closes only that dialog.

The opened views keep their own controls, dialogs, refresh, and focus restoration; Skills invocation details stay available, and links to skill pages point visitors to the full preview. Resident tax keeps the imported app palette: purple skills, blue MCP, teal memory, and rose agents, with theme-specific values on both the card and the view. Color applies only to category segments and markers; text and row surfaces remain neutral. On desktop and tablet, the panel starts beside the introduction and stays below the site navigation while the seven points scroll, stopping at the end of the section. Its height is capped to the viewport; strips shrink on shorter or narrower panels, and the front card drops its legend or shrinks its figure before anything overflows. On phones the stack stays in normal flow after the seven points. Opened views keep a 440px minimum width with contained, keyboard-focusable horizontal panning. Heading, list, and panel reveals run independently and respect reduced motion.

Deck motion morphs one surface between rectangles: the view's top-left corner travels from the source while a clip trims it to the source's size, so content moves with the surface instead of being revealed mid-layout. Back cards morph from their visible strip, never their hidden body. Reveals take about 340ms and land softly; dismissals take about 280ms and also ease out, because they land on a visible target. The pile always fades as one group, so hidden card bodies never show through translucent cards; only movement is staggered.

- Open in place: the view grows out of its card while its surface shifts from card paper to panel white; its header and frame rise 6px and fade in after 80ms; the pile fades while the other cards drift down 8px, nearest first.
- Close in place: contents fade within 100ms, the view shrinks back onto its card's strip and dissolves to reveal it, and the other cards settle back from the front of the pile to the back.
- Expand and collapse: the full-screen view grows out of, or shrinks back into, the panel's exact position while the backdrop fades.
- Close from full screen: an expanded view shrinks straight onto its card as the pile settles behind the fading backdrop; a view opened full screen returns to whatever opened it, or fades and scales slightly when that element is off screen.
- Switching views while open fades the new view's contents in.
- Any new action first lands the running transition, so rapid clicks and repeated Escape never leave the deck between states.
- Reduced motion replaces every morph with a 120ms crossfade and no movement.

External section tabs synchronize with app state. Reset restores the sample session and cancels pending scan progress. Expansion uses the same iframe in a native modal dialog, preserves app state, and restores focus on close. App dialogs, tooltips, file/detail back paths, and effort selection get Escape first. The preview retains an 860px minimum client width on small screens, with contained horizontal panning and automatic focus reveal. Vertical scrolling continues into the page at a preview edge.

Marketing navigation, mobile menu/Escape, native FAQ disclosure, installation copying, scroll effects, and reduced motion are preserved. The old mobile dropdowns and generic chart pinning are replaced by the app's actual controls.

The toolbar exposes section tabs, reset, and expansion. Inventory simulations remain in the QA harness through the validated sample protocol; no visitor-facing live-refresh strip is rendered. Tests retain pending-folder, retry, recovery, and deleted-selection coverage without adding controls to the product flow.

The main preview publishes its resolved light/dark appearance after the app applies it. The host relays it to the analytics card panel and its opened view. The sample validates the parent source and origin, announces readiness to recover the latest theme even if frames load in either order, and changes theme without remounting. Light, Dark, System preference changes, and Reset all synchronize; dialogs, scroll positions, and sample data remain intact.

## Verification targets

375px, 768px, 1024px, and 1440px; keyboard tabs and focus; mobile menu and Escape; all usage panels and time windows; skill search and inspection; sample plugin state; installation-copy feedback; FAQ disclosures; no page-level horizontal overflow; reduced motion; production build.
