import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import test from 'node:test'

const REPO_ROOT = resolve(import.meta.dirname, '../../..')
const CASES = [
  {
    name: 'clean pages succeed',
    script: '',
    style: '',
    exitCode: 0,
    report: /no overflow or console\/page errors/,
    screenshots: 8
  },
  {
    name: 'console errors fail',
    script: 'console.error("fixture console error")',
    style: '',
    exitCode: 1,
    report: /fixture console error/,
    screenshots: 8
  },
  {
    name: 'console warnings fail',
    script: 'console.warn("fixture console warning")',
    style: '',
    exitCode: 1,
    report: /fixture console warning/,
    screenshots: 8
  },
  {
    name: 'uncaught page errors fail',
    script: 'throw new Error("fixture page error")',
    style: '',
    exitCode: 1,
    report: /fixture page error/,
    screenshots: 8
  },
  {
    name: 'horizontal overflow fails',
    script: '',
    style: 'body { width: 2000px }',
    exitCode: 1,
    report: /HORIZONTAL OVERFLOW/,
    screenshots: 8
  },
  {
    // fixture-fail runs first, so the passing scenario's 4 screenshots prove the sweep continued.
    name: 'a failing scenario is reported and the sweep continues',
    script: '',
    style: '',
    body: '<div id="fail"></div>',
    exitCode: 1,
    report: /SCENARIO FAILURES[\s\S]*fixture scenario failure/,
    screenshots: 4,
    failedScreenshots: 4
  }
]

async function createFixture() {
  const outputParent = join(REPO_ROOT, '.qa')
  await mkdir(outputParent, { recursive: true })
  const directory = await mkdtemp(join(outputParent, 'visual-cli-test-'))
  const skillDirectory = join(directory, '.claude/skills/visual-verify')
  await mkdir(skillDirectory, { recursive: true })

  for (const filename of [
    'verify.mjs',
    'browser-launch.mjs',
    'select-scenarios.mjs',
    'window-sizes.mjs'
  ]) {
    await copyFile(
      join(import.meta.dirname, filename),
      join(skillDirectory, filename)
    )
  }
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({ type: 'module', scripts: { build: 'node build.mjs' } })
  )
  await writeFile(
    join(directory, 'build.mjs'),
    '// The fixture serves its controlled HTML directly.\n'
  )
  await writeFile(
    join(skillDirectory, 'scenarios.mjs'),
    `
export const scenarios = [{
  name: 'fixture-fail',
  screen: 'fixture',
  async run(page) {
    if (await page.locator('#fail').count()) throw new Error('fixture scenario failure')
  }
}, {
  name: 'fixture',
  screen: 'fixture',
  async run(page) { await page.locator('#hero-title').waitFor({ state: 'visible' }) }
}]
`
  )
  return { directory, verifier: join(skillDirectory, 'verify.mjs') }
}

async function startFixtureServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1')
    if (url.pathname === '/favicon.ico') {
      response.writeHead(204).end()
      return
    }
    const fixture = CASES[Number(url.searchParams.get('case'))]
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(`<!doctype html><html><head><style>${fixture.style}</style></head>
      <body><button id="preview-skills">Skills</button><h1 id="hero-title">Verifier fixture</h1>
      ${fixture.body ?? ''}<script>${fixture.script}</script></body></html>`)
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return server
}

function runVerifier(fixture, baseUrl) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [fixture.verifier],
      {
        cwd: fixture.directory,
        env: { ...process.env, MEGATRON_TEST_URL: baseUrl },
        timeout: 45_000,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (error && typeof error.code !== 'number') {
          reject(error)
          return
        }
        resolve({ exitCode: error?.code ?? 0, stdout, output: stdout + stderr })
      }
    )
  })
}

// The verdict must be the last stdout line so `| tail` can't hide it.
const verdict = (result) => result.stdout.trim().split('\n').at(-1)

async function countPngs(directory) {
  const files = await readdir(directory).catch(() => [])
  return files.filter((filename) => filename.endsWith('.png')).length
}

async function exitedPid() {
  return new Promise((resolve, reject) => {
    const child = execFile(process.execPath, ['-e', ''], (error) =>
      error ? reject(error) : resolve(child.pid)
    )
  })
}

test('visual verification CLI reports actual browser defects through its exit status', async (context) => {
  const fixture = await createFixture()
  const server = await startFixtureServer()
  try {
    for (const [index, fixtureCase] of CASES.entries()) {
      await context.test(fixtureCase.name, async () => {
        const url = `http://127.0.0.1:${server.address().port}/?case=${index}`
        const result = await runVerifier(fixture, url)
        assert.match(result.output, fixtureCase.report, result.output)
        assert.equal(result.exitCode, fixtureCase.exitCode, result.output)
        assert.match(
          verdict(result),
          fixtureCase.exitCode === 0 ? /RESULT: PASS/ : /RESULT: FAIL/,
          result.output
        )
        assert.equal(
          await countPngs(join(fixture.directory, '.visual-verify')),
          fixtureCase.screenshots
        )
        assert.equal(
          await countPngs(join(fixture.directory, '.visual-verify/failed')),
          fixtureCase.failedScreenshots ?? 0
        )
      })
    }

    const cleanUrl = `http://127.0.0.1:${server.address().port}/?case=0`
    const lock = join(fixture.directory, '.visual-verify.lock')

    await context.test(
      'an unreachable MEGATRON_TEST_URL fails instead of falling back',
      async () => {
        const closed = createServer()
        await new Promise((resolve) => closed.listen(0, '127.0.0.1', resolve))
        const { port } = closed.address()
        await new Promise((resolve) => closed.close(resolve))

        const result = await runVerifier(fixture, `http://127.0.0.1:${port}/`)
        assert.equal(result.exitCode, 1, result.output)
        assert.match(result.output, /not reachable/, result.output)
        assert.match(verdict(result), /RESULT: FAIL/, result.output)
      }
    )

    await context.test(
      'a live lock refuses the run and leaves the lock alone',
      async () => {
        await writeFile(lock, String(process.pid))
        try {
          const result = await runVerifier(fixture, cleanUrl)
          assert.equal(result.exitCode, 1, result.output)
          assert.match(
            result.output,
            new RegExp(`already running.*pid ${process.pid}`),
            result.output
          )
          assert.match(verdict(result), /RESULT: FAIL/, result.output)
          assert.equal(await readFile(lock, 'utf8'), String(process.pid))
        } finally {
          await rm(lock, { force: true })
        }
      }
    )

    await context.test(
      'a stale lock is replaced and released after the run',
      async () => {
        await writeFile(lock, String(await exitedPid()))
        const result = await runVerifier(fixture, cleanUrl)
        assert.equal(result.exitCode, 0, result.output)
        assert.match(verdict(result), /RESULT: PASS/, result.output)
        await assert.rejects(readFile(lock), { code: 'ENOENT' })
      }
    )
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    )
    await rm(fixture.directory, { recursive: true, force: true })
  }
})
