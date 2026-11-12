import assert from 'node:assert/strict'
import test from 'node:test'
import type { PluginRow, SkillRow } from '../../vendor/megatron/src/shared/ipc'
import { createDemoApi } from './api.ts'
import { DAY_MS, createSampleState, windowsPath } from './fixtures.ts'
import {
  findStaleSkillIds,
  sampleStaleEvidence,
  type StaleSkillEvidence
} from './stale-skills.ts'

const NOW = new Date('2026-10-18T12:00:00Z')
const PROJECT = windowsPath('C:', 'Dev', 'web-app')
const OTHER_PROJECT = windowsPath('C:', 'Dev', 'quiet-repo')
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * DAY_MS).toISOString()

function skillRow(id: number, extra: Partial<SkillRow> = {}): SkillRow {
  const base = createSampleState(NOW).skills[0]
  return {
    ...base,
    id,
    name: `skill-${id}`,
    source_type: 'global',
    plugin_name: null,
    project_root: null,
    disabled_reason: null,
    shadowed_by_skill_id: null,
    last_invoked_at: null,
    ...extra
  }
}

function evidence(extra: Partial<StaleSkillEvidence> = {}): StaleSkillEvidence {
  return {
    asOf: NOW.toISOString(),
    coverage: 'available',
    observations: [
      { project: PROJECT, at: daysAgo(90) },
      { project: PROJECT, at: daysAgo(2) }
    ],
    plugins: [],
    localSkillsExistedSince: daysAgo(400),
    ...extra
  }
}

test('a skill unused for 30 days while its scope was active is stale', () => {
  const stale = findStaleSkillIds(
    [skillRow(1), skillRow(2, { last_invoked_at: daysAgo(3) })],
    evidence()
  )
  assert.deepEqual([...stale], [1])
})

test('an invocation before the window does not keep a skill fresh', () => {
  const stale = findStaleSkillIds(
    [skillRow(1, { last_invoked_at: daysAgo(31) })],
    evidence()
  )
  assert.deepEqual([...stale], [1])
})

test('disabled and shadowed skills never get the stale signal', () => {
  const stale = findStaleSkillIds(
    [
      skillRow(1, { disabled_reason: 'override' }),
      skillRow(2, { shadowed_by_skill_id: 9 })
    ],
    evidence()
  )
  assert.equal(stale.size, 0)
})

test('a project skill needs activity in its own project on both sides of the window start', () => {
  const stale = findStaleSkillIds(
    [
      skillRow(1, { source_type: 'project', project_root: PROJECT }),
      skillRow(2, { source_type: 'project', project_root: OTHER_PROJECT })
    ],
    evidence({
      observations: [
        { project: PROJECT, at: daysAgo(90) },
        { project: PROJECT, at: daysAgo(2) },
        { project: OTHER_PROJECT, at: daysAgo(5) }
      ]
    })
  )
  assert.deepEqual([...stale], [1])
})

test('a skill that has not existed for the whole window gives no signal', () => {
  const plugin = {
    name: 'fresh',
    marketplace: 'sample',
    installs: [{ scope: 'user', project_path: null, installed_at: daysAgo(10) }]
  } as unknown as PluginRow
  const stale = findStaleSkillIds(
    [
      skillRow(1),
      skillRow(2, { source_type: 'plugin', plugin_name: 'fresh@sample' })
    ],
    evidence({ plugins: [plugin], localSkillsExistedSince: daysAgo(12) })
  )
  assert.equal(stale.size, 0)
})

test('incomplete history coverage turns every unknown into no signal', () => {
  for (const coverage of ['partial', 'unavailable'] as const)
    assert.equal(
      findStaleSkillIds([skillRow(1)], evidence({ coverage })).size,
      0
    )
})

test('the sample inventory derives its stale skills from the sample usage', async () => {
  const sample = createDemoApi({ now: NOW, actionDelayMs: 0 })
  const { skills } = await sample.api.listSkills()
  const stale = skills.filter((row) => row.stale)
  assert.ok(stale.length >= 2 && stale.length <= 5, `${stale.length} stale`)
  for (const row of stale) {
    assert.equal(row.disabled_reason, null)
    assert.equal(row.shadowed_by_skill_id, null)
    assert.ok(
      row.last_invoked_at === null ||
        Date.parse(row.last_invoked_at) < NOW.getTime() - 30 * DAY_MS
    )
  }
  assert.ok(
    !stale.some((row) => row.name === 'code-review'),
    'a frequently used skill is never stale'
  )
  assert.equal(
    sampleStaleEvidence(createSampleState(NOW)).coverage,
    'available'
  )
})

test('the stale signal disappears when sample prompt coverage is incomplete', async () => {
  const sample = createDemoApi({
    now: NOW,
    actionDelayMs: 0,
    scenario: 'activity-partial'
  })
  const { skills } = await sample.api.listSkills()
  assert.ok(skills.every((row) => row.stale === false))
})
