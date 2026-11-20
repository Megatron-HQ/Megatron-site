import assert from 'node:assert/strict'
import { previewFrame } from './preview.mjs'
import { waitForFocus } from './interactions.mjs'

export async function verifyFeatureLinks(page) {
  const app = previewFrame(page)
  const links = page.locator('[data-preview-link]')
  assert.equal(
    await links.count(),
    6,
    'Each feature source and scope must be a link.'
  )
  assert.equal(
    await page.locator('.scope-pill[data-preview-link="plugins"]').count(),
    2
  )
  assert.doesNotMatch(
    await page.locator('.plugin-copy').first().innerText(),
    /local installs/i
  )

  for (const [section, target, heading] of [
    ['skills', 'global', 'Global Skills'],
    ['skills', 'project', 'Project Skills'],
    ['skills', 'plugin', 'Plugin Skills'],
    ['plugins', 'user', 'User Plugins'],
    ['plugins', 'project', 'Project Plugins'],
    ['mcp', 'all', 'All MCP servers']
  ]) {
    const link = page.locator(
      `[data-preview-link="${section}"][data-preview-target="${target}"]`
    )
    await link.click()
    await app.locator(`h2[title="${heading}"]`).waitFor()
    await page.waitForFunction(() => {
      const bounds = document
        .querySelector('#product-demo')
        .getBoundingClientRect()
      return bounds.top >= 80 && bounds.top <= 120
    })
    assert.equal(
      await page
        .locator(`[data-preview-section="${section}"]`)
        .getAttribute('aria-selected'),
      'true'
    )
    assert.equal(
      await page.locator('[data-preview-host]').getAttribute('data-expanded'),
      'false'
    )
  }

  // A link must leave an existing detail view and restore the requested inventory.
  await page
    .locator('[data-preview-link="skills"][data-preview-target="global"]')
    .click()
  await app.locator('h2[title="Global Skills"]').waitFor()
  await app.locator('tbody tr').first().click()
  await app.getByRole('button', { name: 'View files', exact: true }).waitFor()
  const project = page.locator(
    '[data-preview-link="skills"][data-preview-target="project"]'
  )
  await project.focus()
  await page.keyboard.press('Enter')
  await app.locator('h2[title="Project Skills"]').waitFor()
  await waitForFocus(page.locator('#preview-skills'))

  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth
  }))
  assert.ok(
    dimensions.content <= dimensions.width,
    'Feature links must not overflow the page.'
  )
  await page.getByRole('button', { name: 'Reset sample', exact: true }).click()
  await app.locator('h2[title="All Skills"]').waitFor()
}
