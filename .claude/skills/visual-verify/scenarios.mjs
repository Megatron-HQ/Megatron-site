import {
  openSkill,
  preparePreview,
  selectPanel
} from '../../../scripts/qa/preview.mjs'

async function product(page, action = async () => {}) {
  const app = await preparePreview(page)
  await action(app)
  await page.locator('#product').scrollIntoViewIfNeeded()
  await app.locator('body').evaluate(() => document.fonts.ready)
}
function sample(name, screen, action) {
  return { name, screen, run: (page) => product(page, action) }
}
async function plugin(app, name, marketplace) {
  await app.getByRole('button', { name: 'Plugins', exact: true }).click()
  await app
    .locator('tbody tr')
    .filter({ hasText: name })
    .filter({ hasText: marketplace })
    .first()
    .click()
  await app
    .getByRole('button', { name: 'Back to plugins', exact: true })
    .waitFor()
}
export const scenarios = [
  {
    name: 'hero-section',
    screen: 'hero',
    async run(page) {
      await preparePreview(page)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.locator('#hero-title').waitFor()
    }
  },
  sample('product-demo-skills', 'demo-skills', async (app) => {
    await app.locator('tbody tr').first().waitFor()
  }),
  sample('product-demo-skills-search', 'demo-skills', async (app) => {
    await app
      .getByRole('button', { name: 'Search skills', exact: false })
      .click()
    await app
      .getByPlaceholder('Search skills, plugins, projects...')
      .fill('design')
    await app.getByRole('option').first().waitFor()
  }),
  sample('product-demo-skills-filter-global', 'demo-skills', async (app) => {
    await app.getByRole('button', { name: 'Global', exact: true }).click()
  }),
  sample('product-demo-skills-project-empty', 'demo-skills', async (app) => {
    const expand = app.getByRole('button', {
      name: 'Expand project list',
      exact: true
    })
    if (await expand.isVisible()) await expand.click()
    await app
      .getByRole('button', { name: 'Expand Dev repositories', exact: true })
      .click()
    await app.getByRole('button', { name: /^empty-lab/ }).click()
    await app
      .getByText('No skills found in Dev/empty-lab', { exact: true })
      .waitFor()
  }),
  sample('product-demo-skill-detail', 'demo-skills', (app) =>
    openSkill(app, 'design-system')
  ),
  sample('product-demo-skill-manual', 'demo-skills', (app) =>
    openSkill(app, 'manual-plan')
  ),
  sample('product-demo-skill-files', 'demo-skills', async (app) => {
    await openSkill(app)
    await app.getByRole('button', { name: 'View files', exact: true }).click()
    await app.getByRole('tree', { name: 'Skill files' }).waitFor()
  }),
  sample('product-demo-skill-file-status', 'demo-skills', async (app) => {
    await openSkill(app)
    await app.getByRole('button', { name: 'View files', exact: true }).click()
    await app.getByLabel('Filter skill files').fill('large-report')
    await app
      .getByRole('treeitem')
      .filter({ hasText: 'large-report.json' })
      .click()
    await app.getByText('File too large to preview.', { exact: true }).waitFor()
  }),
  sample('product-demo-skill-history', 'demo-skills', async (app) => {
    await openSkill(app)
    await app
      .getByRole('button', { name: /invocations?$/ })
      .first()
      .click()
    await app.getByRole('dialog').getByLabel('Search activity').waitFor()
  }),
  sample('product-demo-budget', 'demo-skills', async (app) => {
    await app.getByRole('button', { name: /EST\. tokens/ }).click()
    await app
      .getByRole('dialog')
      .getByText('What this number means?', { exact: true })
      .waitFor()
  }),
  sample('product-demo-settings-dark', 'demo-skills', async (app) => {
    await app.getByRole('button', { name: 'Settings', exact: true }).click()
    await app.getByRole('radio', { name: 'Dark', exact: true }).focus()
    await app.getByRole('radio', { name: 'Dark', exact: true }).press('Enter')
  }),
  sample('product-demo-project-folders', 'demo-skills', async (app) => {
    await app.getByRole('button', { name: 'Settings', exact: true }).click()
    await app.getByRole('button', { name: 'Manage…', exact: true }).focus()
    await app
      .getByRole('button', { name: 'Manage…', exact: true })
      .press('Enter')
    await app
      .getByRole('dialog')
      .getByText('Project Folders', { exact: true })
      .waitFor()
  }),
  sample('product-demo-plugins', 'demo-plugins', async (app) => {
    await app.getByRole('button', { name: 'Plugins', exact: true }).click()
    await app.locator('tbody tr').first().waitFor()
  }),
  sample('product-demo-plugin-mixed', 'demo-plugins', (app) =>
    plugin(app, 'frontend', 'team-tools')
  ),
  sample('product-demo-plugin-unknown', 'demo-plugins', (app) =>
    plugin(app, 'docs', 'community')
  ),
  sample('product-demo-plugin-uninstall', 'demo-plugins', async (app) => {
    await plugin(app, 'commit', 'team-tools')
    await app.getByRole('button', { name: 'Uninstall', exact: true }).click()
    await app.getByRole('dialog').waitFor()
  }),
  ...['Activity', 'Cost', 'Models', 'Skills', 'Resident tax'].map((panel) =>
    sample(
      'product-demo-usage-' +
        (panel === 'Resident tax' ? 'resident' : panel.toLowerCase()),
      'demo-usage',
      (app) => selectPanel(app, panel)
    )
  ),
  sample('product-demo-usage-cost-details', 'demo-usage', async (app) => {
    await selectPanel(app, 'Cost')
    await app.getByRole('radio', { name: '24 hours', exact: true }).click()
    await app.locator('button[aria-haspopup="dialog"]').first().click()
    await app
      .getByRole('dialog')
      .getByText(/Cost details/)
      .waitFor()
  }),
  sample('product-demo-usage-invocations', 'demo-usage', async (app) => {
    await selectPanel(app, 'Skills')
    await app
      .getByRole('button', { name: /skill invocations/ })
      .first()
      .click()
    await app.getByRole('dialog').getByLabel('Search invocations').waitFor()
  }),
  sample('product-demo-usage-effort', 'demo-usage', async (app) => {
    await selectPanel(app, 'Models')
    await app.locator('tbody button[aria-pressed]').first().click()
  }),
  {
    name: 'product-demo-expanded',
    screen: 'demo-skills',
    async run(page) {
      await product(page)
      await page
        .getByRole('button', { name: 'Expand preview', exact: true })
        .click()
      await page.locator('[data-preview-host][data-expanded="true"]').waitFor()
    }
  },
  ...[
    ['features-section', 'features', '.features-section'],
    ['analytics-section', 'analytics', '#analytics'],
    ['why-local-section', 'local', '#local'],
    ['installation-section', 'install', '#get-started']
  ].map(([name, screen, selector]) => ({
    name,
    screen,
    async run(page) {
      await preparePreview(page)
      await page.locator(selector).scrollIntoViewIfNeeded()
    }
  })),
  {
    name: 'faq-section',
    screen: 'faq',
    async run(page) {
      await preparePreview(page)
      await page.locator('.faq-section').scrollIntoViewIfNeeded()
      await page.locator('.faq-list summary').first().click()
    }
  },
  {
    name: 'mobile-navigation',
    screen: 'navigation',
    async shouldSkip(page, size) {
      return size.width < 768 ? null : 'Desktop navigation is already visible.'
    },
    async run(page) {
      await preparePreview(page)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.locator('[data-menu-toggle]').click()
      await page.locator('#mobile-navigation').waitFor()
    }
  }
]
