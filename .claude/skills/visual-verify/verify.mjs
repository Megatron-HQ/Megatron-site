// Builds Megatron site, launches a headless browser, and
// screenshots every known screen/state across all supported responsive viewports
// (mobile 375px, tablet 768px, laptop 1024px, desktop 1440px).
//
// Results are pixel-diffed against stored baselines in .visual-verify-baselines/.
// Overflow and browser console errors are reported deterministically.

import { execSync, spawn } from 'node:child_process'
import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { launchBrowser } from './browser-launch.mjs'
import { scenarios } from './scenarios.mjs'
import { parseOnly, selectScenarios } from './select-scenarios.mjs'
import { getWindowSizes } from './window-sizes.mjs'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')
const OUT_DIR = join(REPO_ROOT, '.visual-verify')
const BASELINE_DIR = join(REPO_ROOT, '.visual-verify-baselines')

const DIFF_THRESHOLD = 0.1
const DIFF_PIXEL_FLOOR = 2000

async function isServerUp(url) {
  try {
    const res = await fetch(url)
    return res.status === 200
  } catch {
    return false
  }
}

async function ensureServer() {
  const explicitUrl = process.env.MEGATRON_TEST_URL
  if (explicitUrl && (await isServerUp(explicitUrl))) {
    return { baseUrl: explicitUrl, cleanup: () => {} }
  }

  if (await isServerUp('http://127.0.0.1:5173/')) {
    return { baseUrl: 'http://127.0.0.1:5173/', cleanup: () => {} }
  }

  if (await isServerUp('http://127.0.0.1:4173/')) {
    return { baseUrl: 'http://127.0.0.1:4173/', cleanup: () => {} }
  }

  console.log('[visual-verify] starting preview server on port 4173...')
  const viteBin = join(REPO_ROOT, 'node_modules/vite/bin/vite.js')
  const previewProcess = spawn(
    process.execPath,
    [viteBin, 'preview', '--port', '4173', '--host', '127.0.0.1'],
    {
      cwd: REPO_ROOT,
      stdio: 'pipe'
    }
  )

  const cleanup = () => {
    try {
      if (process.platform === 'win32' && previewProcess.pid) {
        try {
          execSync(`taskkill /pid ${previewProcess.pid} /T /F`, {
            stdio: 'ignore'
          })
        } catch {
          previewProcess.kill()
        }
      } else {
        previewProcess.kill()
      }
    } catch {}
  }

  const startTime = Date.now()
  let ready = false
  while (Date.now() - startTime < 15_000) {
    if (await isServerUp('http://127.0.0.1:4173/')) {
      ready = true
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  if (!ready) {
    cleanup()
    throw new Error(
      'Vite preview server failed to start on http://127.0.0.1:4173/'
    )
  }

  return {
    baseUrl: 'http://127.0.0.1:4173/',
    cleanup
  }
}

async function finishTransitions(page) {
  for (const frame of page.frames()) {
    await frame.evaluate(() => {
      for (const animation of document.getAnimations()) {
        try {
          animation.finish()
        } catch {}
      }
    })
  }
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  )
}

async function diffAgainstBaseline(screenshotPath, name) {
  let baselineBuffer
  try {
    baselineBuffer = await readFile(join(BASELINE_DIR, name))
  } catch {
    return 'new'
  }

  const baseline = PNG.sync.read(baselineBuffer)
  const candidate = PNG.sync.read(await readFile(screenshotPath))

  if (
    baseline.width !== candidate.width ||
    baseline.height !== candidate.height
  ) {
    return 'changed'
  }

  const diffPixels = pixelmatch(
    baseline.data,
    candidate.data,
    null,
    baseline.width,
    baseline.height,
    {
      threshold: DIFF_THRESHOLD,
      includeAA: false
    }
  )

  return diffPixels > DIFF_PIXEL_FLOOR ? 'changed' : 'unchanged'
}

async function findOrphanBaselines(producedNames) {
  let existing
  try {
    existing = await readdir(BASELINE_DIR)
  } catch {
    return []
  }
  return existing.filter(
    (file) => file.endsWith('.png') && !producedNames.has(file)
  )
}

function registerDefectListeners(page, defects) {
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      defects.consoleErrors.push(msg.text())
    }
  })
  page.on('pageerror', (err) => {
    defects.pageErrors.push(err.message)
  })
}

