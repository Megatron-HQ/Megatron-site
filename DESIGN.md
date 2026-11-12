---
name: Megatron
description: Product site for Megatron, the local-first desktop control center for Claude Code.
colors:
  signal-lime: '#e4f222'
  signal-lime-pressed: '#d4e019'
  signal-olive: '#657100'
  status-moss: '#899300'
  caution-wash: '#f2edde'
  caution-ochre: '#937227'
  caution-ink: '#716341'
  bone-paper: '#f6f6f0'
  bone-shade: '#efefe7'
  bone-raised: '#fafaf6'
  bone-wash: '#eaece1'
  hairline: '#ddded5'
  carbon-ink: '#191a17'
  carbon-ink-hover: '#3b3d35'
  muted-ink: '#66675e'
  caption-olive: '#62694e'
  graphite-stage: '#20211d'
  graphite-raised: '#25261f'
  graphite-hover: '#33352e'
  graphite-rule: '#42463b'
  stage-text: '#f2f3e8'
  stage-muted: '#bfc2b0'
typography:
  display:
    fontFamily: "'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: 'clamp(58px, 7.2vw, 108px)'
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: '-0.071em'
  headline:
    fontFamily: "'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: 'clamp(38px, 4.15vw, 60px)'
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: '-0.06em'
  title:
    fontFamily: "'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: '25px'
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: '-0.035em'
  title-sm:
    fontFamily: "'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: '19px'
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: '-0.03em'
  body-lead:
    fontFamily: "'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: '16px'
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: '-0.015em'
  body:
    fontFamily: "'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.75
  caption:
    fontFamily: "'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: '12px'
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'Geist Mono', ui-monospace, monospace"
    fontSize: '11px'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '0.065em'
  mono-data:
    fontFamily: "'Geist Mono', ui-monospace, monospace"
    fontSize: '11px'
    fontWeight: 400
    lineHeight: 2.4
  footer-mark:
    fontFamily: "'Geist Sans', ui-sans-serif, system-ui, sans-serif"
    fontSize: 'clamp(70px, 12vw, 176px)'
    fontWeight: 500
    lineHeight: 1
    letterSpacing: '-0.085em'
rounded:
  xxs: '2px'
  xs: '3px'
  sm: '4px'
  md: '5px'
  lg: '6px'
  xl: '7px'
  2xl: '8px'
  3xl: '9px'
  dot: '50%'
spacing:
  container-max: '1264px'
  gutter-desktop: '44px'
  gutter-tablet: '28px'
  gutter-mobile: '20px'
  gutter-narrow: '18px'
  section-desktop: '112px'
  section-tablet: '82px'
  section-mobile: '65px'
  panel: '33px'
  stage: '23px'
