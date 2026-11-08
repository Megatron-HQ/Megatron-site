# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: heavy Claude Code users. These are developers who have collected many skills across global (`~/.claude/skills/`), project (`<repo>/.claude/skills/`), and plugin sources, installed plugins at user, project, and local scopes, and built up a long local session history. They have lost track of what is installed, what is quietly broken or shadowed, and where their usage and context go.

They already know Claude Code and are comfortable in a terminal. On the site, their job is to decide whether Megatron is worth running and then get it running.

Out of scope: users of other AI coding tools, and Linux users.

## Product Purpose

Megatron is a local-first desktop control center for Claude Code skills, plugins, and usage, for macOS and Windows. It brings scattered skills into one inventory, runs deterministic lint checks for problems that are easy to miss, manages plugins per scope through Claude Code's own CLI, and turns local session data into usage, cost, and context analytics.

This website explains Megatron to the people who need it and gets them running it. A successful visit ends with the visitor installing and running Megatron on their own machine.

## Positioning

Local and deterministic. Megatron runs entirely on the user's machine: no account, no API key, no LLM calls, no telemetry. The core analysis is deterministic. Skill inspection and analytics are read-only, and project folders are included only when the user explicitly grants access. The app is MIT-licensed open source, so anyone can check the claim by reading the source.

The website follows the same rule. It sends no analytics or remote requests and has no forms. The interactive preview runs on session-only sample data and never touches the visitor's files.

## Operating Context

- Visitors evaluate in a browser. The site embeds Megatron's actual renderer (pinned in `vendor/megatron/`) in an isolated iframe, with a typed sample API in `src/preview/`. Visitors can use Skills, Plugins, all five Usage panels, the command palette, settings, and dialogs. Native actions are simulated, and sample data is labeled as sample data.
- The primary install path is the packaged v0.1.0 release on GitHub Releases: a DMG for Apple silicon Macs and a per-user installer for 64-bit Windows. Neither is notarized or code-signed yet, so macOS asks for Open Anyway on first launch and Windows SmartScreen may warn. Running from source (`git clone`, `npm ci`, `npm run dev`) remains the alternative and requires macOS or Windows, Node.js 22.x, npm, and Git. Plugin actions also need the `claude` CLI on PATH.
- On first launch, Megatron finds global and plugin skills. Users add repositories under Settings → Project folders → Manage.
- Analytics depend on the local history and transcripts that Claude Code keeps.
- The site is currently delivered locally only. No hosting service or public deployment is configured.

## Capabilities and Constraints

**Capabilities:** a unified skill inventory with definition and bundled-file inspection; five deterministic lint checks (for example broken references, missing configuration, and shadowed names); per-scope plugin enable, disable, update, and uninstall through Claude Code's CLI with completion feedback; usage analytics over 24-hour, 7-day, and 30-day windows covering activity, models and reasoning effort, skill invocations with estimated cost attribution, and context footprint.

**Terminology:** Skills (global / project / plugin sources), Plugins (user / project / local scopes), Usage, lint findings, estimated API-equivalent usage, resident context, coverage gap.

**Constraints:**

- Cost is always _estimated API-equivalent usage_. It is never a bill, invoice, or subscription charge. Time and skill breakdowns are approximate allocations. Missing data is shown as a coverage gap.
- Context figures combine listing-token estimates with a qualifying cold session's measured first-turn cache write. Category breakdowns are estimates.
- Megatron runs alongside Claude Code and does not replace it. It does not edit skill definitions or run skill scripts. Plugin management is a separate capability that goes through Claude Code's own CLI.
- Megatron is free and open source under MIT today. Future pricing is undecided: make no commitments either way.
- Platforms are macOS and Windows only. Linux distribution and skills from other tools are out of scope.
- Distribution: v0.1.0 was published on GitHub Releases on November 8, 2026, with an Apple silicon DMG (no Intel build) and a 64-bit Windows installer. Wherever downloads appear, say they are not notarized or code-signed yet. The Homebrew cask named in the app's README is not published yet; do not advertise it until it is. Check GitHub releases before changing version, platform, or signing claims.
- The vendored renderer is never edited by hand. Updates go through `npm run preview:sync` with recorded provenance.
- The site has no telemetry, analytics, forms, or remote requests.

**Undecided:** code signing and notarization, Homebrew cask availability, future pricing, and public hosting or domain for the site.

## Brand Commitments

- Name: **Megatron**, published by **Megatron-HQ**. The mark is the desktop app's existing icon (`public/megatron-icon.png`).
- Megatron presents itself as independent software for Claude Code.
- Voice: plain, precise, and candid about limits. Headlines are short and declarative. Estimates are called estimates, samples are called samples, and anything not yet shipped is described as not yet shipped.
- The site carries over the desktop app's identity. Approved visual rules are in `DESIGN.md`.

## Evidence on Hand

- **The interactive preview:** Megatron's real renderer (revision `6a8a79b`, v0.1.0) running on illustrative sample data. This is the strongest proof the site has.
- **Open source:** [github.com/Megatron-HQ/Megatron](https://github.com/Megatron-HQ/Megatron) under the MIT license.
- **App icon:** `public/megatron-icon.png`.
- **Absent, and must not be invented:** testimonials, customer or company logos, ratings, user or download counts, star counts, benchmarks, savings or performance claims, and press. Figures in the preview and illustrations are samples, not measurements.

## Product Principles

1. **Prove, don't promise.** Lead with the real app and the real source. Every claim should be checkable.
2. **Local is the product.** Nothing the app or the site does should need the cloud. Never add tracking, accounts, or forms.
3. **Honest numbers.** Label estimates as estimates and samples as samples. Show gaps instead of hiding them.
4. **Beside Claude Code, not instead of it.** Megatron gives visibility. Claude Code remains where the work happens.
5. **Say only what ships.** Availability, platforms, and pricing reflect the current release state.

## Accessibility & Inclusion

These behaviors are already required and verified: full keyboard operation (Tab, arrow keys, Enter, Escape); a skip link; reduced-motion support; essential product and installation content available without JavaScript; responsive layouts at 375, 768, 1024, and 1440px with zero horizontal page overflow; and focus restored after the preview's expanded view closes. No formal WCAG conformance level has been recorded.
