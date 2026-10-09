import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import test from 'node:test'

const REPOSITORY_ROOT = resolve(import.meta.dirname, '../..')
const RUNNER_PATH = join(import.meta.dirname, 'verify-qa.mjs')

async function createFixture(exitCode, previewExits = false) {
  const fixtureParent = join(REPOSITORY_ROOT, '.qa')
  await mkdir(fixtureParent, { recursive: true })
  const directory = await mkdtemp(join(fixtureParent, 'ci-qa-test-'))
  await mkdir(join(directory, 'node_modules/vite/bin'), { recursive: true })
  await mkdir(join(directory, 'scripts/qa'), { recursive: true })
  await writeFile(join(directory, 'package.json'), '{"type":"module"}')
  await writeFile(
    join(directory, 'node_modules/vite/bin/vite.js'),
    `
import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'
if (${previewExits}) process.exit(3)
const port = Number(process.argv[process.argv.indexOf('--port') + 1])
createServer((request, response) => response.end('owned preview fixture'))
  .listen(port, '127.0.0.1', () => writeFileSync('preview.pid', String(process.pid)))
`
  )
  await writeFile(
    join(directory, 'scripts/qa/verify.mjs'),
    `
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
const response = await fetch(process.env.MEGATRON_TEST_URL)
assert.equal(await response.text(), 'owned preview fixture')
writeFileSync('qa-result.json', JSON.stringify({ url: process.env.MEGATRON_TEST_URL }))
process.exitCode = ${exitCode}
`
  )
  return directory
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  return server.address().port
}

async function close(server) {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
}

async function unusedPort() {
  const server = createServer()
  const port = await listen(server)
  await close(server)
  return port
}

function run(directory, port) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [RUNNER_PATH],
      {
        cwd: directory,
        env: { ...process.env, MEGATRON_CI_PREVIEW_PORT: String(port) },
        timeout: 20_000,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (error && typeof error.code !== 'number') {
          reject(error)
          return
        }
        resolve({ code: error?.code ?? 0, output: stdout + stderr })
      }
    )
  })
}

for (const exitCode of [0, 7]) {
  test(`CI QA starts a preview, returns verification status ${exitCode}, and releases its port`, async () => {
    const directory = await createFixture(exitCode)
    const port = await unusedPort()
    try {
      const result = await run(directory, port)
      assert.equal(result.code, exitCode, result.output)
      const recorded = JSON.parse(
        await readFile(join(directory, 'qa-result.json'), 'utf8')
      )
      assert.equal(recorded.url, `http://127.0.0.1:${port}/`)
      await assert.rejects(
        fetch(recorded.url, { signal: AbortSignal.timeout(1000) })
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
}

test('CI QA fails promptly when the preview exits before becoming ready', async () => {
  const directory = await createFixture(0, true)
  try {
    const result = await run(directory, await unusedPort())
    assert.equal(result.code, 1, result.output)
    assert.match(result.output, /Preview exited/)
    await assert.rejects(readFile(join(directory, 'qa-result.json')), {
      code: 'ENOENT'
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('CI QA refuses a busy port and leaves the existing server running', async () => {
  const directory = await createFixture(0)
  const server = createServer((request, response) =>
    response.end('existing server')
  )
  const port = await listen(server)
  try {
    const result = await run(directory, port)
    assert.equal(result.code, 1, result.output)
    assert.match(result.output, /EADDRINUSE/)
    assert.equal(
      await (await fetch(`http://127.0.0.1:${port}/`)).text(),
      'existing server'
    )
    await assert.rejects(readFile(join(directory, 'qa-result.json')), {
      code: 'ENOENT'
    })
  } finally {
    await close(server)
    await rm(directory, { recursive: true, force: true })
  }
})

test('CI QA rejects an invalid preview port before starting a process', async () => {
  const directory = await createFixture(0)
  try {
    for (const port of ['not-a-port', 0, 70000]) {
      const result = await run(directory, port)
      assert.equal(result.code, 1, result.output)
      assert.match(result.output, /MEGATRON_CI_PREVIEW_PORT/)
      await assert.rejects(readFile(join(directory, 'preview.pid')), {
        code: 'ENOENT'
      })
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
