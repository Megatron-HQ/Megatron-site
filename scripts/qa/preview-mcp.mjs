import assert from 'node:assert/strict'
import { waitForFocus } from './interactions.mjs'
import { openWhatsNew } from './preview-v030.mjs'
import { selectPanel } from './preview.mjs'
import { openAnalyticsView } from './analytics-deck.mjs'

export function mcpRailButton(app) {
  return app
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'MCP servers', exact: true })
}

export function mcpServerRow(app, name = 'workspace-docs') {
  return app.locator('tbody tr[data-row-key]').filter({
    has: app.getByText(name, { exact: true })
  })
}

export async function openMcpInventory(app) {
  await mcpRailButton(app).click()
  await mcpServerRow(app).waitFor()
}

export async function verifyMcpLayout(page, app) {
  const tab = page.getByRole('tab', { name: 'MCP servers', exact: true })
  await tab.click()
  const source = mcpServerRow(app).getByText('Local · Project · User', {
    exact: true
  })
  await source.waitFor()
  assert.ok(
    await source.evaluate(
      (label) =>
        label.getBoundingClientRect().right <=
        label.closest('td').getBoundingClientRect().right
    ),
    'The scope label stays inside its source cell.'
  )
  const tabHeight = (await tab.boundingBox()).height
  const pluginsTab = page.getByRole('tab', { name: 'Plugins', exact: true })
  assert.equal(tabHeight, (await pluginsTab.boundingBox()).height)
}

export async function openMcpServer(app, name = 'workspace-docs') {
  await openMcpInventory(app)
  await mcpServerRow(app, name).press('Enter')
  await app.getByRole('heading', { name, exact: true }).waitFor()
}

