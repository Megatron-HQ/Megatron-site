import assert from 'node:assert/strict'
import { waitForFocus } from './interactions.mjs'
import {
  dismissWithEscape,
  openSkill,
  preparePreview,
  selectPanel
} from './preview.mjs'

export async function openClaudeFolderSettings(app) {
  await app.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = app.getByRole('dialog', { name: 'Settings', exact: true })
  await settings.getByRole('list', { name: 'Claude Code folders' }).waitFor()
  return settings
}

export async function openWhatsNew(app) {
  const settings = await openClaudeFolderSettings(app)
  await settings
    .getByRole('button', { name: "What's new", exact: true })
    .press('Enter')
  const card = app.getByRole('region', { name: "What's new in Megatron" })
  await card.waitFor()
  return card
}

export async function openLinkedSkill(app) {
  await openSkill(app, 'synced-brief')
  await app.getByText('Links to', { exact: true }).waitFor()
}

export async function openTokenDetails(app, period = '7 days') {
  await selectPanel(app, 'Tokens')
  await app.getByRole('radio', { name: period, exact: true }).click()
  const hourly = period === '24 hours'
  const chart = app.getByRole('group', {
    name: hourly ? 'Token usage by hour' : 'Token usage by day'
  })
  const trigger = chart
    .getByRole('button', {
      name: hourly ? /estimated tokens/ : /estimated tokens.*partial day/
    })
    .last()
  const estimate = await trigger.getAttribute('aria-label')
  await trigger.press('Enter')
  const dialog = app.getByRole('dialog', { name: /Token details$/ })
  await dialog.waitFor()
  return { chart, trigger, dialog, estimate }
}

async function verifyTokenDetails(page, app) {
  for (const period of ['7 days', '24 hours']) {
    const { chart, trigger, dialog, estimate } = await openTokenDetails(
      app,
      period
    )
    for (const label of [
      'Input',
      'Output',
      'Cache reads',
      'Cache writes',
      'By model',
      'By project'
    ])
      await dialog.getByText(label, { exact: true }).waitFor()
    await dialog
      .getByText(/Estimated share|estimated shares of recorded session totals/)
      .first()
      .waitFor()
    const compactCount = estimate.match(/· ([\d.,]+[KMB]?) estimated tokens/)[1]
    assert.ok(await dialog.getByText(compactCount, { exact: true }).count())
    assert.equal(
      await dialog.getByText(/partial day/).isVisible(),
      period === '7 days'
    )
    await dismissWithEscape(page, dialog)
    await waitForFocus(trigger)
    if (period === '24 hours') {
      const empty = chart
        .getByRole('button', { name: /No recorded token data/ })
        .first()
      assert.equal(await empty.getAttribute('aria-disabled'), 'true')
      await empty.press('Enter')
      assert.equal(await dialog.count(), 0)
    }
  }
}

async function verifyFolderSwitch(page, app) {
  const settings = await openClaudeFolderSettings(app)
  const folders = settings.getByRole('list', { name: 'Claude Code folders' })
  const work = folders.getByRole('listitem').filter({ hasText: '.claude-work' })
  await work.getByRole('button', { name: /Switch to/ }).press('Enter')
  await work.getByText('Active', { exact: true }).waitFor()
  await settings
    .getByText('Restarting…', { exact: true })
    .waitFor({ state: 'hidden' })
  await dismissWithEscape(page, settings)
  await app.getByRole('button', { name: 'Plugins', exact: true }).click()
  await app
    .getByText(/No plugins (installed|found)/i)
    .first()
    .waitFor()
  await page.getByRole('button', { name: 'Reset sample', exact: true }).click()
  await openLinkedSkill(app)
  await app.getByText(/\.agents\\skills\\synced-brief$/).waitFor()
}

export async function verifyMegatron030(page, baseUrl) {
  const sample = new URL(baseUrl)
  sample.searchParams.set('clock', '2026-10-09T12:00:00.000Z')
  await page.goto(sample.href)
  const app = await preparePreview(page)
  await verifyTokenDetails(page, app)
  await verifyFolderSwitch(page, app)

  sample.searchParams.set('scenario', 'linked-skills')
  await page.goto(sample.href)
  await preparePreview(page)
  await app.getByRole('button', { name: 'Scan details', exact: true }).click()
  const settings = app.getByRole('dialog', { name: 'Settings', exact: true })
  await settings
    .getByText(/links to a folder outside your approved folders/)
    .waitFor()
  await settings.getByText(/Outside\\external-review$/).waitFor()

  sample.searchParams.set('platform', 'darwin')
  sample.searchParams.set('scenario', 'claude-folder-rejected')
  await page.goto(sample.href)
  await preparePreview(page)
  await openClaudeFolderSettings(app)
  await settings
    .getByRole('button', { name: 'Choose folder…', exact: true })
    .click()
  await settings
    .getByText(/\.claude-sandbox.*has no Claude Code data yet/)
    .waitFor()

  sample.searchParams.set('scenario', 'claude-folder-paused')
  await page.goto(sample.href)
  await preparePreview(page)
  const recover = app.getByRole('button', { name: 'Use default', exact: true })
  await app
    .getByText(/\.claude-work is missing\. Scans and plugin changes are paused/)
    .waitFor()
  await recover.press('Enter')
  await recover.waitFor({ state: 'hidden' })
  await openClaudeFolderSettings(app)
  await settings
    .getByText('Claude Code’s default. Megatron reads one folder at a time.', {
      exact: true
    })
    .waitFor()

  await page.goto(baseUrl)
  await preparePreview(page)
}
