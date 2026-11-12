import assert from 'node:assert/strict'
import { join } from 'node:path'
import { preparePreview, selectPanel } from './preview.mjs'

// Megatron 0.2.0 additions exercised through the embedded renderer: Settings
// updates and welcome replay, stale-skill markers, plugin contents, folder
// narrowing, and the Resident tax bar scale.
const STALE_TOOLTIP = 'Not run in the last 30 days of recorded sessions.'
const STALE_SKILLS = ['qa-audit', 'data-report', 'security-review']

async function activate(control) {
  await control.focus()
  await control.press('Enter')
}

async function openSettings(app) {
  await app.getByRole('button', { name: 'Settings', exact: true }).click()
  return app.getByRole('dialog', { name: 'Settings', exact: true })
}

async function verifyUpdatesAndWelcome(app, page, directory) {
  const settings = await openSettings(app)
  await settings
    .getByText('Update checks run in installed builds only.', { exact: true })
    .waitFor()
  assert.equal(
    await settings
      .getByRole('button', { name: 'Check now', exact: true })
      .isDisabled(),
    true,
    'The browser preview never checks for updates.'
  )
  const autoCheck = settings.getByRole('switch', {
    name: 'Check for updates automatically',
    exact: true
  })
  assert.equal(await autoCheck.getAttribute('aria-checked'), 'true')
  await activate(autoCheck)
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-preview-frame]')
        .contentDocument.querySelector('#auto-update-check')
        ?.getAttribute('aria-checked') === 'false'
  )
  await settings.getByText('Megatron v0.2.0', { exact: true }).waitFor()
  await settings.screenshot({ path: join(directory, 'settings-updates.png') })

  await activate(
    settings.getByRole('button', { name: 'Show welcome', exact: true })
  )
  const welcome = app.getByRole('dialog', {
    name: 'Welcome to Megatron',
    exact: true
  })
  await welcome.waitFor()
  await activate(welcome.getByRole('button', { name: 'Next', exact: true }))
  await welcome
    .getByText('Here’s what Megatron found', { exact: true })
    .waitFor()
  await welcome.screenshot({ path: join(directory, 'welcome-overview.png') })
  await activate(welcome.getByRole('button', { name: 'Next', exact: true }))
  await welcome
    .getByRole('list', { name: 'Folders Claude Code has used', exact: true })
    .waitFor()
  await welcome.screenshot({ path: join(directory, 'welcome-folders.png') })
  await activate(
    welcome.getByRole('button', { name: /^(Open Megatron|Skip for now)$/ })
  )
  await welcome.waitFor({ state: 'hidden' })
}

async function verifyStaleSkills(app) {
  await app.getByRole('button', { name: 'Skills', exact: true }).first().click()
  await app.getByRole('button', { name: 'All Skills', exact: true }).click()
  for (const name of STALE_SKILLS) {
    const row = app
      .locator('tbody tr')
      .filter({ has: app.getByText(name, { exact: true }) })
    assert.equal(
      await row.locator('svg.text-dormant').count(),
      1,
      `${name} has no sample invocations in 30 days, so it is stale.`
    )
  }
  const used = app
    .locator('tbody tr')
    .filter({ has: app.getByText('refactor', { exact: true }) })
  assert.equal(await used.locator('svg.text-dormant').count(), 0)
  const marker = app
    .locator('tbody tr')
    .filter({ has: app.getByText('qa-audit', { exact: true }) })
    .locator('svg.text-dormant')
  await marker.hover()
  await app.getByText(STALE_TOOLTIP, { exact: true }).first().waitFor()
}

async function verifyPluginContents(app, directory) {
  await app.getByRole('button', { name: 'Plugins', exact: true }).click()
  await app
    .locator('tbody tr')
    .filter({ hasText: 'frontend' })
    .filter({ hasText: 'team-tools' })
    .first()
    .click()
  for (const caption of [
    'MCP servers · 2',
    'Agents · 1',
    'Commands · 1',
    'LSP servers · 1'
  ])
    await app.getByText(caption, { exact: true }).waitFor()
  await app.getByText('http · mcp.figma.com', { exact: true }).waitFor()
  await app.locator('main').screenshot({
    path: join(directory, 'plugin-contents.png')
  })
}

async function verifyFolderNarrowing(app) {
  await openSettings(app)
  await app.getByRole('button', { name: 'Manage…', exact: true }).click()
  await app
    .getByRole('button', { name: 'Revoke access to Dev', exact: true })
    .click()
  await app
    .getByRole('group', { name: 'Revoke Dev', exact: true })
    .getByRole('button', { name: 'Keep some folders…', exact: true })
    .click()
  await app
    .getByRole('button', { name: 'Revoke access to web-app', exact: true })
    .waitFor()
  assert.equal(
    await app
      .getByRole('button', { name: 'Revoke access to Dev', exact: true })
      .count(),
    0,
    'Narrowing replaces the parent grant with the kept repository.'
  )
  await app.getByRole('button', { name: 'Done', exact: true }).click()
}

async function verifyResidentScale(app) {
  await selectPanel(app, 'Resident tax')
  await app
    .getByText('Bar shows the first 200K of 1M', { exact: true })
    .waitFor()
}

export async function verifyReleaseFeatures(page, baseUrl, directory) {
  await page.goto(baseUrl)
  const app = await preparePreview(page)
  await verifyUpdatesAndWelcome(app, page, directory)
  await verifyStaleSkills(app)
  await verifyPluginContents(app, directory)
  await verifyResidentScale(app)
  await verifyFolderNarrowing(app)
  await page.getByRole('button', { name: 'Reset sample', exact: true }).click()
  await app
    .getByRole('button', { name: 'Search skills', exact: false })
    .waitFor()
}
