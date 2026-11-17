import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import { preview } from 'vite'
import { launchBrowser } from '../../.claude/skills/visual-verify/browser-launch.mjs'

const executeFile = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, '../..')
const productionOrigin = 'https://www.getmegatron.app'
const analyticsScript = '/_observability/analytics/script.js'
const performanceScript = '/_observability/performance/script.js'
const clientConfiguration = JSON.stringify({
  analytics: {
    scriptSrc: analyticsScript,
    viewEndpoint: '/_observability/analytics/view',
    eventEndpoint: '/_observability/analytics/event'
  },
  speedInsights: {
    scriptSrc: performanceScript,
    endpoint: '/_observability/performance/vitals'
  }
})
const sdkScripts = 'script[data-sdkn^="@vercel/"]'

async function buildWebsite(deploymentEnvironment) {
  await mkdir(join(repositoryRoot, '.qa'), { recursive: true })
  const directory = await mkdtemp(join(repositoryRoot, '.qa/observability-'))
  const environment = { ...process.env }
  delete environment.VERCEL_ENV
  delete environment.VERCEL_OBSERVABILITY_CLIENT_CONFIG
  if (deploymentEnvironment) environment.VERCEL_ENV = deploymentEnvironment
  environment.VERCEL_OBSERVABILITY_CLIENT_CONFIG = clientConfiguration

  try {
    await executeFile(
      process.execPath,
      ['node_modules/vite/bin/vite.js', 'build', '--outDir', directory],
      { cwd: repositoryRoot, env: environment, timeout: 120_000 }
    )
    const server = await preview({
      root: repositoryRoot,
      logLevel: 'silent',
      build: { outDir: directory },
      preview: { host: '127.0.0.1', port: 0, strictPort: false }
    })
    return {
      url: `http://127.0.0.1:${server.httpServer.address().port}`,
      async close() {
        await server.close()
        await rm(directory, { recursive: true, force: true })
      }
    }
  } catch (error) {
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}

async function openWebsite(browser, website, url = productionOrigin) {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  await context.route(`${productionOrigin}/**`, async (route) => {
    const requestUrl = new URL(route.request().url())
    if ([analyticsScript, performanceScript].includes(requestUrl.pathname)) {
      await route.fulfill({ contentType: 'text/javascript', body: '' })
      return
    }
    const response = await route.fetch({
      url: `${website.url}${requestUrl.pathname}${requestUrl.search}`
    })
    await route.fulfill({ response })
  })
  const page = await context.newPage()
  await page.goto(url)
  await page.locator('.hero-star-link svg').waitFor()
  return { context, page }
}

test('production marketing pages load both real SDKs with Vercel intake configuration', async (suite) => {
  const website = await buildWebsite('production')
  const browser = await launchBrowser()
  try {
    const { context, page } = await openWebsite(browser, website)
    try {
      await suite.test(
        'loads each SDK once through the configured first-party paths',
        async () => {
          assert.equal(await page.locator(sdkScripts).count(), 2)
          const analytics = page.locator(
            'script[data-sdkn="@vercel/analytics"]'
          )
          const performance = page.locator(
            'script[data-sdkn="@vercel/speed-insights"]'
          )
          assert.equal(await analytics.getAttribute('src'), analyticsScript)
          assert.equal(
            await analytics.getAttribute('data-view-endpoint'),
            '/_observability/analytics/view'
          )
          assert.equal(await performance.getAttribute('src'), performanceScript)
          assert.equal(
            await performance.getAttribute('data-endpoint'),
            '/_observability/performance/vitals'
          )
          assert.equal(await performance.getAttribute('data-sample-rate'), '1')
        }
      )

      await suite.test(
        'redacts queries and fragments without mutating pageview or vital events',
        async () => {
          const results = await page.evaluate(() => {
            const analyticsFilter = window.vaq?.find(
              ([action]) => action === 'beforeSend'
            )?.[1]
            const performanceFilter = window.siq?.find(
              ([action]) => action === 'beforeSend'
            )?.[1]
            return [analyticsFilter, performanceFilter].map((filter, index) => {
              if (!filter) return null
              const event = {
                type: index === 0 ? 'pageview' : 'vital',
                url: 'https://www.getmegatron.app/?token=private#installation',
                route: '/'
              }
              return {
                input: event.url,
                output: filter(event),
                original: event.url
              }
            })
          })
          assert.deepEqual(results, [
            {
              input: 'https://www.getmegatron.app/?token=private#installation',
              output: {
                type: 'pageview',
                url: 'https://www.getmegatron.app/',
                route: '/'
              },
              original:
                'https://www.getmegatron.app/?token=private#installation'
            },
            {
              input: 'https://www.getmegatron.app/?token=private#installation',
              output: {
                type: 'vital',
                url: 'https://www.getmegatron.app/',
                route: '/'
              },
              original:
                'https://www.getmegatron.app/?token=private#installation'
            }
          ])
        }
      )

      await suite.test(
        'filters sample pages, unknown origins, malformed URLs, and paid custom events',
        async () => {
          const results = await page.evaluate(() => {
            const filters = [window.vaq, window.siq].map(
              (queue) => queue?.find(([action]) => action === 'beforeSend')?.[1]
            )
            return filters.map((filter, index) => {
              if (!filter) return null
              const type = index === 0 ? 'pageview' : 'vital'
              return [
                {
                  type,
                  url: 'https://www.getmegatron.app/preview/index.html?panel=skills'
                },
                { type, url: 'https://unrelated.example/' },
                { type, url: 'not a URL' },
                { type: 'event', url: 'https://www.getmegatron.app/' }
              ].map((event) => filter(event))
            })
          })
          assert.deepEqual(results, [
            [null, null, null, null],
            [null, null, null, null]
          ])
        }
      )

      await suite.test(
        'does not initialize tracking in the actual sample iframe',
        async () => {
          const frame = page.frameLocator('#product-demo iframe')
          await frame.locator('body').waitFor()
          assert.equal(await frame.locator(sdkScripts).count(), 0)
        }
      )
    } finally {
      await context.close()
    }

    await suite.test(
      'does not initialize tracking when a production bundle is served locally',
      async () => {
        const { context, page } = await openWebsite(
          browser,
          website,
          website.url
        )
        try {
          assert.equal(await page.locator(sdkScripts).count(), 0)
        } finally {
          await context.close()
        }
      }
    )

    await suite.test(
      'does not initialize tracking when the marketing page is embedded',
      async () => {
        const { context, page } = await openWebsite(browser, website)
        try {
          await page.setContent(`<iframe src="${productionOrigin}/"></iframe>`)
          const frame = page.frameLocator('iframe')
          await frame.locator('.hero-star-link svg').waitFor()
          assert.equal(await frame.locator(sdkScripts).count(), 0)
        } finally {
          await context.close()
        }
      }
    )
  } finally {
    await browser.close()
    await website.close()
  }
})

for (const environment of ['preview', undefined]) {
  test(`${environment ?? 'local'} builds never initialize tracking on a production hostname`, async () => {
    const website = await buildWebsite(environment)
    const browser = await launchBrowser()
    try {
      const { context, page } = await openWebsite(browser, website)
      try {
        assert.equal(await page.locator(sdkScripts).count(), 0)
      } finally {
        await context.close()
      }
    } finally {
      await browser.close()
      await website.close()
    }
  })
}
