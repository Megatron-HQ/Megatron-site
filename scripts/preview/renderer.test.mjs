import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

async function tooling() {
  try {
    return await import('./renderer.mjs')
  } catch (error) {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
    assert.fail('Renderer provenance tooling is not implemented.')
  }
}

test('a renderer snapshot detects changed and unexpected files without a sibling checkout', async (context) => {
  const { verifySnapshot, writeManifest } = await tooling()
  const directory = await mkdtemp(join(tmpdir(), 'megatron-renderer-test-'))
  context.after(() => rm(directory, { recursive: true, force: true }))
  await mkdir(join(directory, 'src'), { recursive: true })
  await writeFile(join(directory, 'src', 'view.tsx'), 'export const view = 1\n')
  await writeManifest(directory, {
    revision: 'sample-revision',
    version: '0.1.0',
    upstreamHashes: {},
    patches: []
  })
  await verifySnapshot(directory)
  await writeFile(join(directory, 'src', 'view.tsx'), 'export const view = 2\n')
  await assert.rejects(() => verifySnapshot(directory), /modified.*view\.tsx/i)
  await writeFile(join(directory, 'src', 'view.tsx'), 'export const view = 1\n')
  await writeFile(
    join(directory, 'src', 'unexpected.ts'),
    'export const extra = true\n'
  )
  await assert.rejects(
    () => verifySnapshot(directory),
    /unexpected.*unexpected\.ts/i
  )
  assert.ok(
    JSON.parse(await readFile(join(directory, 'provenance.json'), 'utf8'))
      .files['src/view.tsx']
  )
})
