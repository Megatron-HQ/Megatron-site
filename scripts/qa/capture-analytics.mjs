import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { launchBrowser } from '../../.claude/skills/visual-verify/browser-launch.mjs'

const SAMPLE_CLOCK = '2026-10-09T12:00:00.000Z'
const CAPTURE_WIDTH = 1224
const PANELS = [
  [
    'tokens',
    'Tokens',
    ['Total tokens processed · estimated', 'By day', 'By model', 'By project']
  ],
  ['cost', 'Cost', ['By day', 'By time of day', 'By project']],
  ['activity', 'Activity', ['By day', 'By time of day', 'By project']],
  [
    'history',
    'History',
    ['Active days', 'Longest streak', 'Busiest day', 'Prompts / active day']
  ],
  ['models', 'Models', ['By model', 'Model × effort']],
  [
    'skills',
    'Skills',
    ['Invocations over time', 'Top skills', 'How they were invoked']
  ],
  ['resident-tax', 'Resident tax', ['Global baseline', 'Deferred, not loaded']]
]

const baseUrl = process.env.MEGATRON_TEST_URL || 'http://127.0.0.1:5173/'
const directory = resolve(import.meta.dirname, '../../public/analytics')
await mkdir(directory, { recursive: true })
const browser = await launchBrowser()
const captures = []
try {
  for (const [panel, title, labels] of PANELS) {
    const page = await browser.newPage({
      viewport: { width: CAPTURE_WIDTH, height: 1000 },
      reducedMotion: 'reduce',
      colorScheme: 'light',
      locale: 'en-US',
      timezoneId: 'America/Chicago',
      deviceScaleFactor: 1
    })
    await page.clock.setFixedTime(new Date(SAMPLE_CLOCK))
    const url = new URL('preview/index.html', baseUrl)
    url.search = new URLSearchParams({
      section: 'usage',
      panel,
      clock: SAMPLE_CLOCK
    })
    await page.goto(url.href)
    await page.evaluate(() => document.fonts.ready)
    const header = page
      .locator('header')
      .filter({ has: page.getByText(title, { exact: true }) })
    await header.waitFor()
    if (!['history', 'resident-tax'].includes(panel)) {
      await header.getByRole('radio', { name: '7 days', exact: true }).click()
    }
    for (const label of labels)
      await page.getByText(label, { exact: true }).first().waitFor()
    if (panel === 'history')
      await page
        .getByRole('region', { name: 'Project timeline', exact: true })
        .waitFor()
    const container = header.locator('..')
    const content = header.locator('xpath=following-sibling::div').first()
    const dimensions = await container.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const header = element.querySelector('header')
      const content = header.nextElementSibling.firstElementChild
      return {
        top: rect.top,
        height:
          header.getBoundingClientRect().height +
          content.getBoundingClientRect().height
      }
    })
    await page.setViewportSize({
      width: CAPTURE_WIDTH,
      height: Math.ceil(dimensions.top + dimensions.height)
    })
    await content.evaluate((element) => {
      element.scrollTop = 0
    })
    assert.equal(
      await content.evaluate(
        (element) => element.scrollHeight <= element.clientHeight + 1
      ),
      true,
      `${title} must be captured to its bottom.`
    )
    await page.mouse.move(0, 0)
    const path = join(directory, `${panel}.png`)
    await container.screenshot({ path, animations: 'disabled' })
    const bounds = await container.boundingBox()
    captures.push({
      panel,
      title,
      width: Math.round(bounds.width),
      height: Math.round(bounds.height),
      period:
        panel === 'history'
          ? '2026'
          : panel === 'resident-tax'
            ? null
            : '7 days'
    })
    console.log(
      `${panel}: ${Math.round(bounds.width)} × ${Math.round(bounds.height)}`
    )
    await page.close()
  }
  await writeFile(
    join(directory, 'manifest.json'),
    `${JSON.stringify({ clock: SAMPLE_CLOCK, theme: 'light', locale: 'en-US', timezone: 'America/Chicago', captures }, null, 2)}\n`
  )
} finally {
  await browser.close()
}
