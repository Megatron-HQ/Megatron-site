import { launchBrowser } from '../../.claude/skills/visual-verify/browser-launch.mjs'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const baseUrl = process.env.MEGATRON_TEST_URL || 'http://127.0.0.1:5173/'
const repositoryRoot = resolve(import.meta.dirname, '../..')
const directory = join(repositoryRoot, '.qa')
await mkdir(directory, { recursive: true })
const browser = await launchBrowser()
const errors = []
const results = []

async function prepare(page) {
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type()))
      errors.push(message.text())
  })
  const response = await page.goto(baseUrl)
  assert.equal(response.status(), 200)
  await page.locator('#preview-skills').waitFor()
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
  assert.equal(await page.locator('.skill-table-row').count(), 9)
  assert.equal(await page.locator('i[data-lucide]').count(), 0)
  await page.screenshot({ path: `${directory}/desktop.png`, fullPage: false })
  await page.screenshot({
    path: `${directory}/desktop-full.png`,
    fullPage: true
  })
  await checkOverflow(page, 1440)

  await page.locator('#preview-skills').focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(
    await page.locator('#preview-plugins').getAttribute('aria-selected'),
    'true'
  )
  assert.equal(
    await page
      .locator('#preview-plugins')
      .evaluate((element) => element === document.activeElement),
    true
  )
  const pluginSwitch = page.getByRole('switch', {
    name: 'frontend sample plugin'
  })
  assert.equal(await pluginSwitch.getAttribute('aria-checked'), 'true')
  await pluginSwitch.click()
  assert.equal(
    await page
      .getByRole('switch', { name: 'frontend sample plugin' })
      .getAttribute('aria-checked'),
    'false'
  )
  await page.locator('#preview-plugins').focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(
    await page.locator('#preview-usage').getAttribute('aria-selected'),
    'true'
  )
  const defaultPromptCount = await page
    .locator('.demo-stat strong')
    .first()
    .textContent()
  await page.getByRole('tab', { name: '24 hours' }).click()
  assert.notEqual(
    await page.locator('.demo-stat strong').first().textContent(),
    defaultPromptCount
  )
  assert.equal(await page.locator('.chart-bar-button').count(), 24)
  await page.locator('.chart-bar-button').nth(8).click()
  assert.equal(
    await page.locator('.chart-bar-button').nth(8).getAttribute('aria-pressed'),
    'true'
  )
  await page.mouse.move(10, 10)
  assert.equal(
    await page
      .locator('.chart-bar-button')
      .nth(8)
      .locator('.chart-tooltip')
      .evaluate((element) => getComputedStyle(element).opacity),
    '1'
  )
  await page.keyboard.press('Enter')
  assert.equal(
    await page.locator('.chart-bar-button').nth(8).getAttribute('aria-pressed'),
    'false'
  )
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  assert.equal(
    await page.locator('.chart-bar-button[aria-pressed="true"]').count(),
    0
  )
  await page.getByRole('tab', { name: '24 hours' }).focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(
    await page
      .getByRole('tab', { name: '7 days' })
      .getAttribute('aria-selected'),
    'true'
  )
  assert.equal(await page.locator('.chart-bar-button').count(), 7)
  for (const panel of ['cost', 'models', 'skills', 'resident']) {
    await page.locator(`[data-action="panel"][data-value="${panel}"]`).click()
    assert.equal(
      await page
        .locator(`[data-action="panel"][data-value="${panel}"]`)
        .getAttribute('aria-pressed'),
      'true'
    )
    assert.ok(
      (await page.locator('.demo-usage-content').innerText()).length > 100
    )
  }
  await page.locator('[data-action="panel"][data-value="skills"]').click()
  await page.locator('.top-skill-row').first().click()
  assert.equal(
    await page.locator('#preview-skills').getAttribute('aria-selected'),
    'true'
  )
  assert.equal(await page.locator('.definition-preview').count(), 1)
  await page.locator('[data-action="back"]').click()
  assert.equal(
    await page.locator('#preview-usage').getAttribute('aria-selected'),
    'true'
  )
  await page.locator('#preview-plugins').click()
  assert.equal(
    await page
      .getByRole('switch', { name: 'frontend sample plugin' })
      .getAttribute('aria-checked'),
    'false'
  )
  results.push(
    'Desktop keyboard tabs, all usage panels, time windows, skill back navigation, and persistent sample plugin switches passed.'
  )

  await page.locator('#preview-skills').click()
  await page.locator('[data-action="source"][data-value="global"]').click()
  assert.equal(await page.locator('.skill-name').count(), 3)
  await page.locator('[data-action="source"][data-value="all"]').click()
  await page
    .getByRole('searchbox', { name: 'Search sample skills' })
    .fill('design-system')
  assert.equal(await page.locator('.skill-name').count(), 1)
  await page.getByRole('button', { name: 'Inspect design-system' }).click()
  assert.match(await page.locator('.detail-finding').innerText(), /figma/)
  assert.equal(
    await page
      .locator('[data-action="back"]')
      .evaluate((element) => element === document.activeElement),
    true
  )
  await page.locator('[data-action="back"]').click()
  assert.equal(await page.getByRole('searchbox').inputValue(), 'design-system')
  await page.getByRole('searchbox').fill('<img src=x>')
  assert.equal(await page.locator('.skill-name').count(), 0)
  assert.equal(await page.locator('#product-demo img[src="x"]').count(), 0)
  await page.getByRole('searchbox').fill('')
  assert.equal(await page.locator('.skill-name').count(), 8)
  await page.locator('[data-show-cost]').click()
  assert.equal(
    await page.locator('#preview-usage').getAttribute('aria-selected'),
    'true'
  )
  assert.match(
    await page.locator('.demo-cost-summary').innerText(),
    /API-equivalent/i
  )
  await page
    .locator('#product')
    .screenshot({ path: `${directory}/cost-preview.png` })
  await page.locator('[data-copy-install]').click()
  await page.waitForFunction(
    () =>
      /copied|selected/i.test(
        document.querySelector('[data-copy-status]').textContent
      ),
    null,
    { timeout: 5000 }
  )
  assert.match(
    await page.locator('[data-copy-status]').textContent(),
    /copied|selected/i
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
    'Skill filters, search, lint inspection, safe search text, cost link, installation copy feedback, and keyboard FAQ disclosure passed.'
  )

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(baseUrl)
    await page.locator('#preview-skills').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await checkOverflow(page, width)
    await page.locator('#preview-usage').click()
    for (const panel of ['activity', 'cost', 'models', 'skills', 'resident']) {
      if (width < 960)
        await page.locator('[data-usage-select]').selectOption(panel)
      else
        await page
          .locator(`[data-action="panel"][data-value="${panel}"]`)
          .click()
      await checkOverflow(page, width)
    }
    if (width === 375) {
      await page.locator('#preview-skills').click()
      await page.locator('[data-source-select]').selectOption('plugin')
      assert.equal(await page.locator('.skill-name').count(), 3)
      await page.locator('[data-source-select]').selectOption('all')
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({
        path: `${directory}/mobile.png`,
        fullPage: false
      })
      await page.screenshot({
        path: `${directory}/mobile-full.png`,
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
    'All five usage views have no page overflow at 375, 768, 1024, and 1440px; mobile source selection and navigation passed.'
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
    'Reduced-motion behavior and readable installation content without JavaScript passed.'
  )
  const normalContext = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'no-preference'
  })
  const normalPage = await normalContext.newPage()
  await prepare(normalPage)
  await normalPage.locator('.demo-main').hover()
  const scrollBeforeWheel = await normalPage.evaluate(() => scrollY)
  await normalPage.mouse.wheel(0, 400)
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
    'Default scroll effects and switching to reduced motion while the page is open passed.'
  )
  assert.deepEqual(errors, [], `Browser errors: ${errors.join('\n')}`)
  await writeFile(
    `${directory}/results.json`,
    JSON.stringify({ results, errors }, null, 2)
  )
  console.log(JSON.stringify({ results, errors }, null, 2))
} finally {
  await browser.close()
}
