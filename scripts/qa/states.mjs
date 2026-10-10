import assert from 'node:assert/strict'
import {
  preparePreview,
  previewFrame,
  openSkill,
  selectPanel
} from './preview.mjs'

async function selectSkill(app, name) {
  await app.getByRole('button', { name: /^Search/ }).click()
  const search = app.getByPlaceholder('Search skills, plugins, projects...')
  await search.fill(name)
  await search.press('Enter')
}

export async function verifyPreviewStates(page, baseUrl) {
  const app = await preparePreview(page)
  await app
    .getByRole('button', { name: 'Expand project list', exact: true })
    .click()
  assert.equal(
    await app.locator('tbody tr').count(),
    20,
    'Chevron expansion must preserve the current filter.'
  )
  await app.getByRole('button', { name: 'Project', exact: true }).click()
  assert.equal(await app.locator('tbody tr').count(), 6)
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
  await app.locator('tbody tr').filter({ hasText: 'docs' }).click()
  assert.equal(
    await app
      .getByRole('button', { name: 'Disable', exact: true })
      .first()
      .isDisabled(),
    true
  )
  await app
    .getByRole('button', { name: 'C:/Projects/docs-site', exact: true })
    .click()
  await app
    .getByRole('button', { name: 'Add Repository...', exact: true })
    .click()
  await app
    .getByRole('button', { name: 'Revoke access to docs-site', exact: true })
    .waitFor()
  await app.getByRole('button', { name: 'Done', exact: true }).click()
  await app
    .getByRole('button', { name: 'Disable', exact: true })
    .first()
    .click()
  await app.getByRole('button', { name: 'Enable', exact: true }).waitFor()
  assert.equal(
    await app
      .getByRole('button', { name: 'Disable', exact: true })
      .last()
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
    .filter({ hasText: 'team-tools' })
    .click()
  await app.getByRole('button', { name: 'Update', exact: true }).first().click()
  await app
    .getByRole('button', { name: 'Update', exact: true })
    .first()
    .waitFor({ state: 'visible' })
  await app.locator('[title="Installed version: v1.5.0"]').first().waitFor()
  assert.equal(
    await app.locator('[title="Installed version: v1.2.0"]').count(),
    1,
    'Updating user scope must preserve the project install version.'
  )

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
}
