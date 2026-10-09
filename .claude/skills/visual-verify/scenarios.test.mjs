import assert from 'node:assert/strict'
import test from 'node:test'
import { scenarios } from './scenarios.mjs'

const KNOWN_SCREENS = new Set([
  'hero',
  'demo-skills',
  'demo-plugins',
  'demo-usage',
  'features',
  'analytics',
  'local',
  'faq',
  'install',
  'navigation'
])

test('every scenario has a non-empty name and run function', () => {
  assert.ok(scenarios.length > 0, 'should have defined scenarios')
  for (const scenario of scenarios) {
    assert.ok(scenario.name, 'scenario must have a name')
    assert.equal(typeof scenario.name, 'string')
    assert.match(scenario.name, /^[a-z0-9-]+$/, `${scenario.name} must be slug-formatted`)
    assert.equal(typeof scenario.run, 'function', `${scenario.name} must have a run function`)
  }
})

test('scenario names are unique', () => {
  const names = new Set()
  for (const scenario of scenarios) {
    assert.ok(!names.has(scenario.name), `Duplicate scenario name: ${scenario.name}`)
    names.add(scenario.name)
  }
})

test('every scenario has valid screen tag(s)', () => {
  for (const scenario of scenarios) {
    const screens = [].concat(scenario.screen)
    assert.ok(screens.length > 0, `${scenario.name} must have at least one screen tag`)
    for (const s of screens) {
      assert.ok(KNOWN_SCREENS.has(s), `Unknown screen tag "${s}" in scenario ${scenario.name}`)
    }
  }
})

test('mobile-navigation shouldSkip behavior handles viewports', async () => {
  const mobileNav = scenarios.find((s) => s.name === 'mobile-navigation')
  assert.ok(mobileNav, 'mobile-navigation scenario should exist')
  assert.equal(typeof mobileNav.shouldSkip, 'function')

  const desktopSkip = await mobileNav.shouldSkip(null, { width: 1440, height: 1000 })
  assert.ok(desktopSkip !== null, 'desktop should skip mobile navigation')

  const mobileSkip = await mobileNav.shouldSkip(null, { width: 375, height: 812 })
  assert.equal(mobileSkip, null, 'mobile should not skip mobile navigation')
})
