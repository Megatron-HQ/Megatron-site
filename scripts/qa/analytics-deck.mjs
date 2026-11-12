import assert from 'node:assert/strict'
import { waitForFocus } from './interactions.mjs'

// Must match INLINE_MINIMUM_WIDTH in src/analytics-deck.js.
const INLINE_MINIMUM_WIDTH = 440
const ANALYTICS_VIEWS = [
  ['tokens', 'Tokens'],
  ['cost', 'Cost'],
  ['activity', 'Activity'],
  ['history', 'History'],
  ['models', 'Models'],
  ['skills', 'Skills'],
  ['resident-tax', 'Resident tax']
]
const SKILL_DETAIL_NOTICE =
  'Skill details live in the full Megatron preview at the top of the page.'

export function deckFrame(page) {
  return page.frameLocator('[data-analytics-frame]')
}

async function waitForView(page, view) {
  await page.waitForFunction((expected) => {
    const viewer = document.querySelector('[data-deck-viewer]')
    return (
      viewer.open &&
      viewer.dataset.frameReady === 'true' &&
      viewer.dataset.view === expected
    )
  }, view)
}

async function deckState(page) {
  return page.locator('[data-analytics-deck]').getAttribute('data-state')
}

async function expectedOpenState(page) {
  const width = await page
    .locator('[data-deck-stage]')
    .evaluate((element) => element.clientWidth)
  return width >= INLINE_MINIMUM_WIDTH ? 'inline' : 'expanded'
}

/** Opens a view from its "Explore" link in the list, as a keyboard user would. */
export async function openAnalyticsView(page, view) {
  const link = page.locator(`[data-analytics-open="${view}"]`)
  await link.focus()
  await link.press('Enter')
  await waitForView(page, view)
  return deckFrame(page)
}

async function closeDeck(page) {
  await page.locator('[data-deck-close]').click()
  await page.locator('[data-analytics-deck][data-state="stack"]').waitFor()
  await page.waitForFunction(
    () => !document.querySelector('[data-deck-viewer]').open
  )
}

async function verifyDeckPlacement(page) {
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
      'On phones, the card stack follows all seven points in normal page flow.'
    )
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: 'instant' }),
      initialScroll
    )
    return
  }
  assert.ok(
    Math.abs(geometry.cardTop - geometry.headingTop) <= 2,
    'The desktop stack starts beside the introduction, without an empty heading-sized gap above it.'
  )
  assert.ok(
    geometry.cardHeight < geometry.height,
    'The whole stack panel must fit the viewport.'
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
    'The sticky panel must clear the site navigation.'
  )
  assert.ok(
    pinned.y + pinned.height <= geometry.height - 8,
    'The panel footer remains visible without scrolling the page.'
  )
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: 'instant' }),
    geometry.cardTop + 180
  )
  const afterScroll = await card.boundingBox()
  assert.ok(
    Math.abs(afterScroll.y - pinned.y) <= 2,
    'The panel stays beside the points as the page scrolls.'
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
    'The sticky panel stops at the end of its own section.'
  )
  await page.evaluate(
    (top) => window.scrollTo({ top, behavior: 'instant' }),
    initialScroll
  )
}

/** Checks the resting stack and returns each card's headline figure by view. */
async function verifyStack(page) {
  await page.locator('[data-analytics-deck][data-stats="ready"]').waitFor()
  await page.locator('[data-deck-stage]').scrollIntoViewIfNeeded()
  const cards = await page.locator('[data-deck-open]').evaluateAll((buttons) =>
    buttons.map((button) => {
      const band = button
        .querySelector('.deck-card-band')
        .getBoundingClientRect()
      const hit = document.elementFromPoint(
        band.left + 24,
        band.top + band.height / 2
      )
      return {
        view: button.dataset.deckOpen,
        figure: button.querySelector('[data-deck-figure]').textContent,
        bandReachable: hit?.closest('[data-deck-open]') === button
      }
    })
  )
  assert.deepEqual(
    cards.map((card) => card.view),
    ANALYTICS_VIEWS.map(([view]) => view),
    'The stack follows the list order with Resident tax in front.'
  )
  for (const card of cards) {
    assert.ok(card.figure.length > 0, `${card.view} shows a headline figure.`)
    assert.ok(card.bandReachable, `${card.view}'s strip can be clicked.`)
  }
  const fits = await page.evaluate(() => {
    const stage = document
      .querySelector('[data-deck-stage]')
      .getBoundingClientRect()
    return [...document.querySelectorAll('.deck-card')].every((card) => {
      const bounds = card.getBoundingClientRect()
      return bounds.top >= stage.top - 1 && bounds.bottom <= stage.bottom + 1
    })
  })
  assert.ok(fits, 'Every card stays inside the panel.')
  return Object.fromEntries(cards.map((card) => [card.view, card.figure]))
}

