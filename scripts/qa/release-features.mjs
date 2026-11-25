import assert from 'node:assert/strict'
import { join } from 'node:path'
import { openSettings, preparePreview, selectPanel } from './preview.mjs'

// Megatron 0.2.0 additions exercised through the embedded renderer: Settings
// updates and welcome replay, stale-skill markers, plugin contents, folder
// narrowing, and the Resident tax bar scale.
const STALE_TOOLTIP = 'Not run in the last 30 days of recorded sessions.'
const STALE_SKILLS = ['qa-audit', 'data-report', 'security-review']

async function activate(control) {
  await control.focus()
  await control.press('Enter')
}

async function verifyUpdatesAndWelcome(app, page, directory) {
  const settings = await openSettings(app, 'Updates')
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
  await settings.screenshot({ path: join(directory, 'settings-updates.png') })

  await settings.getByRole('tab', { name: 'About', exact: true }).press('Enter')
  await settings.getByText('v0.5.1', { exact: true }).waitFor()
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
  await welcome.getByText('MCP servers', { exact: true }).waitFor()
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
  // A scroll after pointer entry dismisses the tooltip. Reveal the marker
  // first and move the pointer off it while the final scroll event settles.
  await marker.scrollIntoViewIfNeeded()
  await marker.page().mouse.move(0, 0)
  await marker.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  )
  await marker.hover()
  await app
    .getByText(STALE_TOOLTIP, { exact: true })
    .filter({ visible: true })
    .first()
    .waitFor()
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
  // The sample returns figma once per install (1.4.0 and 1.2.0), as the
  // desktop query does; the renderer's scopePluginDetail lists it once.
  assert.equal(await app.getByText('figma', { exact: true }).count(), 1)
  await app.locator('main').screenshot({
    path: join(directory, 'plugin-contents.png')
  })

  // A project view keeps only that project's install, so its components come
  // from the 1.2.0 project install alone.
  await app.getByRole('button', { name: 'Plugins', exact: true }).click()
  const expandDev = app.getByRole('button', {
    name: 'Expand Dev repositories',
    exact: true
  })
  if (await expandDev.isVisible()) await expandDev.click()
  await app.getByRole('button', { name: /^web-app/ }).click()
  await app
    .locator('tbody tr')
    .filter({ hasText: 'frontend' })
    .filter({ hasText: 'team-tools' })
    .first()
    .click()
  await app.getByText('MCP servers · 2', { exact: true }).waitFor()
  assert.equal(await app.getByText('figma', { exact: true }).count(), 1)
}

async function verifyFolderNarrowing(app) {
  const settings = await openSettings(app, 'Claude Code')
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
  await settings
    .getByRole('button', { name: 'Close', exact: true })
    .press('Enter')
}

const CHAT_GROUP = /^Claude app chats \(\d+\)$/
const ESTIMATED_COST_CAVEAT =
  'Part of a branched conversation was cleaned up by Claude Code; its cost is an estimate.'

// Folderless Claude desktop chats fold into one row that opens by keyboard,
// read as titles or start dates, and never show their scratch path.
async function verifyClaudeAppChats(app) {
  for (const panel of ['Cost', 'History']) {
    await selectPanel(app, panel)
    const group = app.getByRole('button', { name: CHAT_GROUP }).first()
    await group.waitFor()
    assert.equal(await group.getAttribute('aria-expanded'), 'false')
    await group.focus()
    await group.press('Enter')
    assert.equal(await group.getAttribute('aria-expanded'), 'true')
    await app
      .getByText('Draft the Q4 planning memo', { exact: true })
      .first()
      .waitFor()
    assert.equal(
      await app
        .locator('main')
        .getByText(/scratch-/)
        .count(),
      0,
      `${panel} must name chats, never their scratch folders.`
    )
    await group.press('Enter')
  }
}

async function verifyEstimatedCost(page, baseUrl) {
  const url = new URL(baseUrl)
  url.searchParams.set('scenario', 'cost-estimated')
  await page.goto(url.href)
  const app = await preparePreview(page)
  await selectPanel(app, 'Cost')
  await app.getByText(ESTIMATED_COST_CAVEAT, { exact: true }).first().waitFor()
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
  await verifyClaudeAppChats(app)
  await verifyFolderNarrowing(app)
  await page.getByRole('button', { name: 'Reset sample', exact: true }).click()
  await app
    .getByRole('button', { name: 'Search skills', exact: false })
    .waitFor()
  await verifyEstimatedCost(page, baseUrl)
}
