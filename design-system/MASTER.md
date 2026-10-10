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
- Distribution: source setup for macOS and Windows. No published installers were present on October 9, 2026. Recheck official releases before adding download links.
- Product tour: Skills, Plugins, and Usage with explicitly labeled sample data. The preview never reads a visitor's local files.
- Cost language: estimated API-equivalent usage, not bills or subscription charges.
- Context language: listing-token estimates and a qualifying cold session's measured first-turn cache write, with estimated category breakdowns.
- No invented customer logos, testimonials, ratings, savings, or performance claims.

## Interaction inventory and preservation

The interactive preview uses the pinned actual Megatron renderer in `vendor/megatron/`; its stylesheet and components are authoritative inside the iframe. Marketing tokens above apply to the surrounding website. Keep these style scopes separate. Renderer updates go through `scripts/preview/sync-renderer.mjs` and record all patches in provenance.

The app's rail/sidebar hover, command palette, row sorting and keyboard navigation, lint inspection, file tree and Markdown links, dialogs, plugin management, chart interactions, and independent windows remain app-owned. Folder selection, native plugin commands, rescan, external links, and data-folder reveal act on session-only illustrative data and announce their browser behavior through the host.

External section tabs and Cost navigation synchronize with app state. Reset restores the sample session. Expansion uses the same iframe in a native modal dialog, preserves app state, and restores focus on close. App dialogs, tooltips, file/detail back paths, and effort selection get Escape first. The preview retains an 860px minimum client width on small screens, with contained horizontal panning and automatic focus reveal. Vertical scrolling continues into the page at a preview edge.

Marketing navigation, mobile menu/Escape, native FAQ disclosure, installation copying, scroll effects, and reduced motion are preserved. The old mobile dropdowns and generic chart pinning are replaced by the app's actual controls.

## Verification targets

375px, 768px, 1024px, and 1440px; keyboard tabs and focus; mobile menu and Escape; all usage panels and time windows; skill search and inspection; sample plugin state; installation-copy feedback; FAQ disclosures; no page-level horizontal overflow; reduced motion; production build.