components:
  button-primary:
    backgroundColor: '{colors.signal-lime}'
    textColor: '{colors.carbon-ink}'
    rounded: '{rounded.md}'
    padding: '14px 23px'
    height: '50px'
  button-primary-hover:
    backgroundColor: '{colors.signal-lime-pressed}'
  button-ink:
    backgroundColor: '{colors.carbon-ink}'
    textColor: '{colors.bone-paper}'
    rounded: '{rounded.md}'
    padding: '14px 23px'
    height: '50px'
  button-ink-hover:
    backgroundColor: '{colors.carbon-ink-hover}'
  button-small:
    rounded: '{rounded.md}'
    padding: '9px 15px'
    height: '38px'
  preview-tab:
    backgroundColor: 'transparent'
    textColor: '{colors.stage-muted}'
    rounded: '{rounded.sm}'
    padding: '9px 18px'
  preview-tab-hover:
    backgroundColor: '{colors.graphite-hover}'
    textColor: '#ffffff'
  preview-tab-selected:
    backgroundColor: '{colors.signal-lime}'
    textColor: '{colors.carbon-ink}'
  scope-pill:
    backgroundColor: 'transparent'
    textColor: '#3e4231'
    rounded: '{rounded.md}'
    padding: '11px 15px'
  sample-tag:
    rounded: '{rounded.xs}'
    padding: '3px 5px'
  feature-panel:
    backgroundColor: '{colors.bone-shade}'
    rounded: '{rounded.lg}'
    padding: '{spacing.panel}'
  feature-panel-raised:
    backgroundColor: '{colors.bone-raised}'
    rounded: '{rounded.lg}'
    padding: '{spacing.panel}'
  product-stage:
    backgroundColor: '{colors.graphite-stage}'
    textColor: '{colors.stage-text}'
    rounded: '{rounded.3xl}'
    padding: '{spacing.stage}'
  install-panel:
    backgroundColor: '{colors.graphite-stage}'
    textColor: '{colors.stage-text}'
    rounded: '{rounded.3xl}'
    padding: '{spacing.stage}'
  install-command:
    backgroundColor: '{colors.carbon-ink}'
    textColor: '{colors.stage-text}'
    rounded: '{rounded.lg}'
    padding: '17px 18px 17px 20px'
  copy-button:
    backgroundColor: 'transparent'
    textColor: '{colors.signal-lime}'
    rounded: '{rounded.sm}'
    padding: '5px 9px'
  copy-button-hover:
    backgroundColor: '{colors.graphite-hover}'
  site-header:
    backgroundColor: '#f6f6f0f2'
    rounded: '{rounded.xl}'
    height: '64px'
---

# Design System: Megatron

## Overview

**Creative North Star: "The Signal on Paper"**

The Megatron site is warm bone paper set in carbon ink, with one acid signal running through it. Signal Lime marks what is live, selected, or actionable: the primary call to action, the active preview tab, a status dot, a text selection. Everything else is paper, ink, and hairlines, so lime means something whenever it appears.

The mood is precise, candid, and calm. Large, tightly tracked Geist Sans headlines carry the confidence. Small Geist Mono captions carry the honesty ("SAMPLE", "ILLUSTRATIVE FINDING", "LINE 13"), placed right beside the figure they qualify. Density is editorial rather than dashboard-like: generous section padding, asymmetric two-column splits, and short copy blocks held to roughly 360–450px. The page drops into Graphite at a few chosen points (the live product stage, the local-first section, the context visual), so the real app and real data read as an instrument set into the page.

Depth comes from tone and hairlines, never from lift. The system rejects glass and glow: no blurred translucent panels, no glowing accents, no shadow-lifted cards. The embedded preview runs Megatron's own pinned renderer inside an iframe with its own stylesheet. This document governs the marketing surface around that iframe and nothing inside it.

**Key Characteristics:**

- Bone paper and carbon ink, with Signal Lime as the only accent.
- Geist Sans for big, tightly tracked display type; Geist Mono for uppercase labels, captions, and data.
- Flat surfaces separated by 1px hairlines and small tonal steps.
- Graphite sections that frame the real app and the real install commands.
- Small radii (2–9px) that grow with the element.
- Every sample and estimate labeled in mono, next to the number.

## Colors

A warm, slightly green-cast neutral system with one high-voltage accent and a small ochre family reserved for lint warnings.

### Primary

