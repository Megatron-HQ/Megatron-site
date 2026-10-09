import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
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
    report: /no overflow or console\/page errors/
  },
  {
    name: 'console errors fail',
    script: 'console.error("fixture console error")',
    style: '',
    exitCode: 1,
    report: /fixture console error/
  },
  {
    name: 'console warnings fail',
    script: 'console.warn("fixture console warning")',
    style: '',
    exitCode: 1,
    report: /fixture console warning/
  },
  {
    name: 'uncaught page errors fail',
    script: 'throw new Error("fixture page error")',
    style: '',
    exitCode: 1,
    report: /fixture page error/
  },
  {
    name: 'horizontal overflow fails',
    script: '',
    style: 'body { width: 2000px }',
    exitCode: 1,
    report: /HORIZONTAL OVERFLOW/
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
      <script>${fixture.script}</script></body></html>`)
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
        resolve({ exitCode: error?.code ?? 0, output: stdout + stderr })
      }
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
        const screenshots = await readdir(
          join(fixture.directory, '.visual-verify')
        )
        assert.equal(
          screenshots.filter((filename) => filename.endsWith('.png')).length,
          4
        )
      })
    }
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    )
    await rm(fixture.directory, { recursive: true, force: true })
  }
})