async function verifyOpenedFromCard(page) {
  const card = page.locator('[data-deck-open="resident-tax"]')
  const expected = await expectedOpenState(page)
  await card.focus()
  await card.press('Enter')
  if (expected === 'inline')
    assert.ok(
      await page.locator('[data-deck-stack]').evaluate((stack) => stack.inert),
      'Opening in place takes the stack out of the tab order at once.'
    )
  await waitForView(page, 'resident-tax')
  await waitForDeckMotion(page)
  assert.equal(await deckState(page), expected)
  await waitForFocus(page.locator('#deck-viewer-title'))
  const opened = await page.evaluate(() => {
    const viewer = document.querySelector('[data-deck-viewer]')
    const stage = document
      .querySelector('[data-deck-stage]')
      .getBoundingClientRect()
    const bounds = viewer.getBoundingClientRect()
    return {
      modal: viewer.matches(':modal'),
      stackHidden: document
        .querySelector('[data-deck-stack]')
        .hasAttribute('data-covered'),
      expandHidden: document.querySelector('[data-deck-expand]').hidden,
      coversStage:
        Math.abs(bounds.top - stage.top) <= 1 &&
        Math.abs(bounds.height - stage.height) <= 1,
      title: document.querySelector('#deck-viewer-title').textContent
    }
  })
  assert.equal(opened.title, '07 / RESIDENT TAX')
  if (expected === 'inline') {
    assert.equal(opened.modal, false)
    assert.ok(opened.stackHidden, 'An opened view hides every other card.')
    assert.ok(opened.coversStage, 'The opened view takes the stack’s place.')
  } else {
    assert.ok(opened.modal, 'Narrow columns open the view full screen.')
    assert.ok(opened.expandHidden, 'A full-screen view offers only Close.')
  }
  return card
}

async function verifyResidentTaxView(page) {
  const sample = deckFrame(page)
  await sample
    .locator('header')
    .getByText('Resident tax', { exact: true })
    .waitFor()
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
    // Megatron 0.2.0 light entity identity colors.
    ['Skills', '10k', '1.0%', 'rgb(107, 80, 194)'],
    ['MCP server instructions', '2k', '0.2%', 'rgb(8, 154, 195)'],
    ['Memory files', '1.5k', '0.1%', 'rgb(174, 49, 110)'],
    ['Custom agents', '600', '<0.1%', 'rgb(211, 109, 2)']
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
    assert.notEqual(
      await deckState(page),
      'stack',
      'Escape inside a sample dialog closes only that dialog.'
    )
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
}

async function verifyEscapeReturnsToCard(page, card) {
  await deckFrame(page)
    .getByRole('button', { name: 'Refresh', exact: true })
    .focus()
  await page.keyboard.press('Escape')
  await page.locator('[data-analytics-deck][data-state="stack"]').waitFor()
  await waitForFocus(card)
  assert.equal(
    await page
      .locator('[data-deck-stack]')
      .evaluate((stack) => stack.hasAttribute('data-covered')),
    false
  )
}

/** Every Explore link opens its own view, which agrees with its card. */
async function verifyExploreLinks(page, figures) {
  for (const [view, label] of ANALYTICS_VIEWS) {
    const frame = await openAnalyticsView(page, view)
    assert.equal(await deckState(page), await expectedOpenState(page))
    await frame.locator('header').getByText(label, { exact: true }).waitFor()
    await frame.getByText(figures[view], { exact: true }).first().waitFor()
    await waitForFocus(page.locator('#deck-viewer-title'))
    await closeDeck(page)
    await waitForFocus(page.locator(`[data-analytics-open="${view}"]`))
  }
}

async function verifyInlineControls(page) {
  await openAnalyticsView(page, 'tokens')
  if ((await deckState(page)) !== 'inline') {
    await closeDeck(page)
    return false
  }
  await openAnalyticsView(page, 'models')
  assert.equal(
    await deckState(page),
    'inline',
    'Explore links switch an open view in place.'
  )
  const expand = page.locator('[data-deck-expand]')
  await expand.click()
  await page.locator('[data-analytics-deck][data-state="expanded"]').waitFor()
  assert.equal(await expand.getAttribute('aria-expanded'), 'true')
  assert.ok(
    await page
      .locator('[data-deck-viewer]')
      .evaluate((viewer) => viewer.matches(':modal'))
  )
  await page.keyboard.press('Escape')
  await page.locator('[data-analytics-deck][data-state="inline"]').waitFor()
  await waitForFocus(expand)
  const frame = deckFrame(page)
  await openAnalyticsView(page, 'skills')
  const trendBar = frame
    .getByRole('button', { name: /: [1-9]\d* skill invocations?$/ })
    .first()
  await trendBar.click()
  const invocations = frame.getByRole('dialog')
  await invocations.waitFor()
  await invocations
    .getByRole('button', { name: /^Open .+ detail$/ })
    .first()
    .click()
  await invocations.waitFor({ state: 'hidden' })
  await page
    .locator('[data-deck-notice]')
    .getByText(SKILL_DETAIL_NOTICE, { exact: true })
    .waitFor()
  await closeDeck(page)
  await waitForFocus(page.locator('[data-analytics-open="skills"]'))
  return true
}