export async function verifyMcpInventory(page, app) {
  const tab = page.getByRole('tab', { name: 'MCP servers', exact: true })
  await page.getByRole('tab', { name: 'Plugins', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await mcpServerRow(app).waitFor()
  assert.equal(await tab.getAttribute('aria-selected'), 'true')
  assert.equal(await mcpRailButton(app).getAttribute('aria-current'), 'page')

  const filters = app.getByRole('navigation', { name: 'MCP server filters' })
  await filters.getByRole('button', { name: /^Observed/ }).click()
  await mcpServerRow(app, 'local-inspector').waitFor()
  await filters.getByRole('button', { name: /^Claude\.ai/i }).click()
  await mcpServerRow(app, 'claude.ai Drive').waitFor()
  await filters.getByRole('button', { name: /^All servers/ }).click()
  await mcpServerRow(app).press('Enter')
  await app
    .getByRole('heading', { name: 'workspace-docs', exact: true })
    .waitFor()
  await app.getByRole('button', { name: 'Reveal file' }).first().click()
  await page
    .getByRole('status')
    .filter({ hasText: 'Sample declaration:' })
    .waitFor()
  await page.keyboard.press('Escape')
  await waitForFocus(mcpServerRow(app))

  const skills = page.getByRole('tab', { name: 'Skills', exact: true })
  await skills.click()
  await app.getByRole('button', { name: /Search skills/ }).click()
  const search = app.getByPlaceholder(
    'Search skills, plugins, MCP servers, projects...'
  )
  await search.fill('workspace-docs')
  await app.getByRole('option', { name: /workspace-docs/ }).waitFor()
  await search.press('Enter')
  await app
    .getByRole('heading', { name: 'workspace-docs', exact: true })
    .waitFor()
  await tab.and(page.locator('[aria-selected="true"]')).waitFor()
}

export async function verifyMcpWhatsNew(app) {
  const highlights = [
    'See every MCP server in one place',
    'Track MCP calls in Usage',
    'Remove MCP servers and sign out'
  ]
  for (const [index, title] of highlights.entries()) {
    const news = await openWhatsNew(app)
    for (let step = 0; step < index; step++)
      await news
        .getByRole('button', { name: 'Next', exact: true })
        .press('Enter')
    await news.getByText(title, { exact: true }).waitFor()
    await news
      .getByRole('button', { name: 'Show me', exact: true })
      .press('Enter')
    await news.waitFor({ state: 'hidden' })
    if (index === 1) {
      const selected = app
        .getByRole('navigation', { name: 'Usage panels' })
        .getByRole('button', { name: 'MCP servers', exact: true })
      await selected.waitFor()
      assert.equal(await selected.getAttribute('aria-current'), 'page')
    } else await mcpServerRow(app).waitFor()
  }
}

export async function openMcpCheckDialog(app) {
  await openMcpInventory(app)
  await app
    .getByRole('button', { name: 'Check connections', exact: true })
    .press('Enter')
  const dialog = app.getByRole('dialog', { name: 'Check MCP connections?' })
  await dialog.waitFor()
  return dialog
}

export async function verifyMcpManagement(app) {
  const first = await openMcpCheckDialog(app)
  await first
    .getByRole('button', { name: 'Cancel', exact: true })
    .press('Enter')
  await first.waitFor({ state: 'hidden' })
  assert.equal(await mcpServerRow(app, 'claude.ai Tasks').count(), 0)
  const check = await openMcpCheckDialog(app)
  await check.getByRole('button', { name: 'Check connections' }).press('Enter')
  await mcpServerRow(app, 'claude.ai Tasks')
    .getByText('Needs sign-in')
    .waitFor()
  await openMcpServer(app)
  await app
    .getByRole('button', { name: 'Check in this project' })
    .press('Enter')
  await app.getByRole('button', { name: 'Check again', exact: true }).waitFor()
  await app
    .getByRole('button', { name: 'Log out', exact: true })
    .first()
    .press('Enter')
  const logout = app.getByRole('dialog', { name: 'Log out of workspace-docs?' })
  await logout
    .getByRole('button', { name: 'Log out', exact: true })
    .press('Enter')
  await app
    .getByText('Signed out of sample server workspace-docs.', { exact: true })
    .waitFor()
  await app.getByText('Needs sign-in', { exact: true }).first().waitFor()

  await app
    .getByRole('button', { name: "Reset this project's choices" })
    .press('Enter')
  const reset = app.getByRole('dialog', { name: /Reset \.mcp\.json choices/ })
  await reset.getByRole('button', { name: 'Reset', exact: true }).press('Enter')
  await app.getByText(/sample declarations await approval/).waitFor()
  await app
    .getByRole('button', { name: 'Back to MCP servers', exact: true })
    .click()

  await openMcpServer(app, 'build-preview')
  await app.getByRole('button', { name: 'Remove', exact: true }).press('Enter')
  const remove = app.getByRole('dialog', {
    name: /Remove build-preview from project scope/
  })
  await remove
    .getByRole('button', { name: 'Remove', exact: true })
    .press('Enter')
  await mcpServerRow(app).waitFor()
  assert.equal(await mcpServerRow(app, 'build-preview').count(), 0)
}

export async function verifyMcpUsage(page, app) {
  await selectPanel(app, 'MCP servers')
  const period = app.getByRole('radio', { name: '7 days', exact: true })
  await period.press('Enter')
  await app
    .getByRole('button', { name: 'Open workspace-docs detail' })
    .first()
    .press('Enter')
  await app
    .getByRole('heading', { name: 'workspace-docs', exact: true })
    .waitFor()
  await app
    .getByRole('button', { name: 'Back to MCP servers', exact: true })
    .press('Enter')
  await period.waitFor()
  assert.equal(await period.getAttribute('aria-checked'), 'true')

  const compact = await openAnalyticsView(page, 'mcp')
  await compact
    .getByRole('button', { name: 'Open workspace-docs detail' })
    .first()
    .press('Enter')
  await page.locator('[data-analytics-deck][data-state="stack"]').waitFor()
  await app
    .getByRole('heading', { name: 'workspace-docs', exact: true })
    .waitFor()
  await page
    .getByRole('tab', { name: 'MCP servers', exact: true, selected: true })
    .waitFor()
  await app
    .getByRole('button', { name: 'Back to MCP servers', exact: true })
    .press('Enter')
  await app
    .getByRole('navigation', { name: 'Usage panels' })
    .getByRole('button', { name: 'MCP servers', exact: true })
    .waitFor()
}
