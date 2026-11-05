import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { launchBrowser } from '../../.claude/skills/visual-verify/browser-launch.mjs'
import { preparePreview, selectPanel } from './preview.mjs'

async function activate(control) {
  await control.focus()
  await control.press('Enter')
}

async function sampleChange(page, action) {
  await page
    .getByLabel('Sample file change', { exact: true })
    .selectOption(action)
  await page
    .getByRole('button', { name: 'Simulate change', exact: true })
    .click()
  await page.waitForFunction(
    () => !document.querySelector('[data-preview-change]').disabled
  )
}

async function folderRow(app) {
  const expand = app.getByRole('button', {
    name: 'Expand project list',
    exact: true
  })
  if (await expand.isVisible()) await expand.click()
  return app
    .getByRole('button', { name: /^(?:Clients\/)?docs-site(?:\s|Unavailable)/ })
    .first()
}

export async function verifyUsageProjects(page, baseUrl, directory) {
  await mkdir(directory, { recursive: true })
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const section of ['Skills', 'Plugins']) {
      await page.goto(baseUrl)
      const app = await preparePreview(page)
      await page.locator('#product').scrollIntoViewIfNeeded()
      if (section === 'Plugins')
        await activate(app.getByRole('button', { name: section, exact: true }))
      await sampleChange(page, 'pending-project')
      const row = await folderRow(app)
      await activate(row)
      assert.equal(
        await row.getByLabel('Unavailable', { exact: true }).count(),
        0
      )
      assert.equal(
        await app.getByText(/This folder could not be refreshed/).count(),
        0
      )
      assert.equal(
        await app
          .locator('body')
          .evaluate(async () =>
            Boolean((await window.api.listSkills()).scanActivity)
          ),
        true
      )
      if (section === 'Plugins')
        assert.equal(await app.locator('tbody tr').count(), 1)
      await page.locator('[data-preview-host]').screenshot({
        path: join(directory, `pending-${section}-${width}.png`)
      })
      await sampleChange(page, 'retry-project')
      await app.getByText(/This folder could not be refreshed/).waitFor()
      assert.equal(
        await row.getByLabel('Unavailable', { exact: true }).count(),
        1
      )
      await page
        .locator('[data-preview-host]')
        .screenshot({ path: join(directory, `retry-${section}-${width}.png`) })
      await sampleChange(page, 'recover-project')
      await app
        .getByText(/This folder could not be refreshed/)
        .waitFor({ state: 'hidden' })
      assert.equal(
        await (
          await folderRow(app)
        )
          .getByLabel('Unavailable', { exact: true })
          .count(),
        0
      )
      await page.locator('[data-preview-host]').screenshot({
        path: join(directory, `recovered-${section}-${width}.png`)
      })
    }

    await page.goto(baseUrl)
    const app = await preparePreview(page)
    await selectPanel(app, 'Tokens')
    const before = await app
      .locator('body')
      .evaluate(() => window.api.getUsageOverview())
    const pair = await app.locator('body').evaluate(async () => {
      const catalog = await window.api.getUsageProjects()
      return {
        source: catalog.projects.find(
          (project) => project.path === 'C:\\Archive\\web-app'
        ),
        target: catalog.projects.find(
          (project) => project.path === 'C:\\Dev\\web-app'
        )
      }
    })
    await activate(
      app.getByRole('button', { name: 'Manage projects', exact: true })
    )
    const manager = app.getByRole('dialog', {
      name: 'Manage projects',
      exact: true
    })
    await manager.getByRole('searchbox').fill('web-app')
    assert.equal(await manager.getByRole('article').count(), 2)
    await manager
      .getByText(/Similar project names found/)
      .first()
      .waitFor()
    const source = manager.getByRole('article', {
      name: pair.source.label,
      exact: true
    })
    await source.getByRole('combobox').selectOption(pair.target.id)
    await activate(
      source.getByRole('button', { name: 'Link locations', exact: true })
    )
    await manager
      .getByRole('button', { name: 'Unlink C:\\Archive\\web-app', exact: true })
      .waitFor()
    await manager.getByRole('searchbox').fill('C:/Archive/web-app')
    assert.equal(await manager.getByRole('article').count(), 1)
    await page
      .locator('[data-preview-host]')
      .screenshot({ path: join(directory, `linked-project-${width}.png`) })
    await manager.getByRole('searchbox').press('Escape')
    await manager.waitFor({ state: 'hidden' })
    const search = app.getByRole('searchbox', {
      name: 'Search projects',
      exact: true
    })
    await search.fill('c:/archive/web-app')
    await app.getByText('web-app', { exact: true }).waitFor()
    await app.getByText(/^1 of \d+ projects match$/).waitFor()
    const after = await app
      .locator('body')
      .evaluate(() => window.api.getUsageOverview())
    assert.deepEqual(after.tokens.last30d.tokens, before.tokens.last30d.tokens)
    await page
      .locator('[data-preview-host]')
      .screenshot({ path: join(directory, `linked-search-${width}.png`) })
    await search.fill('no-such-project-location')
    await app.getByText('No matching projects.', { exact: true }).waitFor()
    await search.fill('')
    await app.getByText(/^8 of \d+ projects$/).waitFor()
    await selectPanel(app, 'History')
    const timeline = app.getByRole('region', {
      name: 'Project timeline',
      exact: true
    })
    await timeline
      .getByRole('searchbox', { name: 'Search project timeline', exact: true })
      .fill('C:/Archive/web-app')
    assert.equal(await timeline.locator('tbody tr').count(), 1)
    await page
      .locator('[data-preview-host]')
      .screenshot({ path: join(directory, `linked-timeline-${width}.png`) })
    await activate(
      app.getByRole('button', { name: 'Manage projects', exact: true })
    )
    await manager.getByRole('searchbox').fill('C:/Archive/web-app')
    await activate(
      manager.getByRole('button', {
        name: 'Unlink C:\\Archive\\web-app',
        exact: true
      })
    )
    await manager
      .getByRole('article', { name: pair.source.label, exact: true })
      .waitFor()
    await manager.getByRole('searchbox').press('Escape')
    await manager.waitFor({ state: 'hidden' })
    assert.deepEqual(
      (await app.locator('body').evaluate(() => window.api.getUsageOverview()))
        .tokens.last30d.byProject,
      before.tokens.last30d.byProject
    )
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      true
    )
  }

  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    for (const [scenario, message] of [
      ['activity-partial', 'Partial prompt history for this period.'],
      ['activity-unavailable', 'Prompt history unavailable for this period'],
      ['usage-projects-error', 'Could not load projects.'],
      ['usage-projects-loading', 'Loading projects…'],
      [
        'usage-project-link-error',
        'Could not update project locations. Try again.'
      ]
    ]) {
      const url = new URL(baseUrl)
      url.searchParams.set('scenario', scenario)
      await page.goto(url.href)
      const app = await preparePreview(page)
      await selectPanel(app, 'Activity')
      if (scenario.startsWith('usage-project'))
        await activate(
          app.getByRole('button', { name: 'Manage projects', exact: true })
        )
      if (scenario === 'usage-project-link-error') {
        const manager = app.getByRole('dialog', {
          name: 'Manage projects',
          exact: true
        })
        await manager.getByRole('searchbox').fill('web-app')
        const source = manager.getByRole('article', {
          name: 'Archive/web-app',
          exact: true
        })
        const targetId = await app
          .locator('body')
          .evaluate(
            async () =>
              (await window.api.getUsageProjects()).projects.find(
                (project) => project.path === 'C:\\Dev\\web-app'
              ).id
          )
        await source.getByRole('combobox').selectOption(targetId)
        await app.locator('body').evaluate(() => {
          const linkProjects = window.api.linkUsageProjects
          window.api.linkUsageProjects = (input) =>
            new Promise((resolve, reject) => {
              document.addEventListener(
                'resume-sample-link',
                () => {
                  linkProjects(input).then(resolve, reject)
                },
                { once: true }
              )
            })
        })
        await activate(
          source.getByRole('button', { name: 'Link locations', exact: true })
        )
        await source.locator('select:disabled').waitFor()
        assert.equal(await source.getByRole('combobox').isDisabled(), true)
        await app
          .locator('body')
          .evaluate(() =>
            document.dispatchEvent(new Event('resume-sample-link'))
          )
      }
      await app.getByText(message, { exact: false }).first().waitFor()
      await page
        .locator('[data-preview-host]')
        .screenshot({ path: join(directory, `${scenario}-${width}.png`) })
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        ),
        true
      )
    }
  }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const browser = await launchBrowser()
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' })
    page.setDefaultTimeout(15000)
    await verifyUsageProjects(
      page,
      process.env.MEGATRON_TEST_URL || 'http://127.0.0.1:4175/',
      resolve('.qa/usage-projects')
    )
    console.log(
      'Usage identity, linking/search, coverage and folder discovery passed.'
    )
  } finally {
    await browser.close()
  }
}
