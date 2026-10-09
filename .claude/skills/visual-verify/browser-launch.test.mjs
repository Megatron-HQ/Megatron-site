import assert from 'node:assert/strict'
import test from 'node:test'
import { browserLaunchOptions, resolveChromePath, getChromium } from './browser-launch.mjs'

test('resolveChromePath respects CHROME_PATH environment variable if valid', () => {
  const custom = import.meta.filename
  const resolved = resolveChromePath({ CHROME_PATH: custom })
  assert.equal(resolved, custom)
})

test('resolveChromePath ignores non-existent CHROME_PATH', () => {
  const resolved = resolveChromePath({ CHROME_PATH: '/non/existent/path/chrome.exe' })
  assert.notEqual(resolved, '/non/existent/path/chrome.exe')
})

test('browserLaunchOptions defaults to headless mode with sandbox args', () => {
  const options = browserLaunchOptions({}, {})
  assert.equal(options.headless, true)
  assert.ok(Array.isArray(options.args))
  assert.ok(options.args.includes('--no-sandbox'))
})

test('browserLaunchOptions allows overriding options', () => {
  const options = browserLaunchOptions({ headless: false, args: ['--custom'] }, {})
  assert.equal(options.headless, false)
  assert.deepEqual(options.args, ['--custom'])
})

test('getChromium resolves a launchable chromium instance', async () => {
  const chromium = await getChromium()
  assert.equal(typeof chromium.launch, 'function')
})
