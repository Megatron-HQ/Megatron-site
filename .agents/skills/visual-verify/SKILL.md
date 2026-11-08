---
name: visual-verify
description: Use after implementing any UI change requested by the user — new component, layout change, new view, theme/state-handling change — to confirm it matches what was asked for, didn't break anything else, and holds up at every window size Megatron supports. Not for aesthetic critique or taste review; it checks conformance and breakage, not whether something looks good.
---

# Visual verify

Megatron's website is a single-page landing site built with Vite, Vanilla JS marketing, an isolated React/TypeScript app preview, and Tailwind CSS v4.
This skill builds the site, drives the browser through every known screen, interactive state, and
section at every responsive viewport Megatron supports (375px mobile, 768px tablet, 1024px laptop,
1440px desktop), and provides evidence (screenshots, baseline diffs, horizontal overflow checks,
and console error reports) to verify UI changes against the actual requirement.

## Process

### Scope the run

By default, capture only the screens your change can reach. The full sweep is still required before
wrapping up (see "Before wrapping up").

Run the **full sweep** — `npm run verify:visual`, no `--only` — when any of these hold:

- `git diff --name-only` touches shared styles or global markup: `src/styles.css` or high-level structure in `index.html`.
- `src/preview/` or `vendor/megatron/` changed shared renderer or sample API behavior.
- the user asked for a full audit.
- you're not certain which screens the change reaches.

Otherwise **scope it** — `npm run verify:visual -- --only <screen>,<screen>` — mapping changed files:

| Changed file(s)                                                       | `--only` screen(s)                   |
| --------------------------------------------------------------------- | ------------------------------------ |
| `src/product-preview-host.js` / `src/preview/` (skills table, search, inspection)              | `demo-skills`                        |
| `src/product-preview-host.js` / `src/preview/` (plugin inventory and install actions)                        | `demo-plugins`                       |
| `src/product-preview-host.js` / `src/preview/` (usage panels, trend charts, model tables)      | `demo-usage`                         |
| `src/preview/fixtures.ts` / `src/preview/analytics.ts`                                                     | `demo-skills,demo-plugins,demo-usage`|
| `src/main.js` (navigation, install copy, scroll handlers)             | `hero,install,navigation`            |
| `index.html` (features section)                                       | `features`                           |
| `index.html` (analytics section)                                      | `analytics`                          |
| `index.html` (why local / privacy section)                            | `local`                              |
| `index.html` (FAQ accordions)                                         | `faq`                                |
| `index.html` (install / CTA section)                                  | `install`                            |

A changed file **not in this table → run the full sweep.**

**1. Restate the requirement.** Before running anything, write down exactly what UI change you
just implemented.

**2. Run it.**

```bash
npm run verify:visual -- --only <screen>,<screen>   # scoped run
npm run verify:visual                               # full sweep
# On Windows PowerShell, quote the flag: npm run verify:visual -- "--only" <screen>
```

This runs a production build (`npm run build`), serves that build on its own free port, and
captures each scenario at all 4 responsive viewports (375px, 768px, 1024px, 1440px). Screenshots are
saved to `.visual-verify/<scenario-name>--<viewport-label>.png`. Preview scenarios use the real renderer in its iframe, with a frozen sample clock.

Set `MEGATRON_TEST_URL` only to target a specific production server; an unreachable URL fails the run. A dev server would test unbuilt code and log development-only warnings that count as console errors.

One run per checkout at a time: a second run exits 1 while `.visual-verify.lock` names a live process.

**Reading a diff result.** Every screenshot is pixel-diffed against stored baselines in
`.visual-verify-baselines/` (gitignored, persists across runs).
Each screenshot lands in one bucket:

- **new** — no baseline exists yet. Review and promote when accepted.
- **changed** — differs from baseline by more than threshold (`0.1`, floor: `2000`px). Review carefully.
- **unchanged** — matches accepted baseline. Skip reading these.

With an empty `.visual-verify-baselines/`, every screenshot lands in **new** and nothing shows what
your change moved. Run the full sweep and promote it before changing UI, so the run after your change
shows real diffs.

**3. Read everything and judge against the requirement from step 1.**

- The last line, `RESULT: PASS|FAIL`, is the verdict, and the exit status matches it. When piping
  output through `tail` or `grep`, keep the exit status (`set -o pipefail`).
- Read every screenshot flagged `new` or `changed`. Confirm the requested change appears as intended.
- Read the scenario failure, horizontal overflow and console error reports. Every `SCENARIO FAILURES`
  entry (failure-state screenshot in `.visual-verify/failed/`), reported overflow
  (`scrollWidth > clientWidth`) or unhandled browser error is a defect to address.
- Before calling a defect pre-existing, reproduce it without your change, for example by running the
  harness in a `git archive HEAD` copy in a scratch directory.
- Check responsive viewports, especially mobile (375px) and laptop (1024px).

**4. If you find a defect caused by this change, fix it — once.** Fix the specific issue, re-run
verification to confirm, and stop there.

**5. Promote the screenshots you just accepted.** Copy accepted screenshots from
`.visual-verify/<name>.png` to `.visual-verify-baselines/<name>.png`.

**6. Clean up.** Once verified and baselined, `.visual-verify/` can be wiped. `.visual-verify-baselines/`
persists across runs.

## Before wrapping up

If any run this cycle was scoped (`--only`), do **one full `npm run verify:visual`** before calling
the UI task complete to guarantee no regressions occurred across untouched viewports or sections.

## App parity reference

Run `node scripts/qa/compare-app.mjs <app-checkout>` to compare the original pinned app renderer in hidden Electron with the standalone production preview at matching client dimensions, DPR, fonts, locale, timezone, theme and time. Inspect `.qa/app-reference/` differences; broad website baseline thresholds are not proof of renderer parity. This optional reference refresh needs the app checkout and Electron. Ordinary builds and CI use the checked-in snapshot only.
