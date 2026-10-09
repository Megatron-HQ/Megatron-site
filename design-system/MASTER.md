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

The starting website had no UI. The desktop app remains unchanged, including its rail hover, sidebar navigation, chart interactions, time windows, file browsing, and keyboard controls.

Website interactions are scoped to the website: section and window tabs, sample skill filters and search, skill inspection and back navigation, sample plugin switches, chart hover/focus and click-to-pin values, mobile navigation, native FAQ disclosure, installation-command copying, and a link into the cost preview. Focus follows tab changes and skill inspection. Motion respects `prefers-reduced-motion`; hover states change color without moving layout. Scrolling the embedded preview can continue into the page at its edge.

## Verification targets

375px, 768px, 1024px, and 1440px; keyboard tabs and focus; mobile menu and Escape; all usage panels and time windows; skill search and inspection; sample plugin state; installation-copy feedback; FAQ disclosures; no page-level horizontal overflow; reduced motion; production build.
