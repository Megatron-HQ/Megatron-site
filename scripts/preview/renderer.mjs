import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { execFileSync } from 'node:child_process'

export const SNAPSHOT_ROOT = resolve(
  import.meta.dirname,
  '../../vendor/megatron'
)
const PATCHES = [
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

function applyBrowserPatch(path, contents) {
  if (!PATCHES.some((patch) => patch.path === path)) return contents
  let text = contents.toString('utf8').replace(/\r\n/g, '\n')
  const replace = (needle, replacement) => {
    if (text.split(needle).length !== 2)
      throw new Error(`Upstream integration seam changed: ${path}`)
    text = text.replace(needle, replacement)
  }
  if (path.endsWith('/main.css')) {
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
      '  const nextToastId = useRef(0)\n  usePreviewNavigation(setSection, setUsagePanel)'
    )
  } else
    replace(
      '    if (!hasRows) return',
      '    if (!hasRows) return\n    if (window.parent !== window && !document.hasFocus()) return'
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
  const paths = [
    ...renderer
      .filter((path) => !/\.test\./.test(path))
      .map((path) => `src/renderer/src/${path}`),
    ...shared
      .filter((path) => !/\.test\./.test(path))
      .map((path) => `src/shared/${path}`),
    'src/preload/index.d.ts',
    'LICENSE'
  ]
  const upstreamHashes = {}
  for (const path of paths) {
    const contents = await readFile(join(source, path))
    upstreamHashes[path] = hash(contents)
    const output = join(target, path)
    await mkdir(dirname(output), { recursive: true })
    if (PATCHES.some((patch) => patch.path === path))
      await writeFile(output, applyBrowserPatch(path, contents))
    else await copyFile(join(source, path), output)
  }
  const revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {
    encoding: 'utf8'
  }).trim()
  const version = JSON.parse(
    await readFile(join(source, 'package.json'), 'utf8')
  ).version
  await writeManifest(target, {
    upstream: 'Megatron-HQ/Megatron',
    revision,
    version,
    upstreamHashes,
    patches: PATCHES
  })
  return verifySnapshot(target)
}
