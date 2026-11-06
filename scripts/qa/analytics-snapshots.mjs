import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { launchBrowser } from '../../.claude/skills/visual-verify/browser-launch.mjs'
import { waitForFocus } from './interactions.mjs'

const PANELS = [
  'tokens',
  'cost',
  'activity',
  'history',
  'models',
  'skills',
  'resident-tax'
]

export async function verifyAnalyticsSnapshots(page) {
  const snapshots = page.locator('[data-analytics-snapshot]')
  assert.equal(
    await snapshots.count(),
    7,
    'Every analytics point needs its own snapshot.'
  )
  const previewDimensions = await snapshots.evaluateAll((elements) =>
    elements.map((element) => {
      const { width, height } = element.getBoundingClientRect()
      return { width, height }
    })
  )
  const previewHeights = previewDimensions.map(({ height }) => height)
  assert.ok(
    Math.max(...previewHeights) - Math.min(...previewHeights) <= 1,
    'All seven preview windows must have the same height, regardless of the panel length.'
  )
  for (const panel of PANELS) {
    const trigger = page.locator(`[data-analytics-snapshot="${panel}"]`)
    const image = trigger.locator('img')
    await trigger.scrollIntoViewIfNeeded()
    await image.evaluate((element) => element.decode())
    assert.equal(
      new URL(await image.getAttribute('src'), page.url()).pathname,
      `/analytics/${panel}.png`
    )
    assert.equal(
      await image.evaluate((element) => element.naturalWidth >= 800),
      true
    )
    const row = trigger.locator('xpath=ancestor::article')
    assert.equal(
      await row.locator('[data-show-usage], [data-show-cost]').count(),
      1
    )
    await trigger.focus()
    const sourceScroll = await page.evaluate(() => scrollY)
    const sourceOverflow = await page.evaluate(
      () => document.body.style.overflow
    )
    await trigger.press('Enter')
    const viewer = page.getByRole('dialog', { name: /snapshot/i })
    await viewer.waitFor()
    const enlarged = viewer.locator('img')
    await enlarged.evaluate((element) => element.decode())
    assert.equal(
      await enlarged.getAttribute('src'),
      await image.getAttribute('src')
    )
    assert.ok(
      await enlarged.evaluate(
        (element) => element.clientWidth >= Math.min(element.naturalWidth, 800)
      ),
      'The viewer must offer a readable image, including on mobile.'
    )
    assert.equal(
      await page.evaluate(() => document.body.style.overflow),
      'hidden'
    )
    await page.keyboard.press('Escape')
    await viewer.waitFor({ state: 'hidden' })
    await waitForFocus(trigger)
    assert.equal(
      await page.evaluate(() => document.body.style.overflow),
      sourceOverflow
    )
    assert.ok(
      Math.abs((await page.evaluate(() => scrollY)) - sourceScroll) < 2,
      'Closing the viewer preserves the reading position.'
    )
  }
  const trigger = snapshots.first()
  await trigger.click()
  const viewer = page.getByRole('dialog', { name: /snapshot/i })
  const close = viewer.getByRole('button', {
    name: 'Close snapshot',
    exact: true
  })
  await waitForFocus(close)
  await page.keyboard.press('Tab')
  assert.equal(
    await viewer.evaluate((element) =>
      element.contains(document.activeElement)
    ),
    true,
    'Keyboard focus stays inside the viewer.'
  )
  await close.click()
  await waitForFocus(trigger)
  assert.equal(await page.locator('#analytics iframe').count(), 0)
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    ),
    true
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const browser = await launchBrowser()
  try {
    for (const width of [375, 768, 1024, 1440]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        reducedMotion: 'reduce'
      })
      await page.goto(process.env.MEGATRON_TEST_URL || 'http://127.0.0.1:5173/')
      await verifyAnalyticsSnapshots(page)
      await page.close()
    }
    console.log(
      'Seven snapshots and accessible image enlargement passed at all four widths.'
    )
  } finally {
    await browser.close()
  }
}