export async function verifyAnalyticsDeck(page) {
  assert.equal(
    await page.locator('[data-analytics-frame]').getAttribute('src'),
    null,
    'The analytics sample loads only when a card is opened.'
  )
  await verifyDeckPlacement(page)
  const figures = await verifyStack(page)
  const card = await verifyOpenedFromCard(page)
  await verifyResidentTaxView(page)
  await verifyEscapeReturnsToCard(page, card)
  await verifyExploreLinks(page, figures)
  const checkedInline = await verifyInlineControls(page)
  await verifyResidentTaxRecovery(page)
  return { checkedInline }
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
    const sample = await openAnalyticsView(recoveryPage, 'resident-tax')
    await sample.getByText('Global baseline', { exact: true }).waitFor()
    if ((await deckState(recoveryPage)) === 'expanded') {
      // The theme control lives in the main preview, behind a full-screen view.
      await closeDeck(recoveryPage)
    }
    const app = recoveryPage.frameLocator('[data-preview-frame]')
    await app.getByRole('button', { name: 'Settings', exact: true }).click()
    const settings = app.getByRole('dialog', { name: 'Settings', exact: true })
    const darkTheme = settings.getByRole('radio', { name: 'Dark', exact: true })
    await darkTheme.focus()
    await darkTheme.press('Enter')
    await recoveryPage.keyboard.press('Escape')
    await settings.waitFor({ state: 'hidden' })
    // A closed full-screen view keeps its frame loaded but not visible.
    await sample.locator('html.dark').waitFor({ state: 'attached' })
    assert.ok(
      await recoveryPage
        .locator('[data-analytics-deck]')
        .evaluate((deck) => deck.classList.contains('is-dark')),
      'The card panel follows the sample theme.'
    )
    if ((await deckState(recoveryPage)) === 'stack')
      await openAnalyticsView(recoveryPage, 'resident-tax')
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
      .locator('header')
      .getByText('Resident tax', { exact: true })
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

/** Opens and closes a card with motion enabled, checking the animated path settles. */
export async function verifyAnimatedDeck(page) {
  await page.locator('[data-analytics-deck][data-stats="ready"]').waitFor()
  await page.locator('[data-deck-stage]').scrollIntoViewIfNeeded()
  const band = page.locator('[data-deck-open="history"] .deck-card-band')
  await band.click()
  await waitForView(page, 'history')
  await page.waitForFunction(() =>
    document.querySelector('[data-deck-stack]').hasAttribute('data-covered')
  )
  assert.equal(await deckState(page), 'inline')
  await waitForDeckMotion(page)
  assert.equal(
    await page
      .locator('[data-deck-viewer]')
      .evaluate((viewer) => getComputedStyle(viewer).clipPath),
    'none',
    'A finished open leaves no clip behind.'
  )
  await page.locator('[data-deck-close]').click()
  await page.locator('[data-analytics-deck][data-state="stack"]').waitFor()
  await page.waitForFunction(
    () => !document.querySelector('[data-deck-viewer]').open
  )
  await waitForFocus(page.locator('[data-deck-open="history"]'))
  await waitForDeckMotion(page)

  await band.click()
  await waitForView(page, 'history')
  const expand = page.locator('[data-deck-expand]')
  await expand.click()
  await page.locator('[data-analytics-deck][data-state="expanded"]').waitFor()
  await waitForDeckMotion(page)
  await expand.click()
  await page.locator('[data-analytics-deck][data-state="inline"]').waitFor()
  await waitForDeckMotion(page)
  await expand.click()
  await page.locator('[data-analytics-deck][data-state="expanded"]').waitFor()
  await page.locator('[data-deck-close]').click()
  await page.locator('[data-analytics-deck][data-state="stack"]').waitFor()
  await waitForFocus(page.locator('[data-deck-open="history"]'))
  await waitForDeckMotion(page)
  assert.equal(
    await page
      .locator('[data-deck-stack]')
      .evaluate((stack) => stack.hasAttribute('data-covered') || stack.inert),
    false,
    'Closing from full screen restores a usable stack.'
  )

  await band.click()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.locator('[data-analytics-deck][data-state="stack"]').waitFor()
  await waitForDeckMotion(page)
  assert.equal(
    await page.locator('[data-deck-viewer]').evaluate((viewer) => viewer.open),
    false,
    'Rapid Escapes land cleanly on the stack.'
  )
}

async function waitForDeckMotion(page) {
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            !(animation instanceof CSSTransition) &&
            !(animation instanceof CSSAnimation)
        ).length === 0
  )
}
