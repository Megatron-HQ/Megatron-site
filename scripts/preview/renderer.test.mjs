import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

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

test('the imported renderer includes the SVG AppBrand loads', async () => {
  const { verifySnapshot } = await tooling()
  const manifest = await verifySnapshot()
  const asset = 'build/icon-source/icon.svg'
  assert.ok(manifest.files[asset], 'The snapshot is missing the AppBrand SVG.')
  assert.equal(manifest.files[asset], manifest.upstreamHashes[asset])
})

test('refreshing a snapshot removes renderer files deleted upstream', async (context) => {
  const { syncRenderer, verifySnapshot } = await tooling()
  const directory = await mkdtemp(join(tmpdir(), 'megatron-renderer-sync-'))
  context.after(() => rm(directory, { recursive: true, force: true }))
  const source = join(directory, 'desktop')
  const target = join(directory, 'snapshot')
  const files = {
    'src/renderer/src/OldDialog.tsx': 'export const old = true\n',
    'src/shared/example.ts': 'export const shared = true\n',
    'src/preload/index.d.ts': 'export {}\n',
    'package.json': '{"version":"0.4.0"}\n',
    LICENSE: 'Sample license\n'
  }
  for (const [path, contents] of Object.entries(files)) {
    const output = join(source, path)
    await mkdir(join(output, '..'), { recursive: true })
    await writeFile(output, contents)
  }
  const git = (...args) =>
    execFileSync('git', ['-C', source, ...args], { stdio: 'ignore' })
  const commit = () => {
    git('add', '--all')
    git(
      '-c',
      'user.name=Renderer Test',
      '-c',
      'user.email=test@example.invalid',
      'commit',
      '--no-gpg-sign',
      '--no-verify',
      '-qm',
      'Sample renderer'
    )
  }
  git('init', '--quiet')
  commit()
  await syncRenderer(source, target)
  await rm(join(source, 'src/renderer/src/OldDialog.tsx'))
  await writeFile(
    join(source, 'src/renderer/src/NewDialog.tsx'),
    'export const current = true\n'
  )
  await writeFile(join(source, 'package.json'), '{"version":"0.5.1"}\n')
  commit()

  const snapshot = await syncRenderer(source, target)
  assert.equal(snapshot.version, '0.5.1')
  assert.ok(snapshot.files['src/renderer/src/NewDialog.tsx'])
  assert.equal(snapshot.files['src/renderer/src/OldDialog.tsx'], undefined)
  await assert.rejects(
    readFile(join(target, 'src/renderer/src/OldDialog.tsx')),
    { code: 'ENOENT' }
  )
  await verifySnapshot(target)
})

const INVENTORY_FOCUS_SOURCE = `  const focusShownRows = useEffectEvent(() => {
    if (containerRef.current?.contains(document.activeElement)) return
    focusRow(0)
  })
`

for (const view of ['SkillInventory', 'PluginInventory', 'McpInventory']) {
  test(`${view} skips first-row focus while an embedded frame is inactive`, async () => {
    const { applyBrowserPatch } = await tooling()
    const patched = applyBrowserPatch(
      `src/renderer/src/views/${view}.tsx`,
      Buffer.from(INVENTORY_FOCUS_SOURCE)
    ).toString('utf8')
    const lines = patched.split('\n').map((line) => line.trim())
    const activeElementGuard = lines.indexOf(
      'if (containerRef.current?.contains(document.activeElement)) return'
    )
    assert.equal(
      lines[activeElementGuard + 1],
      'if (window.parent !== window && !document.hasFocus()) return'
    )
    assert.ok(activeElementGuard < lines.indexOf('focusRow(0)'))
  })
}

test('an inventory without the focus seam stops the import', async () => {
  const { applyBrowserPatch } = await tooling()
  assert.throws(
    () =>
      applyBrowserPatch(
        'src/renderer/src/views/SkillInventory.tsx',
        Buffer.from('    if (!hasRows) return\n')
      ),
    /integration seam changed/i
  )
})
