import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { execFileSync } from 'node:child_process'

export const SNAPSHOT_ROOT = resolve(
  import.meta.dirname,
  '../../vendor/megatron'
)
const APP_BRAND_COMPONENT = 'components/AppBrand.tsx'
const APP_BRAND_ASSET = 'build/icon-source/icon.svg'
const PATCHES = [
  {
    path: 'src/shared/project-identity.ts',
    description:
      'Use an explicit TypeScript import extension so sample tests can use the desktop project identity helper.'
  },
  {
    path: 'src/shared/whats-new.ts',
    description:
      'Use explicit TypeScript import extensions so the sample can use the app’s release catalog in Node regression tests.'
  },
  {
    path: 'src/renderer/src/assets/main.css',
    description:
      'Limit Tailwind class discovery to the app renderer and browser adapter; keep all app tokens and rules.'
  },
  {
    path: 'src/renderer/src/App.tsx',
    description:
      'Subscribe to validated preview navigation without replacing app state or screens.'
  },
  {
    path: 'src/renderer/src/views/SkillInventory.tsx',
    description:
      'An inactive embedded frame must not autofocus and scroll the landing page on load.'
  },
  {
    path: 'src/renderer/src/views/PluginInventory.tsx',
    description:
      'An inactive embedded frame must not autofocus and scroll the landing page on load.'
  },
  {
    path: 'src/renderer/src/views/McpInventory.tsx',
    description:
      'An inactive embedded frame must not autofocus and scroll the landing page on load.'
  }
]

async function filesWithin(root, directory = root) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await filesWithin(root, path)))
    else if (entry.isFile())
      files.push(relative(root, path).split(sep).join('/'))
  }
  return files.sort()
}

function hash(contents) {
  return createHash('sha256').update(contents).digest('hex')
}

export async function writeManifest(root, metadata) {
  const files = {}
  for (const path of await filesWithin(root)) {
    if (path === 'provenance.json') continue
    files[path] = hash(await readFile(join(root, path)))
  }
  await writeFile(
    join(root, 'provenance.json'),
    `${JSON.stringify({ ...metadata, files }, null, 2)}\n`
  )
}

export async function verifySnapshot(root = SNAPSHOT_ROOT) {
  const manifest = JSON.parse(
    await readFile(join(root, 'provenance.json'), 'utf8')
  )
  const expected = new Set(Object.keys(manifest.files))
  for (const path of await filesWithin(root)) {
    if (path === 'provenance.json') continue
    if (!expected.delete(path))
      throw new Error(`Unexpected renderer file: ${path}`)
    if (hash(await readFile(join(root, path))) !== manifest.files[path])
      throw new Error(`Modified renderer file: ${path}`)
  }
  if (expected.size)
    throw new Error(`Missing renderer files: ${[...expected].join(', ')}`)
  return manifest
}

const INVENTORY_FOCUS_SEAM =
  '    if (containerRef.current?.contains(document.activeElement)) return'
const INACTIVE_FRAME_GUARD =
  '    if (window.parent !== window && !document.hasFocus()) return'

export function applyBrowserPatch(path, contents) {
  if (!PATCHES.some((patch) => patch.path === path)) return contents
  let text = contents.toString('utf8').replace(/\r\n/g, '\n')
  const replace = (needle, replacement) => {
    if (text.split(needle).length !== 2)
      throw new Error(`Upstream integration seam changed: ${path}`)
    text = text.replace(needle, replacement)
  }
  if (path === 'src/shared/project-identity.ts') {
    replace("from './project-path'", "from './project-path.ts'")
  } else if (path === 'src/shared/whats-new.ts') {
    replace("from './ipc'", "from './ipc.ts'")
    replace("from './version'", "from './version.ts'")
  } else if (path.endsWith('/main.css')) {
    replace(
      "@import 'tailwindcss';",
      "@import 'tailwindcss' source(none);\n@source '../';\n@source '../../../../../../src/preview';"
    )
  } else if (path.endsWith('/App.tsx')) {
    replace(
      "import { useEffect, useMemo, useRef, useState } from 'react'",
      "import { useEffect, useMemo, useRef, useState } from 'react'\nimport { usePreviewNavigation } from '@preview/navigation'"
    )
    replace(
      '  const nextToastId = useRef(0)',
      "  const nextToastId = useRef(0)\n  usePreviewNavigation(setSection, setUsagePanel, {\n    selectSkillSource: handleFilterChange,\n    selectPluginScope: handlePluginFilterChange,\n    selectMcpInventory: () => handleMcpFilterChange({ kind: 'all' }),\n    selectMcpServer: openMcpDetailFromUsage\n  })"
    )
  } else
    // The guard sits after the active-element check so a pending Back focus
    // restore stays pending until the frame is active.
    replace(
      INVENTORY_FOCUS_SEAM,
      `${INVENTORY_FOCUS_SEAM}\n${INACTIVE_FRAME_GUARD}`
    )
  return Buffer.from(text)
}

export async function syncRenderer(sourceRoot, destination = SNAPSHOT_ROOT) {
  const source = resolve(sourceRoot)
  const target = resolve(destination)
  if (target === source || target.startsWith(`${source}${sep}`))
    throw new Error(
      'Renderer snapshot must be separate from the app repository.'
    )
  const renderer = await filesWithin(join(source, 'src/renderer/src'))
  const shared = await filesWithin(join(source, 'src/shared'))
  const paths = new Set([
    ...renderer
      .filter((path) => !/\.test\./.test(path))
      .map((path) => `src/renderer/src/${path}`),
    ...shared
      .filter((path) => !/\.test\./.test(path))
      .map((path) => `src/shared/${path}`),
    ...(renderer.includes(APP_BRAND_COMPONENT) ? [APP_BRAND_ASSET] : []),
    'src/preload/index.d.ts',
    'LICENSE'
  ])
  const revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {
    encoding: 'utf8'
  }).trim()
  const version = JSON.parse(
    await readFile(join(source, 'package.json'), 'utf8')
  ).version
  const hasManifest = await readFile(join(target, 'provenance.json')).then(
    () => true,
    (error) => {
      if (error.code === 'ENOENT') return false
      throw error
    }
  )
  const previous = hasManifest ? await verifySnapshot(target) : null
  const upstreamHashes = {}
  const snapshot = new Map()
  for (const path of paths) {
    const contents = await readFile(join(source, path))
    upstreamHashes[path] = hash(contents)
    snapshot.set(path, applyBrowserPatch(path, contents))
  }
  for (const [path, contents] of snapshot) {
    const output = join(target, path)
    await mkdir(dirname(output), { recursive: true })
    await writeFile(output, contents)
  }
  for (const path of Object.keys(previous?.files ?? {})) {
    if (!paths.has(path)) await unlink(join(target, path))
  }
  await writeManifest(target, {
    upstream: 'Megatron-HQ/Megatron',
    revision,
    version,
    upstreamHashes,
    patches: PATCHES
  })
  return verifySnapshot(target)
}
