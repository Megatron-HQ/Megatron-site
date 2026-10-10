import { launchBrowser } from '../../.claude/skills/visual-verify/browser-launch.mjs'
import { verifyPreview } from './preview.mjs'

const browser = await launchBrowser()
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce'
  })
  page.setDefaultTimeout(10000)
  await page.goto(process.env.MEGATRON_TEST_URL || 'http://127.0.0.1:5173/')
  await verifyPreview(page)
  console.log('App renderer and preview integration checks passed.')
} finally {
  await browser.close()
}
