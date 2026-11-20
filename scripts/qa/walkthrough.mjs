import assert from 'node:assert/strict'
import { preparePreview, simulateInventoryChange } from './preview.mjs'
import { waitForFocus } from './interactions.mjs'

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

async function scrollPastPreview(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'instant'
        })
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      })
  )
}

export async function verifyWalkthrough(page) {
  const app = await preparePreview(page)
  const { play, takeControl, replay, reset } = walkthroughControls(page)
  const viewport = page.locator('#preview-screen')
  const cursor = page.locator('[data-preview-tour-cursor]')
  const pluginsTab = page.getByRole('tab', { name: 'Plugins', exact: true })
  assert.equal(
    await page.getByText('Reduced motion is enabled').isVisible(),
    false
  )
  await play.waitFor({ timeout: 4000 })
  await viewport.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    window.scrollTo({
      top: scrollY + bounds.top - innerHeight + bounds.height * 0.35,
      behavior: 'instant'
    })
  })
  await takeControl.waitFor({ timeout: 5000 })
  await cursor.waitFor()
  await viewport.scrollIntoViewIfNeeded()
  assert.ok(
    await pluginsTab.isDisabled(),
    'Preview tabs are locked during playback.'
  )

  const skillBack = app.getByRole('button', { name: 'Back to skills' })
  await skillBack.waitFor({ timeout: 10000 })
  const backButton = await skillBack.boundingBox()
  await page.mouse.click(
    backButton.x + backButton.width / 2,
    backButton.y + backButton.height / 2
  )
  assert.ok(
    await skillBack.isVisible(),
    'A direct click cannot change the playing preview.'
  )
  await takeControl.focus()
  await page.keyboard.press('Tab')
  await waitForFocus(reset)
  await viewport.evaluate((element) =>
    window.scrollTo({
      top: scrollY + element.getBoundingClientRect().top - 96,
      behavior: 'instant'
    })
  )
  const viewportBox = await viewport.boundingBox()
  await page.mouse.move(
    viewportBox.x + viewportBox.width / 2,
    viewportBox.y + viewportBox.height / 2
  )
  const beforeWheel = await page.evaluate(() => scrollY)
  await page.mouse.wheel(0, 120)
  await page.waitForFunction((before) => scrollY > before, beforeWheel)
  assert.ok(
    await takeControl.isVisible(),
    'Page scrolling does not take control.'
  )
  await page.waitForFunction(() => {
    const appDocument = document.querySelector(
      '[data-preview-frame]'
    ).contentDocument
    return [
      ...appDocument.querySelectorAll('main [class~="overflow-y-auto"]')
    ].some((element) => element.scrollTop > 0)
  })

  await scrollPastPreview(page)
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
  await skillBack.waitFor()
  assert.ok(
    await takeControl.isVisible(),
    'Playback loops from Cost back to Skills.'
  )
  await takeControl.click()
  await replay.waitFor()
  assert.ok(await skillBack.isVisible(), 'Take control keeps the open details.')
  assert.equal(await pluginsTab.isEnabled(), true)
  await skillBack.click()
  await simulateInventoryChange(page, 'add-skill')
  const addedSkill = app
    .locator('tbody tr')
    .filter({ hasText: 'release-readiness' })
  await addedSkill.waitFor()
  await app.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = app.getByRole('dialog', { name: 'Settings', exact: true })
  await settings.waitFor()

  await scrollPastPreview(page)
  await viewport.scrollIntoViewIfNeeded()
  await takeControl.waitFor()
  await settings.waitFor({ state: 'hidden' })
  await skillBack.waitFor()
  assert.ok(
    await app
      .locator('body')
      .evaluate(async () =>
        (await window.api.listSkills()).skills.some(
          (skill) => skill.name === 'release-readiness'
        )
      ),
    'Returning to the preview retains sample edits.'
  )
  await reset.click()
  await takeControl.waitFor()
  await app.getByRole('button', { name: /Search skills/ }).waitFor()
  await skillBack.waitFor({ state: 'hidden' })
  assert.equal(
    await addedSkill.count(),
    0,
    'Reset restores the original sample.'
  )
  await skillBack.waitFor()

  const link = page.locator(
    '[data-preview-link="plugins"][data-preview-target="user"]'
  )
  await link.click()
  await app.locator('h2[title="User Plugins"]').waitFor()
  await waitForFocus(pluginsTab)
  await replay.waitFor()
  await app.locator('tbody tr').first().click()
  await app.getByRole('button', { name: 'Back to plugins' }).waitFor()
}

export async function verifyReducedMotionWalkthrough(page) {
  const app = await preparePreview(page)
  const { play, takeControl, replay, reset } = walkthroughControls(page)
  const motionNote = page.getByText('Reduced motion is enabled', {
    exact: true
  })
  await page.locator('#preview-screen').scrollIntoViewIfNeeded()
  await play.waitFor({ timeout: 4000 })
  await motionNote.waitFor()
  const back = app.getByRole('button', { name: 'Back to skills' })
  await play.click()
  await motionNote.waitFor({ state: 'hidden' })
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
  await takeControl.click()
  await motionNote.waitFor()
  await back.click()
  await app.getByText('release-readiness', { exact: true }).first().waitFor()
  await reset.click()
  await app.getByRole('button', { name: /Search skills/ }).waitFor()
  await app.getByText('release-readiness', { exact: true }).first().waitFor({
    state: 'hidden'
  })
  await replay.waitFor()
  await scrollPastPreview(page)
  await page.locator('#preview-screen').scrollIntoViewIfNeeded()
  await motionNote.waitFor()
  assert.ok(await replay.isVisible(), 'Reduced motion keeps playback opt-in.')
}
