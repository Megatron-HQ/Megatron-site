import assert from 'node:assert/strict'
import test from 'node:test'
import { VIEWPORTS, getWindowSizes } from './window-sizes.mjs'

test('exports all four required responsive viewports', () => {
  assert.equal(VIEWPORTS.length, 4)
  const widths = VIEWPORTS.map((v) => v.width)
  assert.deepEqual(widths, [1440, 1024, 768, 375])
})

test('getWindowSizes returns all viewports by default', () => {
  const sizes = getWindowSizes()
  assert.equal(sizes.length, 4)
  assert.equal(sizes[0].label, 'desktop')
  assert.equal(sizes[3].label, 'mobile')
})

test('getWindowSizes filters by viewport label', () => {
  const desktopOnly = getWindowSizes('desktop')
  assert.equal(desktopOnly.length, 1)
  assert.equal(desktopOnly[0].width, 1440)

  const multi = getWindowSizes(['mobile', 'desktop'])
  assert.equal(multi.length, 2)
  assert.deepEqual(multi.map((v) => v.label), ['desktop', 'mobile'])
})

test('getWindowSizes filters by numeric width string', () => {
  const filtered = getWindowSizes(['375', '768'])
  assert.equal(filtered.length, 2)
  assert.deepEqual(filtered.map((v) => v.width), [768, 375])
})

test('all viewports have valid dimensions', () => {
  for (const vp of VIEWPORTS) {
    assert.ok(vp.width >= 320, `${vp.label} width should be >= 320`)
    assert.ok(vp.height >= 500, `${vp.label} height should be >= 500`)
  }
})
