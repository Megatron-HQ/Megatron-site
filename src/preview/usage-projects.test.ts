import assert from 'node:assert/strict'
import test from 'node:test'
import { createDemoApi } from './api.ts'
import { createSampleState, SAMPLE_PROJECT, SAMPLE_PARENT } from './fixtures.ts'
import { reconcileSampleUsageProjects } from './usage-projects.ts'

const NOW = new Date('2026-11-05T18:00:00.000Z')
const OLD_PROJECT = 'C:\\Archive\\web-app'

test('Windows aliases retain one Usage identity without absorbing sibling path prefixes', () => {
  const state = createSampleState(NOW)
  state.projects = [
    { path: 'c:/DEV/WEB-APP', kind: 'repository', status: 'available' }
  ]
  state.events = []
  state.history = []
  state.prompts = [
    {
      at: state.now,
      sessionId: 'nested',
      project: 'C:\\Dev\\web-app\\src',
      bareSlash: false,
      copies: 1
    },
    {
      at: state.now,
      sessionId: 'sibling',
      project: 'C:\\Dev\\web-application',
      bareSlash: false,
      copies: 1
    }
  ]
  const locations = reconcileSampleUsageProjects(
    [
      {
        id: 'windows-project',
        path: SAMPLE_PROJECT,
        kind: 'repository',
        status: 'available'
      }
    ],
    state
  )
  assert.equal(locations.length, 2)
  const project = locations.find(
    (location) => location.id === 'windows-project'
  )!
  assert.equal(project.path, 'c:/DEV/WEB-APP')
  assert.equal(project.status, 'available')
  const sibling = locations.find(
    (location) => location.path === 'C:\\Dev\\web-application'
  )!
  assert.ok(sibling)
  assert.equal(sibling.linkedTo, undefined)
})

test('POSIX Usage identities and access boundaries preserve path case', () => {
  const state = createSampleState(NOW)
  state.folders = [{ path: '/Users/vijay/Work', granted_at: state.now }]
  state.projects = [
    { path: '/Users/vijay/Work/Web', kind: 'repository', status: 'available' },
    { path: '/Users/vijay/Work/web', kind: 'repository', status: 'available' }
  ]
  state.events = []
  state.history = []
  state.prompts = [
    {
      at: state.now,
      sessionId: 'upper',
      project: '/Users/vijay/Work/Web/src',
      bareSlash: false,
      copies: 1
    },
    {
      at: state.now,
      sessionId: 'lower',
      project: '/Users/vijay/Work/web/src',
      bareSlash: false,
      copies: 1
    },
    {
      at: state.now,
      sessionId: 'outside',
      project: '/users/vijay/Work/web/src',
      bareSlash: false,
      copies: 1
    }
  ]
  const locations = reconcileSampleUsageProjects([], state)
  assert.equal(locations.length, 3)
  const upper = locations.find(
    (location) => location.path === '/Users/vijay/Work/Web'
  )!
  const lower = locations.find(
    (location) => location.path === '/Users/vijay/Work/web'
  )!
  assert.notEqual(upper.id, lower.id)
  assert.equal(upper.status, 'available')
  assert.equal(lower.status, 'available')
  const outside = locations.find(
    (location) => location.path === '/users/vijay/Work/web/src'
  )!
  assert.equal(outside.status, 'needs_access')
  assert.equal(outside.linkedTo, undefined)
  state.projects.reverse()
  const reordered = reconcileSampleUsageProjects(locations, state)
  assert.equal(
    reordered.find((location) => location.path === '/Users/vijay/Work/Web')!.id,
    upper.id
  )
  assert.equal(
    reordered.find((location) => location.path === '/Users/vijay/Work/web')!.id,
    lower.id
  )
})

test('a discovered nested repository keeps its identity and separates from inferred ownership', () => {
  const state = createSampleState(NOW)
  const childPath = `${SAMPLE_PROJECT}\\nested`
  state.projects = [
    { path: SAMPLE_PROJECT, kind: 'repository', status: 'available' },
    { path: childPath, kind: 'repository', status: 'available' }
  ]
  state.events = []
  state.prompts = []
  state.history = []
  const discovered = reconcileSampleUsageProjects(
    [
      {
        id: 'parent',
        path: SAMPLE_PROJECT,
        kind: 'repository',
        status: 'available'
      },
      {
        id: 'child',
        path: childPath,
        kind: 'folder',
        status: 'available',
        linkedTo: 'parent',
        inferredOwner: true
      }
    ],
    state
  )
  const child = discovered.find((location) => location.id === 'child')!
  assert.equal(child.kind, 'repository')
  assert.equal(child.linkedTo, undefined)
  assert.equal(child.inferredOwner, undefined)
  state.projects[1].kind = 'folder'
  assert.equal(
    reconcileSampleUsageProjects(discovered, state).find(
      (location) => location.id === 'child'
    )!.kind,
    'repository'
  )
})

function demo(options = {}) {
  const sample = createDemoApi({ now: NOW, actionDelayMs: 0, ...options })
  assert.equal(typeof sample.api.getUsageProjects, 'function')
  return sample
}

test('Usage retains independent same-name locations with stable identities and suggestions', async () => {
  const sample = demo()
  const catalog = await sample.api.getUsageProjects()
  const old = catalog.projects.find((project) => project.path === OLD_PROJECT)!
  const current = catalog.projects.find(
    (project) => project.path === SAMPLE_PROJECT
  )!
  assert.ok(old && current)
  assert.notEqual(old.label, current.label)
  assert.ok(old.possibleMatches.includes(current.id))
  assert.equal(old.locations.length, 1)
  assert.ok(catalog.projects.some((project) => project.path === SAMPLE_PARENT))
  old.label = 'Changed by caller'
  assert.notEqual(
    (await sample.api.getUsageProjects()).projects.find(
      (project) => project.id === old.id
    )!.label,
    old.label
  )
  await sample.simulateInventoryChange('delete-project')
  const later = (await sample.api.getUsageProjects()).locations.find(
    (location) => location.id === current.id
  )!
  assert.equal(later.path, SAMPLE_PROJECT)
  assert.equal(later.status, 'missing')
})