async function captureAll(
  page,
  baseUrl,
  outDir,
  activeScenarios,
  sizes,
  scoped
) {
  const written = []
  const skipped = []
  const defects = { consoleErrors: [], pageErrors: [], overflow: [] }
  const diff = { new: [], changed: [], unchanged: [] }
  const producedNames = new Set()

  registerDefectListeners(page, defects)

  for (const scenario of activeScenarios) {
    for (const size of sizes) {
      const name = `${scenario.name}--${size.label}.png`
      await page.setViewportSize({ width: size.width, height: size.height })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const scenarioUrl = new URL(baseUrl)
      scenarioUrl.searchParams.set('clock', '2026-10-09T12:00:00.000Z')
      await page.clock.setFixedTime(new Date('2026-10-09T12:00:00.000Z'))
      await page.goto(scenarioUrl.href, { waitUntil: 'domcontentloaded' })
      await page.locator('#preview-skills').waitFor({ state: 'attached' })
      await page.evaluate(() => document.fonts.ready)

      const skipReason = await scenario.shouldSkip?.(page, size)
      if (skipReason) {
        console.log(`[visual-verify]   skipping ${name}: ${skipReason}`)
        skipped.push({ name, reason: skipReason })
        producedNames.add(name)
        continue
      }

      await scenario.run(page, size)
      await finishTransitions(page)

      console.log(`[visual-verify]   capturing ${name}...`)
      const path = join(outDir, name)
      await page.screenshot({ path })
      written.push(path)
      producedNames.add(name)

      diff[await diffAgainstBaseline(path, name)].push(name)

      if (await hasHorizontalOverflow(page)) {
        defects.overflow.push(name)
      }
    }
  }

  const orphanBaselines = scoped ? [] : await findOrphanBaselines(producedNames)
  return { written, skipped, defects, diff, orphanBaselines }
}

function printScopeBanner(scope, { closing } = {}) {
  if (!scope) return
  const { only, activeCount, totalCount, baselineCount } = scope

  if (baselineCount === 0) {
    if (!closing) {
      console.log(
        `[visual-verify] --only ${only.join(',')} given, but no baselines exist yet — captured all ${activeCount} scenarios.`
      )
    }
    return
  }

  if (closing) {
    console.log(
      '[visual-verify] SCOPED RUN — not a full audit. Run `npm run verify:visual` with no --only before wrapping up.'
    )
    return
  }
  console.log(
    `[visual-verify] SCOPED RUN — ${activeCount} of ${totalCount} scenarios · --only ${only.join(',')}`
  )
  console.log(
    `[visual-verify]   ${totalCount - activeCount} scenarios NOT captured this run`
  )
}

function printSummary(written, skipped, defects, diff, orphanBaselines, scope) {
  printScopeBanner(scope)
  console.log('[visual-verify] wrote:')
  for (const path of written) console.log(`  ${path}`)

  console.log(
    `[visual-verify] diff vs baseline: ${diff.new.length} new, ${diff.changed.length} changed, ${diff.unchanged.length} unchanged (skip reading these)`
  )
  if (diff.new.length > 0) {
    console.log('[visual-verify] NEW (no baseline yet — review and promote):')
    for (const name of diff.new) console.log(`  ${name}`)
  }
  if (diff.changed.length > 0) {
    console.log(
      '[visual-verify] CHANGED (differs from accepted baseline — review):'
    )
    for (const name of diff.changed) console.log(`  ${name}`)
  }
  if (skipped.length > 0) {
    console.log('[visual-verify] SKIPPED (scenario bypassed for viewport):')
    for (const { name, reason } of skipped) console.log(`  ${name}: ${reason}`)
  }
  if (orphanBaselines.length > 0) {
    console.log(
      '[visual-verify] orphaned baselines (no matching scenario this run):'
    )
    for (const name of orphanBaselines) console.log(`  ${name}`)
  }

  if (defects.overflow.length > 0) {
    console.log('[visual-verify] HORIZONTAL OVERFLOW at:')
    for (const name of defects.overflow) console.log(`  ${name}`)
  }
  if (defects.consoleErrors.length > 0) {
    console.log('[visual-verify] console errors:')
    for (const text of defects.consoleErrors) console.log(`  ${text}`)
  }
  if (defects.pageErrors.length > 0) {
    console.log('[visual-verify] uncaught page errors:')
    for (const message of defects.pageErrors) console.log(`  ${message}`)
  }
  if (
    defects.overflow.length === 0 &&
    defects.consoleErrors.length === 0 &&
    defects.pageErrors.length === 0
  ) {
    console.log('[visual-verify] no overflow or console/page errors detected.')
  }

  printScopeBanner(scope, { closing: true })
}

async function main() {
  const only = parseOnly(process.argv.slice(2))

  await mkdir(BASELINE_DIR, { recursive: true })
  const baselineNames = await readdir(BASELINE_DIR)
  const active = selectScenarios(scenarios, only, baselineNames)
  const scoped = only !== null && active.length < scenarios.length
  const scope =
    only === null
      ? null
      : {
          only,
          activeCount: active.length,
          totalCount: scenarios.length,
          baselineCount: baselineNames.length
        }

  console.log('[visual-verify] building...')
  execSync('npm run build', { cwd: REPO_ROOT, stdio: 'inherit' })

  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const { baseUrl, cleanup: cleanupServer } = await ensureServer()
  let browser
  try {
    console.log('[visual-verify] launching browser...')
    browser = await launchBrowser()
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce'
    })
    const page = await context.newPage()

    const sizes = getWindowSizes()
    const { written, skipped, defects, diff, orphanBaselines } =
      await captureAll(page, baseUrl, OUT_DIR, active, sizes, scoped)

    printSummary(written, skipped, defects, diff, orphanBaselines, scope)
    if (
      defects.overflow.length > 0 ||
      defects.consoleErrors.length > 0 ||
      defects.pageErrors.length > 0
    ) {
      process.exitCode = 1
    }
  } finally {
    await browser?.close()
    cleanupServer()
  }
}

main().catch((err) => {
  console.error('[visual-verify] failed:', err)
  process.exit(1)
})
