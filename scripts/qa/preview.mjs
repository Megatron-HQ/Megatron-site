import assert from 'node:assert/strict'
import { waitForFocus, focusForTooltip } from './interactions.mjs'

export async function simulateInventoryChange(page, action) {
  await page.evaluate(
    (change) =>
      new Promise((resolve, reject) => {
        const frame = document.querySelector('[data-preview-frame]')
        const timeout = setTimeout(() => {
          window.removeEventListener('message', receive)
          reject(new Error('Sample inventory change did not finish.'))
        }, 10000)
        function receive(event) {
          if (
            event.source !== frame.contentWindow ||
            event.origin !== location.origin ||
            event.data?.type !== 'megatron-preview:inventory-finished'
          )
            return
          clearTimeout(timeout)
          window.removeEventListener('message', receive)
          resolve()
        }
        window.addEventListener('message', receive)
        frame.contentWindow.postMessage(
          { type: 'megatron-preview:inventory-change', action: change },
          location.origin
        )
      }),
    action
  )
}

export function previewFrame(page) {
  return page.frameLocator('[data-preview-frame]')
}

export async function preparePreview(page) {
  assert.equal(
    await page.locator('[data-preview-frame]').count(),
    1,
    'The product stage must embed the actual app renderer.'
  )
  await page.locator('[data-preview-host][data-ready="true"]').waitFor()
  const app = previewFrame(page)
  await app
    .getByRole('button', { name: 'Search skills', exact: false })
    .waitFor()
  await app.locator('body').evaluate(() => document.fonts.ready)
  return app
}

export async function openSkill(app, name = 'code-review') {
  await app.getByRole('button', { name: 'Search skills', exact: false }).click()
  await app.getByPlaceholder('Search skills, plugins, projects...').fill(name)
  await app.getByRole('option').filter({ hasText: name }).first().waitFor()
  await app
    .getByPlaceholder('Search skills, plugins, projects...')
    .press('Enter')
  await app.getByRole('button', { name: 'View files', exact: true }).waitFor()
}

export async function selectPanel(app, name) {
  await app.getByRole('button', { name: 'Usage', exact: true }).click()
  await app
    .getByRole('navigation', { name: 'Usage panels' })
    .getByRole('button', { name, exact: true })
    .click()
  await app.locator('header').getByText(name, { exact: true }).waitFor()
}

export async function openResidentCategory(app, name) {
  await selectPanel(app, 'Resident tax')
  const trigger = app
    .getByRole('button', { name: new RegExp(`^${name} `) })
    .first()
  await trigger.click()
  await app.getByRole('dialog').getByRole('heading').waitFor()
  return trigger
}

async function verifyResidentContext(page, app) {
  await selectPanel(app, 'Resident tax')
  await app.getByText('Global baseline', { exact: true }).waitFor()
  await app.getByText('Deferred, not loaded', { exact: true }).waitFor()
  assert.equal(await app.getByRole('img', { name: /deferred/i }).count(), 0)
  await app.getByRole('button', { name: 'Refresh', exact: true }).click()
  assert.equal(
    await app
      .getByRole('button', { name: 'Measuring…', exact: true })
      .isDisabled(),
    true
  )
  await app.getByRole('button', { name: 'Refresh', exact: true }).waitFor()
  for (const [category, expected] of [
    ['Skills', 'sample-design'],
    ['Custom agents', 'sample:architect'],
    ['Memory files', /CLAUDE\.md/],
    ['MCP tools', 'mcp__sample_browser__navigate'],
    ['System prompt', 'System blocks'],
    ['System tools', 'Tools'],
    ['Messages', 'Sample SessionStart'],
    ['MCP server instructions', 'sample_docs']
  ]) {
    const trigger = await openResidentCategory(app, category)
    const dialog = app.getByRole('dialog')
    await dialog
      .getByText(expected, { exact: typeof expected === 'string' })
      .first()
      .waitFor()
    if (category === 'System prompt') {
      await dialog.locator('summary').first().click()
      await dialog
        .getByText(/Synthetic system instructions/)
        .last()
        .waitFor()
      await dialog
        .getByRole('radio', { name: 'Cache breakpoints', exact: true })
        .click()
      await dialog.getByText('system[1]', { exact: true }).waitFor()
      await dialog.getByRole('radio', { name: 'Tools', exact: true }).click()
      await dialog.locator('summary').first().click()
      await dialog.locator('details[open] pre').waitFor()
    }
    await dialog.getByRole('button', { name: 'Close', exact: true }).focus()
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    await waitForFocus(trigger)
  }
}