test('linking and unlinking changes every Usage aggregate without changing totals or inventory', async () => {
  const sample = demo()
  const catalog = await sample.api.getUsageProjects()
  const source = catalog.projects.find(
    (project) => project.path === OLD_PROJECT
  )!
  const target = catalog.projects.find(
    (project) => project.path === SAMPLE_PROJECT
  )!
  const before = await sample.api.getUsageOverview()
  const calendar = await sample.api.getUsageCalendar(2026)
  const inventory = await sample.api.listSkills()
  const grants = await sample.api.listAllowedPaths()
  const linked = await sample.api.linkUsageProjects({
    sourceId: source.id,
    targetId: target.id
  })
  assert.equal(linked.projects.length, catalog.projects.length - 1)
  assert.deepEqual(
    linked.projects
      .find((project) => project.id === target.id)!
      .locations.map((location) => location.path)
      .sort(),
    [OLD_PROJECT, SAMPLE_PROJECT].sort()
  )
  const after = await sample.api.getUsageOverview()
  for (const key of ['last24h', 'last7d', 'last30d'] as const) {
    assert.equal(after.activity[key].prompts, before.activity[key].prompts)
    assert.deepEqual(after.tokens[key].tokens, before.tokens[key].tokens)
    assert.equal(after.cost![key].totalCostUsd, before.cost![key].totalCostUsd)
    assert.ok(
      !after.activity[key].byProject.some(
        (project) => project.project === OLD_PROJECT
      )
    )
    assert.ok(
      !after.tokens[key].byProject.some(
        (project) => project.key === OLD_PROJECT
      )
    )
    assert.ok(
      !after.cost![key].byProject.some(
        (project) => project.project === OLD_PROJECT
      )
    )
    const sourceCount =
      before.activity[key].byProject.find(
        (project) => project.project === OLD_PROJECT
      )?.count ?? 0
    const targetCount =
      before.activity[key].byProject.find(
        (project) => project.project === SAMPLE_PROJECT
      )?.count ?? 0
    assert.equal(
      after.activity[key].byProject.find(
        (project) => project.project === SAMPLE_PROJECT
      )?.count ?? 0,
      sourceCount + targetCount
    )
    for (const day of after.activity[key].byDay)
      assert.ok(
        !day.byProject.some((project) => project.project === OLD_PROJECT)
      )
    for (const day of after.cost![key].byDay)
      assert.ok(
        !day.byProject.some((project) => project.project === OLD_PROJECT)
      )
  }
  assert.ok(
    before.activity.last30d.byProject.some(
      (project) => project.project === OLD_PROJECT && project.count > 0
    )
  )
  assert.ok(
    !(await sample.api.getUsageCalendar(2026)).byProject.some(
      (project) => project.project === OLD_PROJECT
    )
  )
  assert.deepEqual(await sample.api.listAllowedPaths(), grants)
  assert.deepEqual((await sample.api.listSkills()).skills, inventory.skills)
  await sample.api.unlinkUsageProject(source.id)
  assert.deepEqual(await sample.api.getUsageOverview(), before)
  assert.deepEqual(await sample.api.getUsageCalendar(2026), calendar)
})

test('Usage links survive lost inventory access but Reset restores separate sample identities', async () => {
  const sample = demo()
  const catalog = await sample.api.getUsageProjects()
  const source = catalog.projects.find(
    (project) => project.path === OLD_PROJECT
  )!
  const target = catalog.projects.find(
    (project) => project.path === SAMPLE_PROJECT
  )!
  await sample.api.linkUsageProjects({
    sourceId: source.id,
    targetId: target.id
  })
  await sample.api.revokeAllowedPath(SAMPLE_PARENT)
  const retained = await sample.api.getUsageProjects()
  assert.equal(
    retained.locations.find((location) => location.id === source.id)!.linkedTo,
    target.id
  )
  assert.equal(
    retained.locations.find((location) => location.id === target.id)!.status,
    'needs_access'
  )
  sample.reset()
  assert.equal(
    (await sample.api.getUsageProjects()).locations.find(
      (location) => location.id === source.id
    )!.linkedTo,
    undefined
  )
})

test('project mutations reject unknown IDs, self links, primary unlinking, and path payloads', async () => {
  const sample = demo()
  const catalog = await sample.api.getUsageProjects()
  const [first, second] = catalog.projects
  for (const input of [
    { sourceId: 'unknown', targetId: first.id },
    { sourceId: first.id, targetId: first.id },
    { sourceId: first.id, targetId: second.id, path: 'C:\\private' }
  ])
    await assert.rejects(sample.api.linkUsageProjects(input))
  await assert.rejects(sample.api.unlinkUsageProject(first.id))
  await assert.rejects(sample.api.unlinkUsageProject('unknown'))
  assert.deepEqual(await sample.api.getUsageProjects(), catalog)
})

test('Reset cancels pending project linking before it changes sample identity', async () => {
  const sample = demo({ actionDelayMs: 10 })
  const catalog = await sample.api.getUsageProjects()
  const [first, second] = catalog.projects
  const pending = sample.api.linkUsageProjects({
    sourceId: first.id,
    targetId: second.id
  })
  const result = assert.rejects(pending, /cancelled/i)
  sample.reset()
  await result
  assert.deepEqual(await sample.api.getUsageProjects(), catalog)
})
