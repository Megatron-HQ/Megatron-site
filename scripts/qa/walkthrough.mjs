import assert from 'node:assert/strict'
import { preparePreview, simulateInventoryChange } from './preview.mjs'

function walkthroughControls(page) {
  return {
    play: page.getByRole('button', { name: 'Play walkthrough', exact: true }),
    takeControl: page.getByRole('button', {
      name: 'Take control',
      exact: true
    }),
    replay: page.getByRole('button', {
      name: 'Replay walkthrough',
      exact: true
    }),
    reset: page.getByRole('button', { name: 'Reset sample', exact: true })
  }
}

export async function verifyWalkthrough(page) {
  const app = await preparePreview(page)
  const { play, takeControl, replay, reset } = walkthroughControls(page)
  const viewport = page.locator('#preview-screen')
  const cursor = page.locator('[data-preview-tour-cursor]')
  await play.waitFor({ timeout: 4000 })
  await viewport.scrollIntoViewIfNeeded()
  await takeControl.waitFor()
  await cursor.waitFor()

  const skillBack = app.getByRole('button', { name: 'Back to skills' })
  await skillBack.waitFor({ timeout: 10000 })
  await page.waitForFunction(() => {
    const appDocument = document.querySelector(
      '[data-preview-frame]'
    ).contentDocument
    return [
      ...appDocument.querySelectorAll('main [class~="overflow-y-auto"]')
    ].some((element) => element.scrollTop > 0)
  })

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await cursor.waitFor({ state: 'hidden' })
  const scroller = app.locator('main [class~="overflow-y-auto"]').first()
  const pausePosition = await scroller.evaluate((element) => element.scrollTop)
  await page.waitForTimeout(3800)
  assert.equal(
    await scroller.evaluate((element) => element.scrollTop),
    pausePosition
  )
  assert.ok(
    await takeControl.isVisible(),
    'Playback can be stopped while paused.'
  )
  assert.ok(await skillBack.isVisible(), 'Pausing keeps the current view.')
  await viewport.scrollIntoViewIfNeeded()
  await cursor.waitFor()
  await app.getByText('MCP servers · 2', { exact: true }).waitFor()
  await app
    .getByRole('heading', { name: 'workspace-docs', exact: true })
    .waitFor()
  await page.waitForFunction(() => {
    const appDocument = document.querySelector(
      '[data-preview-frame]'
    ).contentDocument
    const tool = appDocument.querySelector('[title="search_documents"]')
    if (!tool) return false
    const scroller = tool.closest('[class~="overflow-y-auto"]')
    const bounds = tool.getBoundingClientRect()
    const clip = scroller.getBoundingClientRect()
    return bounds.top >= clip.top && bounds.bottom <= clip.bottom
  })

  const usage = app.getByRole('navigation', { name: 'Usage panels' })
  const current = usage.locator('[aria-current="page"]')
  await current.and(usage.getByRole('button', { name: 'Activity' })).waitFor()
  await current.and(usage.getByRole('button', { name: 'Cost' })).waitFor()
  await replay.waitFor()
  await cursor.waitFor({ state: 'hidden' })
  assert.equal(await current.textContent(), 'Cost')

  await replay.click()
  await skillBack.waitFor()
  await skillBack.click()
  await replay.waitFor()
  await skillBack.waitFor({ state: 'hidden' })
  await app.getByRole('button', { name: /Search skills/ }).waitFor()

  await replay.click()
  await skillBack.waitFor()
  await takeControl.click()
  await replay.waitFor()
  assert.ok(await skillBack.isVisible(), 'Take control keeps the open details.')

  await replay.click()
  await skillBack.waitFor()
  await reset.click()
  await replay.waitFor()
  await app.getByRole('button', { name: /Search skills/ }).waitFor()
  await skillBack.waitFor({ state: 'hidden' })
}

export async function verifyReducedMotionWalkthrough(page) {
  const app = await preparePreview(page)
  const { play, takeControl, replay, reset } = walkthroughControls(page)
  await page.locator('#preview-screen').scrollIntoViewIfNeeded()
  await play.waitFor({ timeout: 4000 })
  const back = app.getByRole('button', { name: 'Back to skills' })
  await play.click()
  await back.waitFor()
  await takeControl.click()
  await back.click()
  await simulateInventoryChange(page, 'add-skill')
  await app.getByText('release-readiness', { exact: true }).first().waitFor()
  await replay.click()
  await back.waitFor()
  assert.equal(
    await page.locator('[data-preview-tour-cursor]').isVisible(),
    false
  )
  await replay.waitFor()
  await page.getByRole('tab', { name: 'Skills', exact: true }).click()
  await back.click()
  await app.getByText('release-readiness', { exact: true }).first().waitFor()
  await reset.click()
  await app.getByRole('button', { name: /Search skills/ }).waitFor()
  await app.getByText('release-readiness', { exact: true }).first().waitFor({
    state: 'hidden'
  })
}
