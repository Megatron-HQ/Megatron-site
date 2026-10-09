// Scenarios captured by visual-verify across responsive viewports.
// Each scenario describes how to navigate to or activate a specific
// UI state on the Megatron website from the default baseline page.
//
// Screens map to the --only filter table in SKILL.md:
// hero, demo-skills, demo-plugins, demo-usage, features, analytics,
// local, faq, install, navigation.

/**
 * Helper to select an option from a source select dropdown on mobile
 * or click a button filter on desktop/tablet.
 */
async function selectSourceFilter(page, value) {
  const isMobileSelect = await page
    .locator('[data-source-select]')
    .isVisible()
    .catch(() => false)
  if (isMobileSelect) {
    await page.locator('[data-source-select]').selectOption(value)
  } else {
    await page.locator(`[data-action="source"][data-value="${value}"]`).click()
  }
}

/**
 * Helper to select a usage panel on mobile (select dropdown)
 * or desktop/tablet (action buttons).
 */
async function selectUsagePanel(page, panel) {
  const isMobileSelect = await page
    .locator('[data-usage-select]')
    .isVisible()
    .catch(() => false)
  if (isMobileSelect) {
    await page.locator('[data-usage-select]').selectOption(panel)
  } else {
    await page.locator(`[data-action="panel"][data-value="${panel}"]`).click()
  }
}

export const scenarios = [
  {
    name: 'hero-section',
    screen: 'hero',
    async run(page) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.locator('#hero-title').waitFor({ state: 'visible' })
    }
  },
  {
    name: 'product-demo-skills',
    screen: 'demo-skills',
    async run(page) {
      await page.locator('#preview-skills').click()
      await page
        .locator('.skill-table-row')
        .first()
        .waitFor({ state: 'visible' })
      await page.locator('#product').scrollIntoViewIfNeeded()
    }
  },
  {
    name: 'product-demo-skills-search',
    screen: 'demo-skills',
    async run(page) {
      await page.locator('#preview-skills').click()
      const search = page.getByRole('searchbox', {
        name: 'Search sample skills'
      })
      await search.fill('design-system')
      await page.locator('.skill-name').first().waitFor({ state: 'visible' })
      await page.locator('#product').scrollIntoViewIfNeeded()
    }
  },
  {
    name: 'product-demo-skills-filter-global',
    screen: 'demo-skills',
    async run(page) {
      await page.locator('#preview-skills').click()
      await selectSourceFilter(page, 'global')
      await page
        .locator('.skill-table-row')
        .first()
        .waitFor({ state: 'visible' })
      await page.locator('#product').scrollIntoViewIfNeeded()
    }
  },
  {
    name: 'product-demo-skill-detail',
    screen: 'demo-skills',
    async run(page) {
      await page.locator('#preview-skills').click()
      const search = page.getByRole('searchbox', {
        name: 'Search sample skills'
      })
      await search.fill('design-system')
      await page.getByRole('button', { name: 'Inspect design-system' }).click()
      await page.locator('[data-action="back"]').waitFor({ state: 'visible' })
      await page.locator('#product').scrollIntoViewIfNeeded()
    }
  },
  {
    name: 'product-demo-plugins',
    screen: 'demo-plugins',
    async run(page) {
      await page.locator('#preview-plugins').click()
      await page
        .locator('.plugin-demo-row')
        .first()
        .waitFor({ state: 'visible' })
      await page.locator('#product').scrollIntoViewIfNeeded()
    }
  },
  {
    name: 'product-demo-usage-activity',
    screen: 'demo-usage',
    async run(page) {
      await page.locator('#preview-usage').click()
      await page.getByRole('tab', { name: '24 hours' }).click()
      await page
        .locator('.chart-bar-button')
        .first()
        .waitFor({ state: 'visible' })
      await page.locator('#product').scrollIntoViewIfNeeded()
    }
  },
  {
    name: 'product-demo-usage-cost',
    screen: 'demo-usage',
    async run(page) {
      await page.locator('#preview-usage').click()
      await selectUsagePanel(page, 'cost')
      await page.locator('.demo-cost-summary').waitFor({ state: 'visible' })
      await page.locator('#product').scrollIntoViewIfNeeded()
    }
  },
  {
    name: 'product-demo-usage-models',
    screen: 'demo-usage',
    async run(page) {
      await page.locator('#preview-usage').click()
      await selectUsagePanel(page, 'models')
      await page.locator('.model-ranking').first().waitFor({ state: 'visible' })
      await page.locator('#product').scrollIntoViewIfNeeded()
    }
  },
  {
    name: 'product-demo-usage-skills',
    screen: 'demo-usage',
    async run(page) {
      await page.locator('#preview-usage').click()
      await selectUsagePanel(page, 'skills')
      await page.locator('.top-skill-row').first().waitFor({ state: 'visible' })
      await page.locator('#product').scrollIntoViewIfNeeded()
    }
  },
  {
    name: 'product-demo-usage-resident',
    screen: 'demo-usage',
    async run(page) {
      await page.locator('#preview-usage').click()
      await selectUsagePanel(page, 'resident')
      await page.locator('.resident-rows').first().waitFor({ state: 'visible' })
      await page.locator('#product').scrollIntoViewIfNeeded()
    }
  },
  {
    name: 'features-section',
    screen: 'features',
    async run(page) {
      await page.locator('.features-section').scrollIntoViewIfNeeded()
      await page.locator('.inventory-feature').waitFor({ state: 'visible' })
    }
  },
  {
    name: 'analytics-section',
    screen: 'analytics',
    async run(page) {
      await page.locator('#analytics').scrollIntoViewIfNeeded()
      await page.locator('#analytics-heading').waitFor({ state: 'visible' })
    }
  },
  {
    name: 'why-local-section',
    screen: 'local',
    async run(page) {
      await page.locator('#local').scrollIntoViewIfNeeded()
      await page.locator('#local-heading').waitFor({ state: 'visible' })
    }
  },
  {
    name: 'faq-section',
    screen: 'faq',
    async run(page) {
      await page.locator('.faq-section').scrollIntoViewIfNeeded()
      const summary = page.locator('.faq-list summary').first()
      await summary.waitFor({ state: 'visible' })
      await summary.click()
    }
  },
  {
    name: 'installation-section',
    screen: 'install',
    async run(page) {
      await page.locator('#get-started').scrollIntoViewIfNeeded()
      await page.locator('#install-commands').waitFor({ state: 'visible' })
    }
  },
  {
    name: 'mobile-navigation',
    screen: 'navigation',
    async shouldSkip(page, viewport) {
      if (viewport && viewport.width >= 768) {
        return 'mobile navigation drawer is only rendered at viewports < 768px'
      }
      return null
    },
    async run(page) {
      await page.evaluate(() => window.scrollTo(0, 0))
      const toggle = page.locator('[data-menu-toggle]')
      await toggle.waitFor({ state: 'visible' })
      await toggle.click()
      await page.locator('#mobile-navigation').waitFor({ state: 'visible' })
    }
  }
]
