import assert from 'node:assert/strict'
import { preparePreview, selectPanel } from './preview.mjs'

async function activate(control) {
  await control.focus()
  await control.press('Enter')
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
  const snapshotSources = await page
    .locator('[data-analytics-snapshot] img')
    .evaluateAll((images) => images.map((image) => image.getAttribute('src')))
  await app.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = app.getByRole('dialog', { name: 'Settings', exact: true })
  async function checkTheme(dark) {
    await page.waitForFunction((expected) => {
      const main = document.querySelector(
        '[data-preview-frame]'
      ).contentDocument
      return main.documentElement.classList.contains('dark') === expected
    }, dark)
    assert.deepEqual(
      await page
        .locator('[data-analytics-snapshot] img')
        .evaluateAll((images) =>
          images.map((image) => image.getAttribute('src'))
        ),
      snapshotSources,
      'App theme changes preserve the light snapshots.'
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
  await page.emulateMedia({ colorScheme: 'light' })
}
