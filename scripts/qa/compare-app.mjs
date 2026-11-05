import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { build, preview } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { _electron } from 'playwright-core'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { launchBrowser } from '../../.claude/skills/visual-verify/browser-launch.mjs'
import { openSkill, openResidentCategory, selectPanel } from './preview.mjs'

const root = resolve(import.meta.dirname, '../..')
const appRoot = process.argv[2] && resolve(process.argv[2])
if (!appRoot)
  throw new Error(
    'Usage: node scripts/qa/compare-app.mjs <Megatron app checkout>'
  )
const provenance = JSON.parse(
  await readFile(join(root, 'vendor/megatron/provenance.json'), 'utf8')
)
const revision = execFileSync('git', ['-C', appRoot, 'rev-parse', 'HEAD'], {
  encoding: 'utf8'
}).trim()
assert.equal(
  revision,
  provenance.revision,
  'The current reference must match the pinned app revision.'
)
const directory = join(root, '.qa/app-reference')
await mkdir(directory, { recursive: true })
const browserImport = (path) => `/@fs/${path.replaceAll('\\', '/')}`
const sourceRoot = join(appRoot, 'src/renderer/src')
const referenceSource = relative(directory, sourceRoot).replaceAll('\\', '/')
const referenceMountStyles = relative(
  directory,
  join(root, 'src/preview/styles.css')
).replaceAll('\\', '/')
// The temporary reference root is ignored by Git. Explicitly scan the original
// renderer so Tailwind includes classes held in its constants as well as JSX.
await writeFile(
  join(directory, 'reference.css'),
  `@import '${referenceSource}/assets/main.css';\n@import '${referenceMountStyles}';\n@source '${referenceSource}';\n`
)
await writeFile(
  join(directory, 'index.html'),
  `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:"><link rel="icon" href="data:,"><title>Megatron reference</title></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>`
)
await writeFile(
  join(directory, 'entry.tsx'),
  `
import './reference.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '${browserImport(join(sourceRoot, 'App.tsx'))}'
import { createDemoApi } from '${browserImport(join(root, 'src/preview/api.ts'))}'
window.api = createDemoApi({now:new Date('2026-10-09T12:00:00.000Z')}).api
createRoot(document.getElementById('root')!).render(<StrictMode><QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider></StrictMode>)
`
)
const packages = JSON.parse(
  await readFile(join(root, 'package.json'), 'utf8')
).dependencies
const referenceConfig = {
  configFile: false,
  root: directory,
  logLevel: 'error',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': sourceRoot }, dedupe: Object.keys(packages) },
  build: { outDir: join(directory, 'dist'), target: 'es2022' },
  preview: { host: '127.0.0.1', port: 0, strictPort: false }
}
await build(referenceConfig)
const referenceServer = await preview(referenceConfig)
const siteServer = await preview({
  configFile: join(root, 'vite.config.js'),
  root,
  logLevel: 'error',
  preview: { host: '127.0.0.1', port: 0, strictPort: false }
})
const address = (server) =>
  `http://127.0.0.1:${server.httpServer.address().port}/`
const executable = join(
  appRoot,
  'node_modules/electron/dist',
  process.platform === 'win32'
    ? 'electron.exe'
    : process.platform === 'darwin'
      ? 'Electron.app/Contents/MacOS/Electron'
      : 'electron'
)
await writeFile(
  join(directory, 'electron-main.cjs'),
  `const { app, BrowserWindow } = require('electron')
app.commandLine.appendSwitch('force-device-scale-factor', '1')
app.commandLine.appendSwitch('force-color-profile', 'srgb')
app.whenReady().then(() => {
  const window = new BrowserWindow({width:1200,height:720,useContentSize:true,show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,offscreen:true,backgroundThrottling:false}})
  window.loadURL(${JSON.stringify(address(referenceServer))})
})
`
)

let electron
let browser
const results = []
const errors = []

async function linkArchivedProject(page) {
  await selectPanel(page, 'Tokens')
  const pair = await page.evaluate(async () => {
    const { projects } = await window.api.getUsageProjects()
    return {
      source: projects.find(
        (project) => project.path === 'C:\\Archive\\web-app'
      ),
      target: projects.find((project) => project.path === 'C:\\Dev\\web-app')
    }
  })
  await page
    .getByRole('button', { name: 'Manage projects', exact: true })
    .click()
  const manager = page.getByRole('dialog', {
    name: 'Manage projects',
    exact: true
  })
  await manager.getByRole('searchbox').fill('web-app')
  const source = manager.getByRole('article', {
    name: pair.source.label,
    exact: true
  })
  await source.getByRole('combobox').selectOption(pair.target.id)
  await source
    .getByRole('button', { name: 'Link locations', exact: true })
    .click()
  await manager
    .getByRole('button', { name: 'Unlink C:\\Archive\\web-app', exact: true })
    .waitFor()
  return manager
}

