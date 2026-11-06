import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { launchBrowser } from '../../.claude/skills/visual-verify/browser-launch.mjs'
import {
  openSkill,
  preparePreview,
  selectPanel,
  simulateInventoryChange
} from './preview.mjs'

async function selectWebProject(app) {
  const expand = app.getByRole('button', {
    name: 'Expand project list',
    exact: true
  })
  if (await expand.isVisible()) await expand.click()
  const parent = app.getByRole('button', {
    name: 'Expand Dev repositories',
    exact: true
  })
  if (await parent.isVisible()) await parent.click()
  await app
    .getByRole('button', { name: /^web-app(?:\s|Unavailable|Missing)/ })
    .click()
}

export async function verifyInventoryChanges(page, baseUrl, directory) {
  await mkdir(directory, { recursive: true })
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(baseUrl)
    const app = await preparePreview(page)
    await page.locator('#product').scrollIntoViewIfNeeded()
    assert.equal(await app.locator('tbody tr').count(), 20)
    await simulateInventoryChange(page, 'add-skill')
    await app
      .locator('tbody tr')
      .filter({ hasText: 'release-readiness' })
      .waitFor()
    assert.equal(await app.locator('tbody tr').count(), 21)
    await openSkill(app, 'deploy')
    await simulateInventoryChange(page, 'edit-skill')
    await app
      .getByText(
        'Deploy the web application and verify its rollback procedure.',
        { exact: true }
      )
      .first()
      .waitFor()
    await simulateInventoryChange(page, 'delete-skill')
    await app.locator('tbody tr').first().waitFor()
    assert.equal(
      await app
        .getByRole('button', { name: 'View files', exact: true })
        .count(),
      0
    )
    await selectWebProject(app)
    await simulateInventoryChange(page, 'unavailable-project')
    await app.getByText(/Megatron will retry automatically/).waitFor()
    await page
      .locator('[data-preview-host]')
      .screenshot({ path: join(directory, `unavailable-${width}.png`) })
    await app.getByRole('button', { name: /^Dev\s/ }).click()
    assert.equal(
      await app.getByText(/This folder could not be refreshed/).count(),
      0
    )

    await page
      .getByRole('button', { name: 'Reset sample', exact: true })
      .click()
    await app.locator('tbody tr').first().waitFor()
    await page.waitForFunction(async () => {
      const api = document.querySelector('[data-preview-frame]').contentWindow
        .api
      return (await api.listSkills()).skills.length === 20
    })
    await selectWebProject(app)
    await simulateInventoryChange(page, 'move-project')
    await app.getByText('Project / Dev Skills', { exact: false }).waitFor()
    await app.getByRole('button', { name: /^web-app-renamed\s/ }).waitFor()
    await page
      .locator('[data-preview-host]')
      .screenshot({ path: join(directory, `moved-${width}.png`) })

    await page
      .getByRole('button', { name: 'Reset sample', exact: true })
      .click()
    await app.getByRole('button', { name: 'Plugins', exact: true }).click()
    await selectWebProject(app)
    await app.locator('tbody tr').first().click()
    await app
      .getByRole('button', { name: 'Back to plugins', exact: true })
      .waitFor()
    await simulateInventoryChange(page, 'delete-project')
    await app.getByText('Projects / Dev Plugins', { exact: false }).waitFor()
    assert.equal(
      await app
        .getByRole('button', { name: 'Back to plugins', exact: true })
        .count(),
      0
    )
    await page
      .locator('[data-preview-host]')
      .screenshot({ path: join(directory, `removed-plugin-${width}.png`) })

    await page
      .getByRole('button', { name: 'Reset sample', exact: true })
      .click()
    await app.locator('body').evaluate(() => {
      const original = window.api.getUsageOverview
      window.sampleUsageReads = 0
      window.api.getUsageOverview = (...args) => {
        window.sampleUsageReads++
        return original(...args)
      }
    })
    await selectPanel(app, 'Tokens')
    await app.getByRole('radio', { name: '24 hours', exact: true }).click()
    const overview = await app
      .locator('body')
      .evaluate(() => window.api.getUsageOverview())
    const usageReads = await app
      .locator('body')
      .evaluate(() => window.sampleUsageReads)
    await simulateInventoryChange(page, 'delete-project')
    assert.equal(
      await app.locator('body').evaluate(() => window.sampleUsageReads),
      usageReads,
      'Inventory refresh must not refetch an open Usage query.'
    )
    assert.equal(
      await app
        .getByRole('radio', { name: '24 hours', exact: true })
        .getAttribute('aria-checked'),
      'true'
    )
    const after = await app
      .locator('body')
      .evaluate(() => window.api.getUsageOverview())
    assert.deepEqual(after.tokens, overview.tokens)
    await page
      .locator('[data-preview-host]')
      .screenshot({ path: join(directory, `usage-retained-${width}.png`) })

    await page
      .getByRole('button', { name: 'Reset sample', exact: true })
      .click()
    await app.getByRole('button', { name: 'Settings', exact: true }).click()
    const rescan = app.getByRole('button', { name: 'Rescan now', exact: true })
    await rescan.focus()
    await rescan.press('Enter')
    await app.getByText('Scan complete.', { exact: true }).waitFor()
    await simulateInventoryChange(page, 'unavailable-project')
    await app.getByText('Scan complete.', { exact: true }).waitFor()
    await app.getByText('Scan needs attention', { exact: true }).waitFor()
    await page
      .locator('[data-preview-host]')
      .screenshot({ path: join(directory, `rescan-retained-${width}.png`) })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true
    )
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' })
    page.setDefaultTimeout(5000)
    await verifyInventoryChanges(
      page,
      process.env.MEGATRON_TEST_URL || 'http://127.0.0.1:4175/',
      resolve('.qa/inventory')
    )
    console.log(
      'Inventory examples and recovery passed at all four responsive widths.'
    )
  } finally {
    await browser.close()
  }
}