export async function verifyPreview(page) {
  const app = await preparePreview(page)
  assert.equal(await app.locator('tbody tr').count(), 20)
  const geometry = await app.locator('body').evaluate(() => {
    const rail = document.querySelector('button[aria-label="Skills"]')
      .parentElement.parentElement
    const sidebar = rail.nextElementSibling
    return {
      rail: rail.getBoundingClientRect().width,
      sidebar: sidebar.getBoundingClientRect().width
    }
  })
  assert.deepEqual(geometry, { rail: 48, sidebar: 220 })
  await app.getByRole('button', { name: 'Tokens', exact: true }).click()
  await app.locator('tbody tr').first().focus()
  await page.keyboard.press('ArrowDown')
  await waitForFocus(app.locator('tbody tr').nth(1))
  await page.keyboard.press('Enter')
  await app.getByRole('button', { name: 'View files', exact: true }).waitFor()
  await app.getByRole('button', { name: 'Back to skills', exact: true }).click()
  await openSkill(app)
  await app.getByRole('button', { name: 'View files', exact: true }).click()
  await app.getByRole('tree', { name: 'Skill files' }).waitFor()
  await app.getByLabel('Filter skill files').fill('checklist')
  await app.getByRole('treeitem').filter({ hasText: 'checklist.md' }).click()
  await app.getByRole('heading', { name: 'Review checklist' }).waitFor()
  await app.getByRole('link', { name: 'SKILL.md', exact: true }).click()
  await app
    .getByRole('heading', { name: 'code-review', exact: true, level: 1 })
    .waitFor()
  const divider = app.getByRole('separator', { name: 'Resize file tree' })
  await divider.focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(await divider.getAttribute('aria-valuenow'), '256')
  await app.getByLabel('Filter skill files').fill('large-report')
  await app
    .getByRole('treeitem')
    .filter({ hasText: 'large-report.json' })
    .click()
  await app.getByText('File too large to preview.', { exact: true }).waitFor()
  await app
    .getByRole('button', { name: 'Back to skill details', exact: true })
    .click()
  await app
    .getByRole('button', { name: /invocations?$/ })
    .first()
    .click()
  await app.getByRole('dialog').waitFor()
  await app.getByLabel('Search activity').fill('review')
  await app.getByRole('radio', { name: 'Auto', exact: true }).click()
  await app.getByRole('button', { name: 'Close', exact: true }).click()
  await app.getByRole('button', { name: 'Settings', exact: true }).click()
  await app.getByRole('radio', { name: 'Dark', exact: true }).click()
  assert.equal(await app.locator('html').getAttribute('class'), 'dark')
  await app.getByRole('radio', { name: 'Light', exact: true }).click()
  await app.getByRole('button', { name: 'Rescan now', exact: true }).click()
  await app
    .getByRole('status')
    .filter({ hasText: 'Scanning Claude Code data…' })
    .waitFor()
  assert.equal(
    await app
      .getByRole('button', { name: 'Rescanning…', exact: true })
      .isDisabled(),
    true
  )
  await app.getByText('Scan complete.', { exact: true }).waitFor()
  await app.getByRole('button', { name: 'Close', exact: true }).click()

  await app.getByRole('button', { name: 'Plugins', exact: true }).click()
  await app.locator('tbody tr').filter({ hasText: 'commit' }).click()
  await app.getByRole('button', { name: 'Disable', exact: true }).click()
  await app.getByRole('button', { name: 'Enable', exact: true }).waitFor()
  await app.getByRole('button', { name: 'Uninstall', exact: true }).click()
  await app
    .getByRole('dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click()
  assert.equal(
    await app.getByRole('button', { name: 'Uninstall', exact: true }).count(),
    1
  )

  await verifyUsageHistory(page, app)
  await selectPanel(app, 'Activity')
  const activeDay = app.locator('button[aria-haspopup="dialog"]').last()
  await activeDay.click()
  await app
    .getByRole('dialog')
    .getByText(/Activity details/)
    .waitFor()
  await page.keyboard.press('Escape')
  await waitForFocus(activeDay)
  await app.getByRole('radio', { name: '24 hours', exact: true }).click()
  await selectPanel(app, 'Cost')
  assert.equal(
    await app
      .getByRole('radio', { name: '30 days', exact: true })
      .getAttribute('aria-checked'),
    'true'
  )
  await app.getByRole('radio', { name: '24 hours', exact: true }).click()
  const pricedHour = app.locator('button[aria-haspopup="dialog"]').first()
  await pricedHour.click()
  await app
    .getByRole('dialog')
    .getByText(/Cost details/)
    .waitFor()
  await page.keyboard.press('Escape')
  await waitForFocus(pricedHour)
  await selectPanel(app, 'Models')
  const effort = app.locator('tbody button[aria-pressed]').first()
  await effort.click()
  assert.equal(await effort.getAttribute('aria-pressed'), 'true')
  await page.keyboard.press('Escape')
  assert.equal(await effort.getAttribute('aria-pressed'), 'false')
  await selectPanel(app, 'Skills')
  await app
    .getByRole('button', { name: 'Open code-review detail', exact: true })
    .first()
    .click()
  await app.getByRole('button', { name: 'Back to skills', exact: true }).click()
  await app.locator('header').getByText('Skills', { exact: true }).waitFor()
  await app
    .getByRole('button', { name: /skill invocations/ })
    .first()
    .click()
  await app.getByRole('dialog').getByLabel('Search invocations').waitFor()
  await app.getByRole('button', { name: 'Close', exact: true }).click()
  await verifyResidentContext(page, app)

  await page.getByRole('button', { name: 'Reset sample', exact: true }).click()
  await app
    .getByRole('button', { name: 'Search skills', exact: false })
    .waitFor()
  assert.equal(await app.locator('tbody tr').count(), 20)
  await page
    .getByRole('button', { name: 'Expand preview', exact: true })
    .click()
  assert.equal(
    await page.locator('[data-preview-host]').getAttribute('data-expanded'),
    'true'
  )
  const expandedGeometry = await page
    .locator('.preview-viewport')
    .evaluate((element) => ({
      height: element.clientHeight,
      windowHeight: innerHeight
    }))
  assert.ok(
    expandedGeometry.height >= expandedGeometry.windowHeight * 0.6,
    'Expansion must use the available viewport height.'
  )
  await app.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.keyboard.press('Escape')
  assert.equal(
    await page.locator('[data-preview-host]').getAttribute('data-expanded'),
    'true',
    'Escape must close an app dialog before the expanded preview.'
  )
  await app.getByRole('button', { name: 'All Skills', exact: true }).focus()
  await page.keyboard.press('Escape')
  await page.locator('[data-preview-host][data-expanded="false"]').waitFor()
  assert.equal(
    await page.locator('[data-preview-host]').getAttribute('data-expanded'),
    'false'
  )
  await waitForFocus(
    page.getByRole('button', { name: 'Expand preview', exact: true })
  )
}

export async function verifyUsageHistory(page, app) {
  await selectPanel(app, 'Tokens')
  await app
    .getByText('Total tokens processed · estimated', { exact: true })
    .waitFor()
  const total = app.locator('.text-usage-stat').first()
  const tokenValue = total.locator('[tabindex="0"][aria-label$=" tokens"]')
  const exactLabel = await tokenValue.getAttribute('aria-label')
  assert.match(exactLabel, /^[\d,]+ tokens$/)
  assert.match(await tokenValue.textContent(), /[KMB]/)
  await tokenValue.focus()
  await app
    .getByRole('tooltip')
    .getByText(exactLabel.replace(' tokens', ' exact tokens'), { exact: true })
    .waitFor()
  await tokenValue.press('Escape')
  const monthlyTotal = await total.textContent()
  await app.getByRole('radio', { name: '24 hours', exact: true }).click()
  assert.notEqual(await total.textContent(), monthlyTotal)
  assert.equal(
    await app
      .getByRole('button', { name: /estimated tokens|No recorded token data/ })
      .count(),
    24
  )
  await app.getByRole('radio', { name: '7 days', exact: true }).click()
  const weeklyTotal = await total.textContent()
  await selectPanel(app, 'Activity')
  await app.getByRole('radio', { name: '24 hours', exact: true }).click()
  assert.equal(
    await app
      .getByRole('navigation', { name: 'Contribution year', exact: true })
      .count(),
    0
  )
  await selectPanel(app, 'History')
  assert.equal(
    await app
      .getByRole('radiogroup', { name: 'Activity window', exact: true })
      .count(),
    0
  )
  const years = app.getByRole('navigation', {
    name: 'Contribution year',
    exact: true
  })
  await years.getByRole('button', { name: '2024', exact: true }).click()
  const calendar = app.getByRole('group', {
    name: 'Daily activity calendar for 2024',
    exact: true
  })
  await calendar.waitFor()
  assert.equal(
    await app
      .locator('header')
      .locator('nav[aria-label="Contribution year"]')
      .count(),
    1
  )
  await verifyHistoryYearReview(page, app, 2024)
  const tokenOnlyDay = calendar.getByRole('button', {
    name: /^(?:July 1, 2024|1 July 2024) · Prompt history unavailable$/
  })
  assert.equal(
    await tokenOnlyDay.evaluate(
      (button) => getComputedStyle(button).borderTopStyle
    ),
    'dashed'
  )
  assert.equal(await tokenOnlyDay.getAttribute('aria-haspopup'), 'dialog')
  await tokenOnlyDay.focus()
  await app
    .getByRole('tooltip')
    .getByText('162,200 exact tokens', { exact: true })
    .waitFor()
  await tokenOnlyDay.click()
  await app
    .getByRole('dialog')
    .getByText(/Prompt history is unavailable for this day/)
    .waitFor()
  await app
    .getByRole('dialog')
    .getByText(/estimated tokens processed/)
    .waitFor()
  await page.keyboard.press('Escape')
  await app.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(await calendar.locator('button').count(), 366)
  assert.ok(
    (await calendar.locator('button[aria-disabled="true"]').count()) > 0
  )
  const day = calendar.locator('button[aria-haspopup="dialog"]').last()
  await day.focus()
  await page.keyboard.press('ArrowUp')
  assert.equal(
    await day.evaluate((button) => button === document.activeElement),
    false
  )
  await day.click()
  await app
    .getByRole('dialog')
    .getByText(/Activity details/)
    .waitFor()
  await app
    .getByRole('dialog')
    .getByText(/estimated tokens processed/)
    .waitFor()
  await page.keyboard.press('Escape')
  await app.getByRole('dialog').waitFor({ state: 'hidden' })
  await waitForFocus(day)
  await selectPanel(app, 'Activity')
  assert.equal(
    await app
      .getByRole('radio', { name: '24 hours', exact: true })
      .getAttribute('aria-checked'),
    'true'
  )
  await app.getByRole('radio', { name: '7 days', exact: true }).click()
  await selectPanel(app, 'History')
  assert.equal(
    await years
      .getByRole('button', { name: '2024', exact: true })
      .getAttribute('aria-current'),
    'date'
  )
  await years.getByRole('button', { name: '2026', exact: true }).click()
  await selectPanel(app, 'Tokens')
  assert.equal(
    await app
      .getByRole('radio', { name: '7 days', exact: true })
      .getAttribute('aria-checked'),
    'true'
  )
  assert.equal(await total.textContent(), weeklyTotal)
}

async function verifyHistoryYearReview(page, app, year) {
  const expected = await app
    .locator('body')
    .evaluate(async (_, selectedYear) => {
      const calendar = await window.api.getUsageCalendar(selectedYear)
      return [
        calendar.activeDays.toLocaleString(),
        calendar.summary.longestStreak.days.toLocaleString(),
        calendar.summary.busiestDay.count.toLocaleString(),
        calendar.summary.promptsPerActiveDay.toLocaleString(undefined, {
          maximumFractionDigits: 1
        })
      ]
    }, year)
  const summary = app.getByRole('group', {
    name: 'Annual summary',
    exact: true
  })
  assert.deepEqual(
    await summary.locator('.text-usage-stat').allTextContents(),
    expected
  )
  const busiest = summary.getByRole('button', { name: /^Busiest day:/ })
  await busiest.focus()
  await busiest.press('Enter')
  await app
    .getByRole('dialog')
    .getByText(/Activity details/)
    .waitFor()
  await page.keyboard.press('Escape')
  await app.getByRole('dialog').waitFor({ state: 'hidden' })
  await waitForFocus(busiest)

  const timeline = app.getByRole('region', {
    name: 'Project timeline',
    exact: true
  })
  assert.equal(await timeline.locator('tbody tr').count(), 8)
  const expand = timeline.getByRole('button', { name: /more projects/ })
  await expand.click()
  assert.equal(await timeline.locator('tbody tr').count(), 13)
  const cell = timeline.getByRole('img').first()
  assert.equal(
    await cell.evaluate((element) => getComputedStyle(element).borderTopStyle),
    'dashed'
  )
  await focusForTooltip(cell)
  await app
    .getByRole('tooltip')
    .getByText('Unavailable', { exact: true })
    .waitFor()
  await cell.press('ArrowRight')
  assert.equal(
    await cell.evaluate((element) => element === document.activeElement),
    false
  )
  await page.keyboard.press('ArrowDown')
  await waitForFocus(
    timeline.locator('tbody tr').nth(1).locator('[role="img"]').nth(1)
  )
  const activeMonth = timeline
    .getByRole('img', { name: /Jul 2024.*recorded prompts/ })
    .first()
  await focusForTooltip(activeMonth)
  await app
    .getByRole('tooltip')
    .getByText(/of this month’s prompts/)
    .waitFor()
  assert.match(await activeMonth.getAttribute('aria-label'), /Partial history/)
  await timeline
    .getByRole('button', { name: 'Show fewer', exact: true })
    .click()
  assert.equal(await timeline.locator('tbody tr').count(), 8)
}
