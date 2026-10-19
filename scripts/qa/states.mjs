import assert from 'node:assert/strict'
import {
  preparePreview,
  previewFrame,
  openSkill,
  selectPanel
} from './preview.mjs'

// Sample repositories sit under the granted Dev folder, as under a parent grant in the app.
async function openDevRepository(app, name) {
  await app
    .getByRole('button', { name: 'Expand Dev repositories', exact: true })
    .click()
  await app.getByRole('button', { name: new RegExp(`^${name}`) }).click()
}

async function selectSkill(app, name) {
  await app.getByRole('button', { name: /^Search/ }).click()
  const search = app.getByPlaceholder('Search skills, plugins, projects...')
  await search.fill(name)
  await search.press('Enter')
}

export async function verifyPreviewStates(page, baseUrl) {
  await page.locator('#product').scrollIntoViewIfNeeded()
  const app = await preparePreview(page)
  const collapse = app.getByRole('button', {
    name: 'Collapse project list',
    exact: true
  })
  if (await collapse.isVisible()) {
    await collapse.click()
    await app
      .getByRole('button', { name: 'Expand project list', exact: true })
      .click()
  } else {
    await app
      .getByRole('button', { name: 'Expand project list', exact: true })
      .click()
  }
  assert.equal(
    await app.locator('tbody tr').count(),
    20,
    'Chevron expansion must preserve the current filter.'
  )
  await app.getByRole('button', { name: 'Projects', exact: true }).click()
  assert.equal(await app.locator('tbody tr').count(), 6)
  // Clicking an already-selected Projects button toggles folder list expansion (commit 3a2439c)
  await app.getByRole('button', { name: 'Projects', exact: true }).click()
  assert.equal(
    await app
      .getByRole('button', { name: 'Expand project list', exact: true })
      .isVisible(),
    true,
    'Clicking an active Projects row must collapse the list.'
  )
  await app.getByRole('button', { name: 'Projects', exact: true }).click()
  assert.equal(
    await app
      .getByRole('button', { name: 'Collapse project list', exact: true })
      .isVisible(),
    true,
    'Clicking again must re-expand the list.'
  )
  await app.getByRole('button', { name: 'Global', exact: true }).click()
  assert.equal(await app.locator('tbody tr').count(), 9)
  assert.equal(
    await app.locator('thead').getByText('Source', { exact: true }).count(),
    0
  )
  await app.getByRole('button', { name: 'All Skills', exact: true }).click()
  assert.equal(
    await app.locator('thead').getByText('Source', { exact: true }).count(),
    1
  )
  for (const column of ['Name', 'Status', 'Source', 'Tokens', 'Uses']) {
    await app
      .locator('thead')
      .getByRole('button', { name: column, exact: true })
      .click()
    assert.equal(await app.locator('tbody tr').count(), 20)
  }
  await app.getByRole('button', { name: /EST\. tokens/ }).click()
  await app
    .getByRole('button', { name: 'View disabled skills', exact: true })
    .click()
  assert.equal(await app.locator('tbody tr').count(), 2)
  await app.getByRole('button', { name: /EST\. tokens/ }).click()
  await app
    .getByRole('button', { name: 'View user-invocable skills', exact: true })
    .click()
  assert.equal(await app.locator('tbody tr').count(), 1)

  await app.getByRole('button', { name: 'Plugins', exact: true }).click()
  for (const repository of ['User', 'Dev/web-app']) {
    const row = app
      .locator('tbody tr')
      .filter({ hasText: 'frontend' })
      .filter({ hasText: 'team-tools' })
      .filter({ hasText: repository })
    await row.waitFor()
    assert.equal(
      await row.getByRole('cell', { name: '1', exact: true }).count(),
      1,
      'Each version-specific plugin inventory must show its installed skill.'
    )
  }
  await selectSkill(app, 'security-review')
  await app.getByText('No description provided.', { exact: true }).waitFor()
  await app.getByRole('button', { name: 'Back to skills', exact: true }).click()
  assert.equal(
    await app.locator('tbody tr').count(),
    20,
    'Palette navigation must clear an incompatible source filter.'
  )
  await openSkill(app)
  await app.getByRole('button', { name: 'View files', exact: true }).click()
  for (const [file, message] of [
    ['icon.png', 'Binary or unreadable file — no preview available.'],
    [
      'archived-log.txt',
      'Preview limit reached. This file or part of the file tree is not included in this preview.'
    ]
  ]) {
    await app.getByLabel('Filter skill files').fill(file)
    await app.getByRole('treeitem').filter({ hasText: file }).click()
    await app.getByText(message, { exact: true }).waitFor()
  }
  await app.getByLabel('Filter skill files').press('Escape')
  assert.equal(await app.getByLabel('Filter skill files').inputValue(), '')
  await app
    .getByRole('button', { name: 'Back to skill details', exact: true })
    .click()

  await app.getByRole('button', { name: 'Plugins', exact: true }).click()
  await app
    .locator('tbody tr')
    .filter({ hasText: 'docs' })
    .filter({ hasText: 'docs-site' })
    .click()
  assert.equal(
    await app
      .getByRole('button', { name: 'Disable', exact: true })
      .first()
      .isDisabled(),
    true
  )
  await app
    .getByRole('button', { name: 'C:\\Clients\\docs-site', exact: true })
    .click()
  await app.getByRole('button', { name: 'Add Folder...', exact: true }).click()
  await app
    .getByRole('button', {
      name: 'Revoke access to Clients/docs-site',
      exact: true
    })
    .waitFor()
  await app.getByRole('button', { name: 'Done', exact: true }).click()
  await app
    .getByRole('button', { name: 'Disable', exact: true })
    .first()
    .click()
  await app.getByRole('button', { name: 'Enable', exact: true }).waitFor()
  await app
    .getByRole('button', { name: 'Back to plugins', exact: true })
    .click()
  await app
    .locator('tbody tr')
    .filter({ hasText: 'docs' })
    .filter({ hasText: 'Unknown project' })
    .click()
  assert.equal(
    await app
      .getByRole('button', { name: 'Disable', exact: true })
      .first()
      .isDisabled(),
    true,
    'The install with no owning project must remain non-actionable.'
  )
  await app
    .getByRole('button', { name: 'Back to plugins', exact: true })
    .click()
  await app
    .locator('tbody tr')
    .filter({ hasText: 'frontend' })
    .filter({ hasText: 'User' })
    .filter({ hasText: 'team-tools' })
    .click()
  await app.getByRole('button', { name: 'Update', exact: true }).first().click()
  await app
    .getByRole('button', { name: 'Update', exact: true })
    .first()
    .waitFor({ state: 'visible' })
  await app.locator('[title="Installed version: v1.5.0"]').first().waitFor()
  await app
    .getByRole('button', { name: 'Back to plugins', exact: true })
    .click()
  await app
    .locator('tbody tr')
    .filter({ hasText: 'frontend' })
    .filter({ hasText: 'web-app' })
    .filter({ hasText: 'team-tools' })
    .click()
  await app.locator('[title="Installed version: v1.2.0"]').first().waitFor()
  await app
    .getByRole('button', { name: 'Back to plugins', exact: true })
    .click()

  await selectPanel(app, 'Skills')
  await app
    .getByRole('button', { name: /skill invocations/ })
    .first()
    .click()
  await app.getByLabel('Search invocations').fill('code-review')
  await app
    .getByRole('button', { name: 'Open code-review detail', exact: true })
    .first()
    .click()
  await app.getByRole('button', { name: 'Back to skills', exact: true }).click()
  await app.getByRole('dialog').waitFor()
  assert.equal(
    await app.getByLabel('Search invocations').inputValue(),
    'code-review'
  )
  await app.getByRole('button', { name: 'Close', exact: true }).click()
  for (const panel of ['Activity', 'Cost', 'Models', 'Skills']) {
    await selectPanel(app, panel)
    for (const window of ['24 hours', '7 days', '30 days']) {
      await app.getByRole('radio', { name: window, exact: true }).click()
      assert.equal(
        await app
          .getByRole('radio', { name: window, exact: true })
          .getAttribute('aria-checked'),
        'true'
      )
    }
  }

  const cases = [
    ['skills-error', async () => {}, 'Could not load skills.'],
    [
      'plugins-error',
      (frame) =>
        frame.getByRole('button', { name: 'Plugins', exact: true }).click(),
      'Could not load plugins.'
    ],
    [
      'skill-error',
      (frame) => selectSkill(frame, 'code-review'),
      'Could not load this skill.'
    ],
    [
      'files-error',
      async (frame) => {
        await openSkill(frame)
        await frame
          .getByRole('button', { name: 'View files', exact: true })
          .click()
      },
      'Could not load these files.'
    ],
    [
      'history-error',
      async (frame) => {
        await openSkill(frame)
        await frame
          .getByRole('button', { name: /invocations?$/ })
          .first()
          .click()
      },
      'Could not load activity. Close and reopen this dialog to retry.'
    ],
    [
      'plugin-error',
      async (frame) => {
        await frame
          .getByRole('button', { name: 'Plugins', exact: true })
          .click()
        await frame.locator('tbody tr').filter({ hasText: 'commit' }).click()
      },
      'Could not load this plugin.'
    ],
    [
      'usage-error',
      (frame) => selectPanel(frame, 'Activity'),
      'Could not load usage data.'
    ],
    ['cost-empty', (frame) => selectPanel(frame, 'Cost'), /No cost data yet/],
    [
      'resident-empty',
      (frame) => selectPanel(frame, 'Resident tax'),
      'No cold-session sample yet'
    ],
    [
      'usage-empty',
      (frame) => selectPanel(frame, 'Models'),
      'No model activity yet'
    ],
    [
      'action-error',
      async (frame) => {
        await frame
          .getByRole('button', { name: 'Plugins', exact: true })
          .click()
        await frame.locator('tbody tr').filter({ hasText: 'commit' }).click()
        await frame
          .getByRole('button', { name: 'Disable', exact: true })
          .click()
      },
      /The sample plugin action failed/
    ],
    [
      'scan-partial',
      async (frame) => {
        await frame
          .getByRole('button', { name: 'Scan details', exact: true })
          .click()
      },
      'Scan needs attention'
    ],
    [
      'scan-failed',
      async () => {},
      'Scan failed. Showing the last available data.'
    ],
    ['projects-empty', async () => {}, 'No project folders'],
    [
      'projects-unavailable',
      async (frame) => {
        await openDevRepository(frame, 'web-app')
      },
      'This folder could not be fully refreshed. Showing the last available data.'
    ],
    [
      'projects-missing',
      async (frame) => {
        await openDevRepository(frame, 'web-app')
      },
      'This project folder is missing. Showing its last available data. Check its location if it moved.'
    ],
    [
      'projects-needs-access',
      async (frame) => {
        await openDevRepository(frame, 'web-app')
      },
      'Folder access is required. Grant this project or a parent folder in Settings.'
    ]
  ]
  for (const [scenario, activate, message] of cases) {
    const url = new URL(baseUrl)
    url.searchParams.set('scenario', scenario)
    await page.goto(url.href)
    await page.locator('[data-preview-host][data-ready="true"]').waitFor()
    const frame = previewFrame(page)
    await activate(frame)
    await frame
      .getByText(message, { exact: typeof message === 'string' })
      .first()
      .waitFor()
  }

  const missingUrl = new URL(baseUrl)
  missingUrl.searchParams.set('scenario', 'projects-missing')
  await page.goto(missingUrl.href)
  const missingApp = await preparePreview(page)
  await missingApp.getByRole('button', { name: 'Plugins', exact: true }).click()
  await missingApp
    .locator('tbody tr')
    .filter({ hasText: 'frontend' })
    .filter({ hasText: 'team-tools' })
    .filter({ hasText: 'Dev/web-app' })
    .click()
  await missingApp
    .getByText(
      /This install is registered to C:\\Dev\\web-app, and that folder is missing/
    )
    .waitFor()
  for (const action of ['Disable', 'Update', 'Uninstall'])
    assert.equal(
      await missingApp
        .getByRole('button', { name: action, exact: true })
        .isDisabled(),
      true
    )

  await page.goto(baseUrl)
  const freshApp = await preparePreview(page)
  await freshApp.getByRole('button', { name: 'Settings', exact: true }).click()
  await freshApp.getByRole('button', { name: 'Manage…', exact: true }).click()
  await freshApp
    .getByRole('button', { name: 'Add Folder...', exact: true })
    .click()
  await freshApp
    .getByRole('button', {
      name: 'Revoke access to Clients/docs-site',
      exact: true
    })
    .waitFor()
  await freshApp
    .getByRole('button', { name: 'Add Folder...', exact: true })
    .click()
  const revokeParent = freshApp.getByRole('button', {
    name: 'Revoke access to Clients',
    exact: true
  })
  await revokeParent.click()
  await revokeParent.waitFor({ state: 'hidden' })
  await freshApp.getByRole('button', { name: 'Done', exact: true }).click()
  await freshApp
    .getByRole('button', { name: 'All Skills', exact: true })
    .click()
  assert.equal(
    await freshApp.locator('tbody tr').count(),
    20,
    'Removing an overlapping parent grant must preserve independently granted inventory.'
  )
  await freshApp
    .getByRole('button', { name: 'Expand Dev repositories', exact: true })
    .click()
  await freshApp
    .getByRole('button', { name: 'Expand monorepo repositories', exact: true })
    .click()
  await freshApp.getByRole('button', { name: /^tools\/cli/ }).click()
  await freshApp
    .getByText('No skills found in Dev/monorepo/tools/cli', {
      exact: true
    })
    .waitFor()
}
