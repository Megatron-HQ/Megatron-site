import assert from 'node:assert/strict'
import {
  openSettings,
  preparePreview,
  previewFrame,
  selectPanel
} from './preview.mjs'
import { openAnalyticsView } from './analytics-deck.mjs'
import { openMcpServer } from './preview-mcp.mjs'

async function activate(control) {
  await control.focus()
  await control.press('Enter')
}

export async function verifyFolderAccessAndWelcome(page, baseUrl) {
  await page.goto(baseUrl)
  let app = await preparePreview(page)
  await openMcpServer(app, 'review-helper')
  const addFolder = app.getByRole('button', {
    name: 'Add folder…',
    exact: true
  })
  await addFolder.press('Enter')
  await addFolder.waitFor({ state: 'hidden' })
  const settings = await openSettings(app, 'Claude Code')
  await settings
    .getByRole('button', { name: 'Revoke access to docs-site', exact: true })
    .waitFor()

  await page.goto(baseUrl)
  app = await preparePreview(page)
  const folders = await openSettings(app, 'Claude Code')
  const unreadable = folders.getByRole('list', {
    name: 'Folders not readable yet'
  })
  const hide = unreadable.getByRole('button', { name: /Hide .*docs-site/ })
  await hide.press('Enter')
  const hidden = folders.getByRole('list', { name: 'Hidden folders' })
  await hidden.getByRole('button', { name: /Show .*docs-site/ }).press('Enter')
  await hidden.waitFor({ state: 'hidden' })
  await hide.waitFor()

  const url = new URL(baseUrl)
  url.searchParams.set('scenario', 'projects-gone')
  await page.goto(url.href)
  app = await preparePreview(page)
  const goneSettings = await openSettings(app, 'Claude Code')
  await goneSettings
    .getByRole('list', { name: 'Folders not readable yet' })
    .waitFor()
  assert.equal(
    await goneSettings
      .getByRole('button', { name: /Hide .*docs-site/ })
      .count(),
    0
  )

  for (const [scenario, expected] of [
    ['onboarding-empty', 'No Claude Code data found'],
    ['onboarding-mcp-only', 'MCP servers']
  ]) {
    url.searchParams.set('scenario', scenario)
    await page.goto(url.href)
    app = previewFrame(page)
    const welcome = app.getByRole('dialog', { name: 'Welcome to Megatron' })
    await welcome
      .getByRole('button', { name: 'Next', exact: true })
      .press('Enter')
    await welcome.getByText(expected, { exact: true }).waitFor()
  }
  await page.goto(baseUrl)
  await preparePreview(page)
}

export async function verifyPreviewSettings(page) {
  const app = await preparePreview(page)
  assert.equal(
    await page
      .getByRole('button', { name: 'Simulate change', exact: true })
      .count(),
    0
  )
  assert.equal(
    await page.getByLabel('Sample file change', { exact: true }).count(),
    0
  )
  for (const panel of [
    'Activity',
    'History',
    'Tokens',
    'Cost',
    'Models',
    'Skills',
    'Resident tax'
  ]) {
    await selectPanel(app, panel)
    assert.equal(
      await app
        .getByRole('button', { name: 'Manage projects', exact: true })
        .count(),
      0
    )
  }
  const sample = await openAnalyticsView(page, 'resident-tax')
  await sample.getByRole('button', { name: /^Skills / }).click()
  await sample.getByRole('dialog').waitFor()
  const settings = await openSettings(app, 'General')
  const general = settings.getByRole('tab', { name: 'General', exact: true })
  const claudeCode = settings.getByRole('tab', {
    name: 'Claude Code',
    exact: true
  })
  await general.press('ArrowDown')
  await settings.getByRole('list', { name: 'Project folders' }).waitFor()
  assert.equal(await claudeCode.getAttribute('aria-selected'), 'true')
  await settings
    .getByRole('button', { name: 'Close', exact: true })
    .press('Enter')
  await openSettings(app)
  assert.equal(await claudeCode.getAttribute('aria-selected'), 'true')
  await claudeCode.press('ArrowUp')
  async function checkTheme(dark) {
    await page.waitForFunction((expected) => {
      const main = document.querySelector(
        '[data-preview-frame]'
      ).contentDocument
      const resident = document.querySelector(
        '[data-analytics-frame]'
      ).contentDocument
      return (
        main.documentElement.classList.contains('dark') === expected &&
        resident.documentElement.classList.contains('dark') === expected &&
        document
          .querySelector('[data-analytics-deck]')
          .classList.contains('is-dark') === expected
      )
    }, dark)
    assert.equal(
      await sample.getByRole('dialog').isVisible(),
      true,
      'Theme changes preserve the sample dialog.'
    )
  }
  for (const [label, dark] of [
    ['Dark', true],
    ['Light', false]
  ]) {
    await activate(settings.getByRole('radio', { name: label, exact: true }))
    await checkTheme(dark)
  }
  await activate(settings.getByRole('radio', { name: 'System', exact: true }))
  await page.emulateMedia({ colorScheme: 'dark' })
  await checkTheme(true)
  await page.emulateMedia({ colorScheme: 'light' })
  await checkTheme(false)
  await activate(settings.getByRole('radio', { name: 'Dark', exact: true }))
  await checkTheme(true)
  await page.getByRole('button', { name: 'Reset sample', exact: true }).click()
  await checkTheme(false)
  await activate(
    sample
      .getByRole('dialog')
      .getByRole('button', { name: 'Close', exact: true })
  )
  await page.locator('[data-deck-close]').click()
  await page.locator('[data-analytics-deck][data-state="stack"]').waitFor()
  await page.emulateMedia({ colorScheme: 'light' })
}
