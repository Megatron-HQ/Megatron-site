import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const DEFAULT_PREVIEW_PORT = 4173
const MAXIMUM_PORT = 65535
const PREVIEW_HOST = '127.0.0.1'
const PREVIEW_START_TIMEOUT_MS = 15_000
const REQUEST_TIMEOUT_MS = 1000
const READINESS_POLL_INTERVAL_MS = 200

function resolvePreviewPort(environment) {
  const port = Number(
    environment.MEGATRON_CI_PREVIEW_PORT ?? DEFAULT_PREVIEW_PORT
  )
  if (!Number.isInteger(port) || port < 1 || port > MAXIMUM_PORT) {
    throw new Error(
      'MEGATRON_CI_PREVIEW_PORT must be an integer between 1 and 65535.'
    )
  }
  return port
}

async function assertPortAvailable(port) {
  const probe = createServer()
  await new Promise((resolve, reject) => {
    probe.once('error', reject)
    probe.listen(port, PREVIEW_HOST, () => {
      probe.close((error) => (error ? reject(error) : resolve()))
    })
  })
}

function startNodeProcess(argumentsList, repositoryRoot, environment) {
  return spawn(process.execPath, argumentsList, {
    cwd: repositoryRoot,
    env: environment,
    stdio: 'inherit',
    windowsHide: true
  })
}

async function waitForPreview(preview, baseUrl) {
  const deadline = Date.now() + PREVIEW_START_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (preview.exitCode !== null || preview.signalCode !== null) {
      throw new Error(
        `Preview exited before becoming ready (status ${preview.exitCode ?? preview.signalCode}).`
      )
    }
    try {
      const response = await fetch(baseUrl, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
      await response.arrayBuffer()
      if (response.status === 200) return
    } catch (error) {
      if (!(error instanceof TypeError) && error.name !== 'TimeoutError')
        throw error
    }
    await delay(READINESS_POLL_INTERVAL_MS)
  }
  throw new Error(
    `Preview did not become ready within ${PREVIEW_START_TIMEOUT_MS}ms.`
  )
}

async function stopPreview(preview) {
  if (preview.exitCode !== null || preview.signalCode !== null) return
  const exited = once(preview, 'exit')
  preview.kill()
  await exited
}

async function runProductionQa() {
  const repositoryRoot = process.cwd()
  const port = resolvePreviewPort(process.env)
  const baseUrl = `http://${PREVIEW_HOST}:${port}/`
  await assertPortAvailable(port)

  const preview = startNodeProcess(
    [
      join(repositoryRoot, 'node_modules/vite/bin/vite.js'),
      'preview',
      '--host',
      PREVIEW_HOST,
      '--port',
      String(port),
      '--strictPort'
    ],
    repositoryRoot,
    process.env
  )
  try {
    await waitForPreview(preview, baseUrl)
    const verification = startNodeProcess(
      [join(repositoryRoot, 'scripts/qa/verify.mjs')],
      repositoryRoot,
      { ...process.env, MEGATRON_TEST_URL: baseUrl }
    )
    const [exitCode, signal] = await once(verification, 'exit')
    if (signal) throw new Error(`QA verification was terminated by ${signal}.`)
    return exitCode
  } finally {
    await stopPreview(preview)
  }
}

try {
  process.exitCode = await runProductionQa()
} catch (error) {
  console.error('[ci:qa] failed:', error)
  process.exitCode = 1
}
