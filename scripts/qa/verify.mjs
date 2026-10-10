import { launchBrowser } from '../../.claude/skills/visual-verify/browser-launch.mjs'
import {
  preparePreview,
  previewFrame,
  selectPanel,
  verifyPreview
} from './preview.mjs'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { verifyPreviewStates } from './states.mjs'

const baseUrl = process.env.MEGATRON_TEST_URL || 'http://127.0.0.1:5173/'
const directory = join(resolve(import.meta.dirname, '../..'), '.qa')
await mkdir(directory, { recursive: true })
const browser = await launchBrowser()
const errors = []
const externalRequests = []
const results = []

async function prepare(page) {
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (
      ['http:', 'https:'].includes(url.protocol) &&
      url.origin !== new URL(baseUrl).origin
    )
      externalRequests.push(request.url())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type()))
      errors.push(message.text())
  })
  const response = await page.goto(baseUrl)
  assert.equal(response.status(), 200)
  await preparePreview(page)
  await page.evaluate(() => document.fonts.ready)
}
async function checkOverflow(page, width) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    width: window.innerWidth
  }))
  assert.ok(
    dimensions.scrollWidth <= dimensions.width,
    `Page overflow at ${width}: ${JSON.stringify(dimensions)}`
  )
}

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce'
  })
  const page = await context.newPage()
  await prepare(page)
  assert.equal(
    await page.evaluate(() => scrollY),
    0,
    'The iframe must not pull the landing page down on load.'
  )
  assert.equal(await page.locator('i[data-lucide]').count(), 0)
  await page.screenshot({ path: join(directory, 'desktop.png') })
  await page.screenshot({
    path: join(directory, 'desktop-full.png'),
    fullPage: true
  })
  await verifyPreview(page)
  await checkOverflow(page, 1440)
  results.push(
    'Actual renderer geometry, sorting and keyboard rows, files and tree resizing, activity dialogs, settings, install-specific plugin actions, all Usage panels, independent windows, reset, expansion and Escape passed.'
  )

  await page.locator('#preview-skills').focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(
    await page.locator('#preview-plugins').getAttribute('aria-selected'),
    'true'
  )
  const app = previewFrame(page)
  await app.getByRole('button', { name: 'Plugins', exact: true }).waitFor()
  await page.locator('[data-show-cost]').click()
  await app.locator('header').getByText('Cost', { exact: true }).waitFor()
  assert.equal(
    await page.locator('#preview-usage').getAttribute('aria-selected'),
    'true'
  )
  await page
    .locator('#product')
    .screenshot({ path: join(directory, 'cost-preview.png') })
  await page.locator('[data-copy-install]').click()
  await page.waitForFunction(
    () =>
      /copied|selected/i.test(
        document.querySelector('[data-copy-status]').textContent
      ),
    null,
    { timeout: 5000 }
  )
  await page.locator('.faq-list summary').first().focus()
  await page.keyboard.press('Space')
  assert.equal(
    await page.locator('.faq-list details').first().getAttribute('open'),
    ''
  )
  assert.ok(
    await page
      .locator(
        'a[href="https://github.com/Megatron-HQ/Megatron#getting-started"]'
      )
      .count()
  )
  results.push(
    'Host arrow-key tabs, Cost CTA, installation copy and keyboard FAQ disclosure passed.'
  )
  await page.goto(baseUrl)
  await verifyPreviewStates(page, baseUrl)
  results.push(
    'Source/chevron behavior, conditional columns, budget audit filters, palette cross-section navigation, remaining file statuses, folder grants, scoped updates, invocation return filters, every time window, and loading/error/empty/action-failure states passed.'
  )

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(baseUrl)
    const frame = await preparePreview(page)
    await checkOverflow(page, width)
    for (const panel of [
      'Activity',
      'Cost',
      'Models',
      'Skills',
      'Resident tax'
    ]) {
      await selectPanel(frame, panel)
      await checkOverflow(page, width)
    }
    await page
      .getByRole('button', { name: 'Reset sample', exact: true })
      .click()
    await frame
      .getByRole('button', { name: 'Search skills', exact: false })
      .waitFor()
    const viewport = page.locator('.preview-viewport')
    const dimensions = await viewport.evaluate((element) => ({
      available: element.clientWidth,
      content: element.scrollWidth
    }))
    assert.ok(
      dimensions.content >= 860,
      'Keep the app minimum width instead of redesigning its layout.'
    )
    if (width === 375) {
      assert.ok(
        dimensions.content > dimensions.available,
        'Small screens must allow contained horizontal panning.'
      )
      await frame
        .getByRole('button', { name: 'Search skills', exact: false })
        .focus()
      await page.waitForFunction(
        () => document.querySelector('.preview-viewport').scrollLeft > 0
      )
      await viewport.evaluate((element) => {
        element.scrollLeft = 0
      })
      await page
        .getByRole('button', { name: 'Expand preview', exact: true })
        .click()
      await checkOverflow(page, width)
      await page
        .getByRole('button', { name: 'Close preview', exact: true })
        .click()
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: join(directory, 'mobile.png') })
      await page.screenshot({
        path: join(directory, 'mobile-full.png'),
        fullPage: true
      })
      await page.locator('[data-menu-toggle]').click()
      assert.equal(await page.locator('#mobile-navigation').isVisible(), true)
      await page.keyboard.press('Escape')
      assert.equal(await page.locator('#mobile-navigation').isVisible(), false)
      await page.locator('[data-menu-toggle]').click()
      await page
        .locator('#mobile-navigation')
        .getByRole('link', { name: 'Get Megatron' })
        .click()
      assert.equal(await page.locator('#mobile-navigation').isVisible(), false)
      assert.equal(new URL(page.url()).hash, '#get-started')
    }
  }
  results.push(
    'All five Usage views at 375/768/1024/1440px: no page overflow; contained app panning, keyboard focus reveal, mobile expansion and navigation passed.'
  )

  const motionPage = await context.newPage()
  await prepare(motionPage)
  const motion = await motionPage.evaluate(() => ({
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    transitions: getComputedStyle(document.querySelector('.button'))
      .transitionDuration,
    scroll: getComputedStyle(document.documentElement).scrollBehavior
  }))
  assert.equal(motion.reduced, true)
  assert.equal(motion.scroll, 'auto')
  assert.ok(
    motion.transitions.split(',').every((value) => value.trim() === '0s')
  )
  const noScriptContext = await browser.newContext({
    viewport: { width: 375, height: 900 },
    javaScriptEnabled: false
  })
  const noScriptPage = await noScriptContext.newPage()
  await noScriptPage.goto(baseUrl)
  assert.ok(await noScriptPage.locator('#install-commands').isVisible())
  await checkOverflow(noScriptPage, 375)
  results.push(
    'Reduced motion and readable installation content without JavaScript passed.'
  )

  const normalContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'no-preference'
  })
  const normalPage = await normalContext.newPage()
  await prepare(normalPage)
  await normalPage.locator('[data-preview-frame]').scrollIntoViewIfNeeded()
  const normalApp = previewFrame(normalPage)
  await normalApp.locator('tbody tr').last().scrollIntoViewIfNeeded()
  await normalApp.locator('tbody tr').last().hover()
  const scrollBeforeWheel = await normalPage.evaluate(() => scrollY)
  await normalPage.mouse.wheel(0, 500)
  await normalPage.waitForFunction(
    (before) => scrollY > before,
    scrollBeforeWheel
  )
  await normalPage.locator('.desktop-nav a[href="#analytics"]').click()
  await normalPage.waitForFunction(() =>
    document.querySelector('[data-header]').classList.contains('is-scrolled')
  )
  await normalPage.waitForFunction(() =>
    document.querySelector('.analytics-layout').classList.contains('is-in-view')
  )
  await normalPage.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(
    await normalPage.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior
    ),
    'auto'
  )
  results.push(
    'Wheel scrolling at the preview edge, default scroll effects and changing reduced motion passed.'
  )

  assert.deepEqual(errors, [], `Browser errors: ${errors.join('\n')}`)
  assert.deepEqual(
    externalRequests,
    [],
    'The preview and marketing page must use local static assets only.'
  )
  await writeFile(
    join(directory, 'results.json'),
    JSON.stringify({ results, errors }, null, 2)
  )
  console.log(JSON.stringify({ results, errors }, null, 2))
} finally {
  await browser.close()
}
