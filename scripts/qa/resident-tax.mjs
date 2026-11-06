import assert from 'node:assert/strict'
import { waitForFocus } from './interactions.mjs'

async function verifyResidentTaxPlacement(page) {
  const initialScroll = await page.evaluate(() => scrollY)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  const geometry = await page.evaluate(() => {
    const card = document
      .querySelector('.context-visual')
      .getBoundingClientRect()
    const heading = document
      .querySelector('#analytics .section-heading')
      .getBoundingClientRect()
    const lastPoint = document
      .querySelector('.analytics-list article:last-child')
      .getBoundingClientRect()
    const layout = document
      .querySelector('.analytics-layout')
      .getBoundingClientRect()
    return {
      width: innerWidth,
      height: innerHeight,
      cardTop: card.top,
      cardHeight: card.height,
      headingTop: heading.top,
      lastPointBottom: lastPoint.bottom,
      layoutBottom: layout.bottom
    }
  })
  if (geometry.width < 768) {
    assert.ok(
      geometry.cardTop >= geometry.lastPointBottom,
      'On phones, the sample follows all seven points in normal page flow.'
    )
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: 'instant' }),
      initialScroll
    )
    return
  }
  assert.ok(
    Math.abs(geometry.cardTop - geometry.headingTop) <= 2,
    'The desktop sample starts beside the introduction, without an empty heading-sized gap above it.'
  )
  assert.ok(
    geometry.cardHeight < geometry.height,
    'The whole sample card must fit the viewport.'
  )
  const card = page.locator('.context-visual')
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: 'instant' }),
    geometry.cardTop
  )
  const pinned = await card.boundingBox()
  const headerBottom = await page
    .locator('[data-header]')
    .evaluate((element) => element.getBoundingClientRect().bottom)
  assert.ok(
    pinned.y >= headerBottom + 8,
    'The sticky card must clear the site navigation.'
  )
  assert.ok(
    pinned.y + pinned.height <= geometry.height - 8,
    'The card footer remains visible without scrolling the page.'
  )
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: 'instant' }),
    geometry.cardTop + 180
  )
  const afterScroll = await card.boundingBox()
  assert.ok(
    Math.abs(afterScroll.y - pinned.y) <= 2,
    'The sample stays beside the points as the page scrolls.'
  )
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: 'instant' }),
    geometry.layoutBottom - 100
  )
  const bounded = await card.boundingBox()
  const layoutBottom = await page
    .locator('.analytics-layout')
    .evaluate((element) => element.getBoundingClientRect().bottom)
  assert.ok(
    bounded.y + bounded.height <= layoutBottom + 2,
    'The sticky sample stops at the end of its own section.'
  )
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: 'instant' }),
    initialScroll
  )
}

export async function verifyResidentTaxSample(page) {
  const sample = page.frameLocator('[data-resident-tax-frame]')
  await sample.getByRole('heading', { name: 'Resident tax' }).waitFor()
  await verifyResidentTaxPlacement(page)
  await page.locator('[data-resident-tax-frame]').scrollIntoViewIfNeeded()
  await sample.getByText('Global baseline', { exact: true }).waitFor()
  await sample.getByText('Deferred, not loaded', { exact: true }).waitFor()
  assert.equal(
    await sample
      .getByText('MCP server instructions', { exact: true })
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
    true,
    'Category names must remain readable in the sample at narrow widths.'
  )
  assert.equal(await sample.getByRole('img', { name: /deferred/i }).count(), 0)
  for (const [category, tokens, percent, color] of [
    ['Skills', '10k', '1.0%', 'rgb(128, 100, 181)'],
    ['MCP server instructions', '2k', '0.2%', 'rgb(66, 125, 179)'],
    ['Memory files', '1.5k', '0.1%', 'rgb(50, 135, 121)'],
    ['Custom agents', '600', '<0.1%', 'rgb(181, 104, 135)']
  ]) {
    const segment = sample.getByRole('img', {
      name: `${category}, ${tokens} tokens, ${percent} of the context window`,
      exact: true
    })
    assert.equal(
      await segment.evaluate(
        (element) => getComputedStyle(element).backgroundColor
      ),
      color
    )
  }
  for (const [category, heading, detail, recorded] of [
    ['System prompt', 'System prompt', 'Block 1', true],
    ['System tools', 'System tools', 'Read', true],
    ['MCP server instructions', 'MCP server instructions', 'sample_docs', true],
    ['Custom agents', 'Custom agents', 'sample:reviewer', false],
    ['Memory files', 'Memory files', '1.5k', false],
    ['Skills', 'Skills', 'sample-design', false],
    ['Messages', 'Messages', 'Sample SessionStart', true],
    ['MCP tools', 'MCP tools (deferred)', 'mcp__sample_docs__search', false]
  ]) {
    const trigger = sample.getByRole('button', {
      name: new RegExp(`^${category} `)
    })
    await trigger.click()
    await sample.locator('[role="dialog"], [role="alert"]').first().waitFor()
    assert.equal(
      await sample.getByRole('alert').count(),
      0,
      `${category} opens its details without replacing the sample with an error.`
    )
    const dialog = sample.getByRole('dialog')
    await dialog.getByRole('heading', { name: heading, exact: true }).waitFor()
    await dialog.getByText(detail, { exact: true }).first().waitFor()
    if (recorded) {
      await dialog.getByText('Dev/web-app', { exact: true }).waitFor()
      const summary = dialog.locator('summary').first()
      await summary.click()
      await dialog.locator('details[open] pre').waitFor()
      assert.ok(
        (await dialog.locator('details[open] pre').innerText()).length > 0,
        `${category} exposes recorded details.`
      )
    }
    if (category === 'System prompt') {
      for (const [view, text] of [
        ['Tools', 'Read'],
        ['Cache breakpoints', 'system[1]'],
        ['System blocks', 'Block 1']
      ]) {
        await dialog.getByRole('radio', { name: view, exact: true }).click()
        await dialog.getByText(text, { exact: true }).first().waitFor()
      }
    }
    assert.equal(
      await dialog.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        return (
          bounds.top >= 0 &&
          bounds.bottom <= innerHeight &&
          bounds.left >= 0 &&
          bounds.right <= innerWidth
        )
      }),
      true,
      `${category} fits inside the sample frame.`
    )
    if (recorded) await page.keyboard.press('Escape')
    else {
      await page.locator('.context-preview-viewport').evaluate((element) => {
        element.scrollLeft = element.scrollWidth - element.clientWidth
      })
      await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    }
    await dialog.waitFor({ state: 'hidden' })
    await waitForFocus(trigger)
  }
  await sample.getByRole('button', { name: 'Refresh', exact: true }).click()
  await sample.getByRole('button', { name: 'Refresh', exact: true }).waitFor()
  assert.equal(
    await sample
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    'The resident sample must fit its frame.'
  )
  await verifyResidentTaxRecovery(page)
}