const scenes = [
  [
    'manage-projects',
    async (page) => {
      await selectPanel(page, 'Tokens')
      await page
        .getByRole('button', { name: 'Manage projects', exact: true })
        .click()
      await page.getByRole('dialog').getByRole('article').first().waitFor()
    }
  ],
  ['linked-projects', (page) => linkArchivedProject(page)],
  [
    'linked-project-search',
    async (page) => {
      const manager = await linkArchivedProject(page)
      await manager.getByRole('searchbox').press('Escape')
      await manager.waitFor({ state: 'hidden' })
      await page
        .getByRole('searchbox', { name: 'Search projects', exact: true })
        .fill('C:/Archive/web-app')
      await page.getByText(/^1 of \d+ projects match$/).waitFor()
    }
  ],
  [
    'linked-timeline-search',
    async (page) => {
      const manager = await linkArchivedProject(page)
      await manager.getByRole('searchbox').press('Escape')
      await manager.waitFor({ state: 'hidden' })
      await selectPanel(page, 'History')
      await page
        .getByRole('searchbox', {
          name: 'Search project timeline',
          exact: true
        })
        .fill('C:/Archive/web-app')
      await page.getByText(/^1 of \d+ projects match$/).waitFor()
    }
  ],
  [
    'inventory',
    async (page) => {
      await page
        .getByRole('button', { name: 'All Skills', exact: true })
        .click()
    }
  ],
  [
    'palette',
    async (page) => {
      await page
        .getByRole('button', { name: 'Search skills', exact: false })
        .click()
      await page
        .getByPlaceholder('Search skills, plugins, projects...')
        .fill('design')
    }
  ],
  ['detail', (page) => openSkill(page, 'design-system')],
  [
    'files',
    async (page) => {
      await openSkill(page)
      await page
        .getByRole('button', { name: 'View files', exact: true })
        .click()
      await page.getByRole('tree', { name: 'Skill files' }).waitFor()
    }
  ],
  [
    'budget',
    async (page) => {
      await page.getByRole('button', { name: /EST\. tokens/ }).click()
      await page.getByRole('dialog').waitFor()
    }
  ],
  [
    'plugins',
    async (page) => {
      await page.getByRole('button', { name: 'Plugins', exact: true }).click()
      await page.locator('tbody tr').first().waitFor()
    }
  ],
  [
    'plugin-detail',
    async (page) => {
      await page.getByRole('button', { name: 'Plugins', exact: true }).click()
      await page
        .locator('tbody tr')
        .filter({ hasText: 'frontend' })
        .filter({ hasText: 'team-tools' })
        .filter({ hasText: 'User' })
        .click()
      await page
        .getByRole('button', { name: 'Back to plugins', exact: true })
        .waitFor()
    }
  ],
  ...[
    'Activity',
    'History',
    'Tokens',
    'Cost',
    'Models',
    'Skills',
    'Resident tax'
  ].map((panel) => [
    panel.toLowerCase().replaceAll(' ', '-'),
    async (page) => {
      await selectPanel(page, panel)
      if (panel === 'Resident tax')
        await page.getByText('Global baseline', { exact: true }).waitFor()
    }
  ]),
  ...[
    'Skills',
    'Custom agents',
    'Memory files',
    'MCP tools',
    'System prompt',
    'System tools',
    'Messages',
    'MCP server instructions'
  ].map((category) => [
    `resident-${category.toLowerCase().replaceAll(' ', '-')}`,
    async (page) => {
      await openResidentCategory(page, category)
      await page.getByRole('dialog').locator('table, summary').first().waitFor()
    }
  ]),
  ...['Tools', 'Cache breakpoints'].map((view) => [
    `resident-system-detail-${view.toLowerCase().replaceAll(' ', '-')}`,
    async (page) => {
      await openResidentCategory(page, 'System prompt')
      await page
        .getByRole('dialog')
        .getByRole('radio', { name: view, exact: true })
        .click()
      if (view === 'Tools')
        await page.getByRole('dialog').locator('summary').first().click()
    }
  ]),
  [
    'tokens-hourly',
    async (page) => {
      await selectPanel(page, 'Tokens')
      await page.getByRole('radio', { name: '24 hours', exact: true }).click()
    }
  ],
  [
    'calendar-year',
    async (page) => {
      await selectPanel(page, 'History')
      await page
        .getByRole('navigation', { name: 'Contribution year', exact: true })
        .getByRole('button', { name: '2024', exact: true })
        .click()
      await page
        .getByRole('group', {
          name: 'Daily activity calendar for 2024',
          exact: true
        })
        .waitFor()
    }
  ],
  [
    'calendar-details',
    async (page) => {
      await selectPanel(page, 'History')
      await page
        .getByRole('group', {
          name: 'Daily activity calendar for 2026',
          exact: true
        })
        .locator('button[aria-haspopup="dialog"]')
        .last()
        .click()
      await page
        .getByRole('dialog')
        .getByText(/estimated tokens processed/)
        .waitFor()
    }
  ],
  [
    'tokens-exact',
    async (page) => {
      await selectPanel(page, 'Tokens')
      await page.locator('.text-usage-stat [tabindex="0"]').first().focus()
      await page
        .getByRole('tooltip')
        .getByText(/exact tokens/)
        .waitFor()
    }
  ],
  [
    'history-projects-expanded',
    async (page) => {
      await selectPanel(page, 'History')
      await page
        .getByRole('region', { name: 'Project timeline', exact: true })
        .getByRole('button', { name: /more projects/ })
        .click()
    }
  ],
  [
    'history-month-tooltip',
    async (page) => {
      await selectPanel(page, 'History')
      await page
        .getByRole('navigation', { name: 'Contribution year', exact: true })
        .getByRole('button', { name: '2024', exact: true })
        .click()
      await page
        .getByRole('region', { name: 'Project timeline', exact: true })
        .getByRole('img', { name: /Jul 2024.*recorded prompts/ })
        .first()
        .press('ArrowRight')
      await page
        .getByRole('tooltip')
        .getByText(/of this month’s prompts/)
        .waitFor()
    }
  ],
  [
    'history-busiest-day',
    async (page) => {
      await selectPanel(page, 'History')
      await page.getByRole('button', { name: /^Busiest day:/ }).click()
      await page
        .getByRole('dialog')
        .getByText(/Activity details/)
        .waitFor()
    }
  ],
  [
    'history-token-only',
    async (page) => {
      await selectPanel(page, 'History')
      await page
        .getByRole('navigation', { name: 'Contribution year', exact: true })
        .getByRole('button', { name: '2024', exact: true })
        .click()
      await page
        .getByRole('button', {
          name: /^(?:July 1, 2024|1 July 2024) · Prompt history unavailable$/
        })
        .focus()
      await page
        .getByRole('tooltip')
        .getByText('162,200 exact tokens', { exact: true })
        .waitFor()
    }
  ],
  ...['Tokens', 'Activity', 'History', 'Resident tax'].map((panel) => [
    `${panel.toLowerCase().replaceAll(' ', '-')}-dark`,
    async (page) => {
      await page.getByRole('button', { name: 'Settings', exact: true }).click()
      await page.getByRole('radio', { name: 'Dark', exact: true }).click()
      await page.getByRole('button', { name: 'Close', exact: true }).click()
      await selectPanel(page, panel)
      if (panel === 'Resident tax')
        await page.getByText('Global baseline', { exact: true }).waitFor()
    }
  ]),
  [
    'cost-dialog',
    async (page) => {
      await selectPanel(page, 'Cost')
      await page.getByRole('radio', { name: '24 hours', exact: true }).click()
      await page.locator('button[aria-haspopup="dialog"]').first().click()
      await page.getByRole('dialog').waitFor()
    }
  ],
  [
    'activity-dialog',
    async (page) => {
      await selectPanel(page, 'Activity')
      await page.locator('button[aria-haspopup="dialog"]').last().click()
      await page.getByRole('dialog').waitFor()
    }
  ],
  [
    'project-tree',
    async (page) => {
      await page
        .getByRole('button', { name: 'Expand Dev repositories', exact: true })
        .click()
      await page
        .getByRole('button', {
          name: 'Expand monorepo repositories',
          exact: true
        })
        .click()
      await page.getByRole('button', { name: /^tools\/cli/ }).waitFor()
    }
  ],
  [
    'effort',
    async (page) => {
      await selectPanel(page, 'Models')
      await page.locator('tbody button[aria-pressed]').first().click()
    }
  ],
  [
    'dark-settings',
    async (page) => {
      await page.getByRole('button', { name: 'Settings', exact: true }).click()
      await page.getByRole('radio', { name: 'Dark', exact: true }).click()
    }
  ]
]
try {
  const environment = { ...process.env }
  delete environment.ELECTRON_RUN_AS_NODE
  electron = await _electron.launch({
    executablePath: executable,
    args: [join(directory, 'electron-main.cjs')],
    env: environment,
    timeout: 15000
  })
  const nativePage = await electron.firstWindow()
  const locale = await nativePage.evaluate(
    () => Intl.DateTimeFormat().resolvedOptions().locale
  )
  const timezoneId = await nativePage.evaluate(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  browser = await launchBrowser({ ignoreDefaultArgs: ['--hide-scrollbars'] })
  const context = await browser.newContext({
    viewport: { width: 1200, height: 720 },
    deviceScaleFactor: 1,
    locale,
    timezoneId,
    reducedMotion: 'reduce'
  })
  const sitePage = await context.newPage()
  for (const page of [nativePage, sitePage]) {
    page.setDefaultTimeout(10000)
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type()))
        errors.push(message.text())
    })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.clock.setFixedTime(new Date('2026-10-09T12:00:00.000Z'))
  }
  for (const size of [
    { width: 1200, height: 720 },
    { width: 860, height: 600 }
  ]) {
    await electron.evaluate(
      ({ BrowserWindow }, size) =>
        BrowserWindow.getAllWindows()[0].setContentSize(
          size.width,
          size.height
        ),
      size
    )
    await sitePage.setViewportSize(size)
    for (const [name, activate] of scenes) {
      await nativePage.goto(address(referenceServer))
      await sitePage.goto(
        `${address(siteServer)}preview/index.html?clock=2026-10-09T12%3A00%3A00.000Z`
      )
      for (const page of [nativePage, sitePage]) {
        await page
          .getByRole('button', { name: 'Search skills', exact: false })
          .waitFor()
        await page.locator('body').evaluate(() => document.fonts.ready)
        await activate(page)
        // Browser screenshots hide carets by default; Electron capturePage does not.
        await page.addStyleTag({
          content: 'input, textarea { caret-color: transparent !important; }'
        })
        await page.mouse.move(0, 0)
        await page.waitForTimeout(250)
      }
      const label = `${name}-${size.width}`
      const nativeBytes = await electron.evaluate(async ({ BrowserWindow }) => {
        const image =
          await BrowserWindow.getAllWindows()[0].webContents.capturePage(
            undefined,
            { stayHidden: true, stayAwake: true }
          )
        return image.toPNG().toString('base64')
      })
      const nativeBuffer = Buffer.from(nativeBytes, 'base64')
      await writeFile(join(directory, `${label}-app.png`), nativeBuffer)
      const native = PNG.sync.read(nativeBuffer)
      const candidate = PNG.sync.read(
        await sitePage.screenshot({
          path: join(directory, `${label}-website.png`)
        })
      )
      assert.deepEqual(
        { width: native.width, height: native.height },
        { width: candidate.width, height: candidate.height }
      )
      const difference = new PNG({ width: native.width, height: native.height })
      const pixels = pixelmatch(
        native.data,
        candidate.data,
        difference.data,
        native.width,
        native.height,
        { threshold: 0, includeAA: true }
      )
      await writeFile(
        join(directory, `${label}-diff.png`),
        PNG.sync.write(difference)
      )
      results.push({
        scene: label,
        pixels,
        fraction: pixels / (native.width * native.height)
      })
      console.log(`${label}: ${pixels} differing pixels`)
    }
  }
  assert.deepEqual(
    errors,
    [],
    'Reference and website must have no browser errors.'
  )
  await writeFile(
    join(directory, 'results.json'),
    JSON.stringify(
      {
        revision,
        clock: '2026-10-09T12:00:00.000Z',
        locale,
        timezoneId,
        deviceScaleFactor: 1,
        sizes: [1200, 860],
        results,
        errors
      },
      null,
      2
    )
  )
  if (results.some((result) => result.pixels !== 0)) process.exitCode = 1
} finally {
  await electron?.close()
  await browser?.close()
  await Promise.all([
    new Promise((done) => referenceServer.httpServer.close(done)),
    new Promise((done) => siteServer.httpServer.close(done))
  ])
}