- **Signal Lime** (#e4f222): The only loud color, inherited from the desktop app. It fills the primary CTAs (the hero button and the Windows download), the selected preview and platform tabs, status dots on Graphite, the lead segment of the context chart, `::selection`, and the skip link. On paper it is fill-only (1.14:1 against Bone Paper). On Graphite it can carry text and focus outlines (13.1:1), as on the install panel's Copy button.
- **Signal Lime Pressed** (#d4e019): Hover fill for lime buttons, paired with a #bdc817 border.
- **Signal Olive** (#657100): Lime darkened enough to write with on paper (4.94:1 on Bone Paper). Used for the focus outline on paper, FAQ summary hover text, and the copy-status message. Two near-identical drift values (#647005, #617009) exist in the code; treat both as this token.
- **Status Moss** (#899300): Status dots on paper (hero eyebrow, release status, scope caption), where full lime would disappear. #8b961e and #849226 are drift of the same role. The hero spark mark uses #c5d008, between moss and lime, as a one-off.

### Tertiary

- **Caution Wash** (#f2edde): Background of the lint-finding message band, with a #e2d8bb top rule.
- **Caution Ochre** (#937227): The triangle-alert icon in a lint finding. The flagged code token uses #8a6627 text with a #b29053 wavy underline.
- **Caution Ink** (#716341): Lint caption and line label (5.04:1 on Caution Wash).

### Neutral

- **Bone Paper** (#f6f6f0): Page background, `theme-color`, and text on ink buttons.
- **Bone Shade** (#efefe7): One tonal step down, for full-bleed bands (analytics). The inventory panel (#eeeee6) and footer (#edeee5) sit in the same tier.
- **Bone Raised** (#fafaf6): The lighter panel tier (lint feature).
- **Bone Wash** (#eaece1): Hover fill for controls on paper: menu toggle and mobile nav rows.
- **Hairline** (#ddded5): 1px rules, panel borders, FAQ dividers, the scrolled header border, and the preview viewport border. Slightly darker variants (#d9dccb, #d4d7c7, #dedfd2) appear on shaded bands and snippets.
- **Carbon Ink** (#191a17): All primary text, ink buttons, and text on lime.
- **Carbon Ink Hover** (#3b3d35): Hover fill for ink buttons.
- **Muted Ink** (#66675e): Secondary body copy and nav links (5.28:1 on Bone Paper, 4.96:1 on Bone Shade).
- **Caption Olive** (#62694e): Mono captions, line numbers, step labels, and the footer legal row.
- **Graphite Stage** (#20211d): The product stage, the local-first section, the expanded preview, and the install panel.
- **Graphite Raised** (#25261f): The raised dark tier. The context visual uses it at #25271e.
- **Graphite Hover** (#33352e): Hover fill for controls on Graphite.
- **Graphite Rule** (#42463b): Dividers on Graphite. Bordered dark controls use #515449 or #555b45.
- **Stage Text** (#f2f3e8): Primary text on Graphite. #f4f4ec (stage) is a local variant.
- **Stage Muted** (#bfc2b0): Secondary text on Graphite (8.91:1). #c6c8bc (tabs, hints) and #b4b6aa (fine print) are its lighter and darker siblings.

The context-composition chart uses a lime-to-graphite data ramp on Graphite Raised: #e4f222, #aeb76d, #7c8255, #f3f3e9, #a7a8a0, #565750. Chart color comes from this family, not from an outside palette.

### Named Rules

**The Signal Rule.** Signal Lime marks only what is live, selected, or actionable. A lime element that is none of those is decoration, so remove it.

**The Lime Never Writes on Paper Rule.** On light surfaces lime is a fill, never text, an icon stroke, or a focus ring. Use Signal Olive or Status Moss instead. On Graphite, lime may write.

**The Ochre Means Lint Rule.** The caution family belongs to lint findings. No other warm hue appears on the site.

## Typography

**Display Font:** Geist Sans (with ui-sans-serif, system-ui), self-hosted through @fontsource
**Body Font:** Geist Sans (with ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono (with ui-monospace)

**Character:** One family in two cuts. Sans at weight 500 with heavy negative tracking makes headlines dense and declarative. Mono at small sizes with open tracking makes labels read like markings on an instrument.

### Hierarchy

- **Display** (500, clamp(58px, 7.2vw, 108px), 1.04): The hero headline only. Steps to clamp(52px, 7.1vw, 80px) at ≤960px, clamp(47px, 9.6vw, 74px) with -0.066em at ≤767px, and 46px at ≤400px.
- **Headline** (500, clamp(38px, 4.15vw, 60px), 1.06): Section headings, set as two short lines with a manual break. The local-first section runs larger at clamp(38px, 4.6vw, 67px); the FAQ is fixed at 43px.
- **Title** (500, 25px, 1.5): Feature panel and plugin headings. 21px at tablet widths.
- **Title Small** (500, 19px, 1.5): Analytics list headings. Local principles use 18px and the after-install step uses 15px.
- **Body Lead** (400, 16px, 1.6): The hero description, in Muted Ink.
- **Body** (400, 14px, 1.75): Feature, section, and FAQ copy, in Muted Ink, held to 360–450px measures. FAQ answers stay at 14px within 450px at every width. Tight tablet columns step body down to 12–13px, never lower.
- **Caption** (400, 12px, 1.6): Every short sentence that qualifies or supports something nearby: the stage's sample-data notice, the hero availability line, the card-stack note, install notes, copy status, lint messages, notes, after-install steps, and the footer row. Captions wrap rather than shrink.
- **Label** (400, 11px, 0.065em, uppercase): Eyebrows, section indexes ("01 / YOUR SETUP, ORGANIZED"), SAMPLE tags, "ILLUSTRATIVE FINDING", "LINE 13", "NEXT", card numbers and captions, uppercase in the markup and often led by a status dot. 11px is the floor; there are no smaller label variants.
- **Mono Data** (400, 11px, 2.4): Code snippets and inline code (2.25 line height in snippets). The install command is the one exception at 13px/1.8 (12px below 768px), because it is the Mac call to action.
- **Footer Mark** (500, clamp(70px, 12vw, 176px), 1, -0.085em): The giant MEGATRON wordmark that closes the page.

Weights in use are 400 and 500. Weight 600 is reserved for the header wordmark.

### Named Rules

**The Tight Display, Open Label Rule.** Sans display type tracks tighter as it grows, from -0.035em at 25px to -0.085em at the footer mark. Mono labels always track open (+0.045em to +0.065em). Never track a mono label negative or a headline positive.

**The Two-Line Headline Rule.** Section headlines are two short declarative lines broken by hand ("All the pieces. / Finally together."). A headline should never wrap to three lines at desktop width.

**The Candor Floor Rule.** Candor is the brand, so the honest lines are never the smallest text on the page. Nothing renders below 11px: mono labels, code, and control labels floor at 11px at every breakpoint. Every sentence, qualifiers included (sample notices, estimates, requirements, the independence line), floors at 12px and sits beside what it qualifies. When a column gets tight, text wraps or the layout gives way; type never shrinks below the floor to fit.

## Layout

The content column is `min(1264px, 100% - 88px)`, centered. Side gutters step from 44px to 28px (≤960px), 20px (≤767px), and 18px (≤400px). The sticky header is deliberately wider than the content (`min(1376px, 100% - 48px)`) and floats 16px from the top (10px on mobile). On mobile the product stage widens to `100% - 24px`, wider than the text column, so the app gets more room.

Sections use 112px of vertical padding, stepping to 82px at ≤960px and 65px at ≤767px. Anchor jumps leave 104px of scroll padding for the floating header.

Grids are asymmetric two-column splits that collapse to a single column at ≤767px:

- Hero: headline plus a 276px aside, aligned to the bottom edge.
- Section heading: headline plus a 360px paragraph, bottom-aligned to the headline.
- Features: two equal panels with a 22px gap, followed by a full-width plugin row.
- Analytics: equal columns with an 86px gap.
- Local-first: 1.1fr / 0.9fr with a 95px gap.
- Install and FAQ: 1fr / 1.1fr with a 95px gap.

Spacing is tuned per element (23, 27, 29, 33px and so on) rather than drawn from a 4/8 scale. The structural constants are the gutters, section padding, panel padding (33px), and the 95px column gap. New work should reuse those constants and keep small offsets optically tuned.

Breakpoints are max-width 1200px, 960px, 767px, 620px, and 400px. The desktop navigation switches at min-width 768px. Verification runs at 375, 768, 1024, and 1440px with zero horizontal page overflow.

The preview iframe always lays out at least 860px wide. When its viewport is narrower, the frame is scaled down to fit (transform, never reflow), so nothing pans. The viewport height is clamp(500px, 72vh, 720px); below 768px it is a desktop-shaped window at 860:600. Expanded, it keeps the 12px inset; on phones the side padding drops to 6px (the deck modal keeps 18px) so the expanded app renders larger than inline.

## Elevation & Depth

Surfaces are flat. Depth comes from three things: tonal steps of paper (Bone Raised, Bone Paper, Bone Shade), 1px hairline borders, and switching an entire surface to Graphite. Only two shadows exist, and both respond to state.

### Shadow Vocabulary

- **Header lift** (`box-shadow: 0 4px 16px #191a1708`): Applied with a Hairline border and a 12px backdrop blur once the page scrolls past 20px.
- **Expanded preview scrim** (`box-shadow: 0 0 0 100vmax rgb(0 0 0 / 75%)`): Dims the page behind the full-screen preview. The native dialog backdrop is `rgb(20 22 18 / 45%)`.

### Named Rules

**The Flat-at-Rest Rule.** Nothing casts a shadow at rest. A shadow appears only in response to state: the header after scrolling, or the expanded preview.

**The No Glass Rule.** No translucent, blurred, or glowing panels. The one exception is the sticky header's 12px blur behind 95%-opaque paper, which exists to keep the nav legible over scrolling content.

## Shapes

Corners are small and scale with the element: 2px on inline code, 3px on sample tags, 4px on tabs, the menu toggle, and copy controls, 5px on buttons and pills, 6px on panels, the install command, and the preview viewport, 7px on the header and the context visual, 8px on icon tiles and the expanded preview, and 9px on the product stage and the install panel. 9px is the ceiling. The only circles are status dots (7px, with a 5px variant). Context legend keys are 6px squares with a 1px radius.

Borders are always 1px solid: Hairline on paper, and Graphite Rule or its control variants on Graphite.

Two recurring marks give the page its geometry. The source map draws three skill sources into the app icon with 1px connector lines and 7px rounded elbows. The hero spark is an eight-ray asterisk stroked at 6px with round caps, rotated 12°.

### Named Rules

**The Radius Tracks Size Rule.** A bigger container gets a slightly bigger radius, from 2px up to a 9px ceiling. Nothing is pill-shaped.

## Components

Precise and quietly tactile. Controls feel machined: small radii, 1px borders, and state changes in color only, with no lift and no scale.

Motion follows the same restraint. State changes are 180ms transitions on background, color, border, and opacity. Sections fade up once from 60% opacity and 14px below over 550ms ease-out, when 12% of the element is visible. The FAQ plus icon rotates 45° over 180ms. Reduced motion removes every animation, transition, and smooth scroll.

### Buttons

- **Shape:** Gently squared corners (5px).
- **Primary:** Signal Lime fill, Carbon Ink text, 14px/500, 50px minimum height, 14px 23px padding. The label sits left and a 19px icon chosen by the Glyph Convention (arrow-down on the hero CTA) is pushed right by a wide gap (30px, 49px in the hero). Used once per view. In the install panel it is the Windows download, which carries the download icon; the Mac tab's call to action is the brew command and its lime Copy outline, so the two never share a view.
- **Ink:** Carbon Ink fill with Bone Paper text. Used for the "Get Megatron" button in the nav and footer.
- **Small:** 38px tall, 9px 15px padding, 12px text, 18px gap.
- **Hover / Focus:** Lime moves to Signal Lime Pressed with a #bdc817 border; ink moves to Carbon Ink Hover. Focus is a 2px Signal Olive outline at 5px offset on paper, and a lime outline on Graphite.
- **Text link:** 13px/500 with a 16px trailing arrow chosen by the Glyph Convention, underlined on hover with a 5px offset. On Graphite the text is #ecf2d2.

**The Glyph Convention.** A trailing icon says where the control takes you. arrow-down jumps to a section that is always below it (the hero CTA). arrow-up-right goes somewhere else: an external page or new tab, a view opened in place, or an in-page jump from a spot whose position relative to the target varies (the sticky nav and footer "Get Megatron"). The download icon fetches a file. Never add a trailing arrow to something that isn't a control.

### Chips

- **Scope pill:** Static label with a 1px Hairline border, 5px radius, 11px 15px padding, 12px #3e4231 text, and a 16px icon. Pills are separated by a "/" in #9b9f8c.
- **Sample tag:** Geist Mono 11px, 1px #747667 border, 3px radius, 3px 5px padding. Reads "SAMPLE" (or "LIVE SAMPLE" on the card stack) beside any illustrative figure.

### Cards / Containers

- **Corner Style:** 6px for feature panels and the install command, 7px for the context visual.
- **Background:** Feature panels use the Bone Shade tier or Bone Raised. Dark panels use Graphite Raised.
- **Shadow Strategy:** None. See Elevation & Depth.
- **Border:** 1px Hairline on paper panels. None on Graphite panels.
- **Internal Padding:** 33px on feature panels (25–26px at smaller widths), 29px on the context visual.

### Navigation

- **Header:** A floating sticky bar, wider than the content, with a 7px radius, 95%-opaque Bone Paper, and 64px height. The border stays transparent until 20px of scroll, then picks up a Hairline border, the header-lift shadow, and the blur.
- **Wordmark:** 31px app icon (8px radius) beside "Megatron" at 19px/600, -0.045em.
- **Links:** 13px Muted Ink with 30px gaps, turning Carbon Ink on hover. A 12px GitHub link with a fork icon and a small ink CTA sit on the right.
- **Mobile (≤767px):** Links and CTA hide. A 34px bordered menu toggle opens a full-width list under a Hairline rule, with 14px rows and a Bone Wash hover. Escape closes it and returns focus to the toggle.

### Product Stage

The signature component. A Graphite Stage frame (9px radius, 23px padding) holds the live app renderer. The top row pairs a lime-dot eyebrow with an "Explore the product" hint. The toolbar holds the Skills, Plugins, and Usage tabs: 4px radius, 12px Stage Muted text, Graphite Hover with white text on hover, and a lime fill with ink text when selected. Host buttons have a 1px #515449 border, 4px radius, and 11px text. The viewport has a 1px Hairline border, a 6px radius, and a #fcfcfc ground; it clips rather than scrolls (see Layout for scaling). A Caption row at the bottom (12px) says it is an interactive preview on sample data and that the visitor's local setup is never accessed. Expanding moves the same iframe into a native modal dialog inset 12px, with an 8px radius and the scrim shadow.

### Signal Eyebrow

A mono uppercase label led by a 7px status dot: lime on Graphite, Status Moss on paper. Section indexes ("01 / …") sit in Muted Ink above each section heading.

### Install Panel

The install section's one panel, in Graphite Stage with a 9px radius and 23px padding (17px below 768px), so the real install path gets the same frame as the real app. It holds macOS and Windows tabs styled exactly like the preview tabs. The visitor's platform is preselected, and only Windows is detected: everyone else, phones included, starts on macOS. Without JavaScript the tabs stay hidden and both platforms stack, separated by a 1px Graphite Hover rule.

Each platform opens with an 11px mono Stage Muted label: "INSTALL WITH HOMEBREW · APPLE SILICON" or "WINDOWS INSTALLER · 64-BIT". Naming Apple silicon in the label is how Intel Mac visitors find out, since browsers can't report the architecture.

- **macOS:** the brew command sits in a Carbon Ink box (1px Graphite Hover border, 6px radius) at 13px mono, after a Stage Muted `$` drawn as generated content so it is never copied. A narrow box wraps after `--cask` and indents the tap name 2ch under the command. The tap name never breaks, and Copy drops below only when the two can't share a row. Copy is the lime-outlined button: 1px Signal Lime border, lime 11px text, 4px radius, Graphite Hover on hover. Its label changes to Copied, Selected, or Copy failed for 2.5 seconds. A polite live region below the panel reports the result in Signal Olive at 12px. Copying collapses whitespace, so a formatter line break never pastes as a newline. Under the box, a 12px note gives the upgrade command. A Graphite Hover rule separates the secondary .dmg text link, which carries the download icon and has the 11px mono Stage Muted size beside it. The Gatekeeper step follows and says Homebrew skips it.
- **Windows:** the lime Primary download sits beside its 11px mono size. A 12px note follows: per-user install with no administrator prompt, self-updating, and the SmartScreen step.

Notes are 12px Stage Muted (#b4b6aa). Inline code in them sits on Graphite Hover in Stage Text. Below 768px, a 12px/500 Carbon Ink note ("Desktop installers: download on your Mac or Windows PC.") sits above the panel; it is worded for any narrow window, not just phones.

### Lint Snippet

A #eeefe7 header row with the file name and an 11px "ILLUSTRATIVE FINDING" label, code at 11px mono with Caption Olive line numbers, the flagged token in ochre with a wavy underline, and a Caution Wash message band with a 12px message and an 11px "LINE 13" label.

### Context Visual

A Graphite Raised panel with a 77px/400 headline number and a smaller unit. A proportional stacked bar (37px tall, 3px gaps) uses the data ramp, followed by a two-column legend with 6px square keys and mono values, a SAMPLE tag, and a 12px Caption note explaining the sample. On the card stack that replaced this panel, card numbers and uppercase captions are 11px Labels; the front card's caption may wrap to two lines on narrow cards, and the phone layout sizes the front card for that. The Resident tax card's segments and legend dots use the desktop app's entity identity colors (Megatron 0.2.0), matching the opened view: skills #6b50c2, MCP #089ac3, memory #ae316e, agents #d36d02 on light, and #816dd2, #0cb0d4, #c25485, #c9690c on dark. Color stays on the marks; text and row surfaces stay neutral, and system overhead keeps the neutral fill.

### FAQ Disclosure

Native `details`/`summary` with Hairline top rules and a closing bottom rule. Summaries are 13px/500 and turn Signal Olive on hover. Answers are Body (14px/1.75, Muted Ink) held to a 450px measure at every width. The plus icon rotates 45° when open.

### Footer Mark

MEGATRON at Footer Mark size in #292d21, left-aligned with no trailing glyph. It is decorative and hidden from assistive technology.

## Do's and Don'ts

### Do:

- **Do** keep Signal Lime (#e4f222) to live, selected, or actionable elements, with one lime CTA per view.
- **Do** use Signal Olive (#657100) for focus rings, hover text, and status text on paper; save lime outlines for Graphite.
- **Do** separate surfaces with 1px Hairline (#ddded5) borders and tonal steps, and drop to Graphite Stage (#20211d) to frame the real app.
- **Do** label every illustrative figure with a mono SAMPLE tag or an "Illustrative" caption placed beside it.
- **Do** keep radii between 2px and 9px, scaled to the size of the element.
- **Do** track display type negative and mono labels positive.
- **Do** keep secondary text at Muted Ink (#66675e) or darker on paper, and at Stage Muted (#bfc2b0) or lighter on Graphite.
- **Do** keep marketing tokens out of the preview iframe; the vendored renderer's stylesheet owns everything inside it.
- **Do** remove all animation, transitions, and smooth scrolling under `prefers-reduced-motion`.

### Don't:

- **Don't** use glassmorphism, blurred translucent panels, glowing accents, or shadow-lifted cards.
- **Don't** set lime text, icons, or focus rings on Bone Paper; the pair measures 1.14:1.
- **Don't** add a shadow to any surface at rest.
- **Don't** introduce a second accent hue; warm ochre is reserved for lint findings.
- **Don't** make buttons, cards, or tags pill-shaped; status dots are the only circles.
- **Don't** lift, scale, or translate controls on hover; state changes are color only.
- **Don't** shrink a label below 11px or a sentence below 12px to fit a narrow column; let it wrap instead.