export async function verifyResidentTaxRecovery(page) {
  const browser = page.context().browser()
  if (!browser) throw new Error('Recovery verification needs an owned browser.')
  const recoveryContext = await browser.newContext({
    viewport: page.viewportSize(),
    reducedMotion: 'reduce'
  })
  const recoveryPage = await recoveryContext.newPage()
  const errors = []
  recoveryPage.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  recoveryPage.on('pageerror', (error) => errors.push(error.message))
  try {
    await recoveryPage.goto(page.url())
    const sample = recoveryPage.frameLocator('[data-resident-tax-frame]')
    await sample.getByText('Global baseline', { exact: true }).waitFor()
    const app = recoveryPage.frameLocator('[data-preview-frame]')
    await app.getByRole('button', { name: 'Settings', exact: true }).click()
    const settings = app.getByRole('dialog', { name: 'Settings', exact: true })
    const darkTheme = settings.getByRole('radio', { name: 'Dark', exact: true })
    await darkTheme.focus()
    await darkTheme.press('Enter')
    await recoveryPage.keyboard.press('Escape')
    await settings.waitFor({ state: 'hidden' })
    await sample.locator('html.dark').waitFor()
    await sample.locator('body').evaluate(async () => {
      const baseline = await window.api.getContextBaseline()
      window.api.getContextBaseline = async () => ({
        ...baseline,
        usage: { ...baseline.usage, categories: null }
      })
    })
    const viewport = recoveryPage.locator('.context-preview-viewport')
    await viewport.evaluate((element) => {
      element.scrollLeft = element.scrollWidth - element.clientWidth
    })
    await sample.getByRole('button', { name: 'Refresh', exact: true }).click()
    await sample.getByRole('alert').waitFor()
    const reload = sample.getByRole('button', {
      name: 'Reload sample',
      exact: true
    })
    assert.equal(
      await reload.count(),
      1,
      'The sample error screen offers its own working recovery control.'
    )
    const viewportBounds = await viewport.boundingBox()
    const reloadBounds = await reload.boundingBox()
    assert.ok(
      reloadBounds.x >= viewportBounds.x &&
        reloadBounds.x + reloadBounds.width <=
          viewportBounds.x + viewportBounds.width,
      'The recovery button is visible without sideways panning after an error.'
    )
    const parentScroll = await recoveryPage.evaluate(() => scrollY)
    await reload.click()
    await sample
      .getByRole('heading', { name: 'Resident tax', exact: true })
      .waitFor()
    await sample.getByText('Global baseline', { exact: true }).waitFor()
    await sample.locator('html.dark').waitFor()
    assert.equal(await sample.getByRole('alert').count(), 0)
    assert.ok(
      Math.abs((await recoveryPage.evaluate(() => scrollY)) - parentScroll) <=
        2,
      'Reloading the sample preserves the landing page position.'
    )
    await sample.getByRole('button', { name: /^System prompt / }).click()
    await sample
      .getByRole('dialog')
      .getByText('Block 1', { exact: true })
      .waitFor()
    await recoveryPage.keyboard.press('Escape')
    await sample.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.ok(
      errors.length > 0,
      'The malformed measurement reaches the error boundary.'
    )
    assert.ok(
      errors.every((message) =>
        message.includes("Cannot read properties of null (reading 'filter')")
      ),
      `Only the injected rendering failure is expected: ${errors.join('\n')}`
    )
  } finally {
    await recoveryContext.close()
  }
}
