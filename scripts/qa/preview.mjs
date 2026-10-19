import assert from 'node:assert/strict'

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
  assert.equal(
    await app
      .locator('tbody tr')
      .nth(1)
      .evaluate((row) => row === document.activeElement),
    true
  )
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

  await selectPanel(app, 'Activity')
  const activeDay = app.locator('button[aria-haspopup="dialog"]').last()
  await activeDay.click()
  await app
    .getByRole('dialog')
    .getByText(/Activity details/)
    .waitFor()
  await page.keyboard.press('Escape')
  assert.equal(
    await activeDay.evaluate((button) => button === document.activeElement),
    true
  )
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
  assert.equal(
    await pricedHour.evaluate((button) => button === document.activeElement),
    true
  )
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
  await selectPanel(app, 'Resident tax')
  await app
    .getByText('Measured turn-one resident tokens', { exact: true })
    .waitFor()

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
  assert.equal(
    await page
      .getByRole('button', { name: 'Expand preview', exact: true })
      .evaluate((button) => button === document.activeElement),
    true
  )
}
