import assert from 'node:assert/strict'
import test from 'node:test'
import { createDemoApi } from './api.ts'
import { SAMPLE_PARENT, SAMPLE_PROJECT, windowsPath } from './fixtures.ts'

const NOW = new Date('2026-11-05T18:00:00.000Z')

function demo(options = {}) {
  const result = createDemoApi({ now: NOW, actionDelayMs: 0, ...options })
  assert.equal(typeof result.simulateInventoryChange, 'function')
  return result
}

test('sample file additions, edits and deletions reconcile inventory and reset restores it', async () => {
  const sample = demo()
  await sample.simulateInventoryChange('add-skill')
  await sample.simulateInventoryChange('add-skill')
  assert.equal((await sample.api.listSkills()).skills.length, 21)
  const added = (await sample.api.listSkills()).skills.filter(
    (row) => row.name === 'release-readiness'
  )
  assert.equal(added.length, 1)
  assert.equal(added[0].project_root, SAMPLE_PROJECT)
  await sample.simulateInventoryChange('edit-skill')
  const edited = await sample.api.openSkillMeta(15)
  assert.match(edited!.skill.description!, /rollback/)
  assert.match(edited!.skillMdContent!, /rollback/)
  await sample.simulateInventoryChange('delete-skill')
  assert.equal(await sample.api.openSkillMeta(15), null)
  await sample.api.pickAndAddFolders()
  assert.equal(
    await sample.api.openSkillMeta(15),
    null,
    'A new folder grant must not resurrect a deleted file.'
  )
  sample.reset()
  assert.equal((await sample.api.listSkills()).skills.length, 20)
  assert.equal(
    (await sample.api.openSkillMeta(15))!.skill.description,
    'Deploy the web application.'
  )
})

test('inventory changes publish only inventory sources and preserve token and prompt history', async () => {
  const sample = demo()
  const before = await sample.api.getUsageOverview()
  const calendar = await sample.api.getUsageCalendar(2026)
  const summaries: string[][] = []
  sample.api.onScanComplete(({ summary }) =>
    summaries.push(summary.sources.map((source) => source.name))
  )
  await sample.simulateInventoryChange('delete-project')
  assert.deepEqual(summaries, [
    ['scanSkills', 'scanPluginRegistry', 'runLinter']
  ])
  const after = await sample.api.getUsageOverview()
  assert.deepEqual(after.tokens, before.tokens)
  assert.deepEqual(await sample.api.getUsageCalendar(2026), calendar)
  assert.equal((await sample.api.listSkills()).scanSummary!.isStartup, false)
})

test('removing a discovered project prunes scoped installs and unshared plugin skills', async () => {
  const sample = demo()
  await sample.simulateInventoryChange('delete-project')
  assert.ok(
    !(await sample.api.listProjects()).some(
      (row) => row.path === SAMPLE_PROJECT
    )
  )
  assert.ok(
    !(await sample.api.listSkills()).skills.some(
      (row) => row.project_root === SAMPLE_PROJECT
    )
  )
  const frontend = (await sample.api.listPlugins()).find(
    (row) => row.name === 'frontend' && row.marketplace === 'team-tools'
  )!
  assert.deepEqual(
    frontend.installs.map((row) => row.scope),
    ['user']
  )
  assert.equal(frontend.skill_count, 1)
  await sample.api.pickAndAddFolders()
  assert.ok(
    !(await sample.api.listProjects()).some(
      (row) => row.path === SAMPLE_PROJECT
    )
  )
  assert.ok(
    (await sample.api.listProjects()).some(
      (row) => row.path === SAMPLE_PARENT && row.status === 'available'
    )
  )
})

test('moving a project rediscovers its skills without moving registry installs or usage history', async () => {
  const sample = demo()
  const calendar = await sample.api.getUsageCalendar(2026)
  await sample.simulateInventoryChange('move-project')
  const moved = windowsPath(SAMPLE_PARENT, 'web-app-renamed')
  const projects = await sample.api.listProjects()
  assert.ok(projects.some((row) => row.path === moved))
  assert.ok(!projects.some((row) => row.path === SAMPLE_PROJECT))
  const skills = (await sample.api.listSkills()).skills.filter(
    (row) => row.source_type === 'project'
  )
  assert.ok(
    skills.some(
      (row) =>
        row.project_root === moved && row.source_path.startsWith(moved + '\\')
    )
  )
  assert.ok(!skills.some((row) => row.project_root === SAMPLE_PROJECT))
  assert.ok(
    !(await sample.api.listPlugins())
      .flatMap((row) => row.installs)
      .some((row) => row.project_path === moved)
  )
  assert.deepEqual(await sample.api.getUsageCalendar(2026), calendar)
})

test('unavailable projects retain cached entries and warn only on the affected child', async () => {
  const sample = demo()
  const skills = (await sample.api.listSkills()).skills
  await sample.simulateInventoryChange('unavailable-project')
  const projects = await sample.api.listProjects()
  assert.deepEqual(
    projects
      .filter((row) => row.status === 'unavailable')
      .map((row) => row.path),
    [SAMPLE_PROJECT]
  )
  assert.equal(
    projects.find((row) => row.path === SAMPLE_PARENT)!.status,
    'available'
  )
  assert.deepEqual((await sample.api.listSkills()).skills, skills)
  const install = (await sample.api.getPluginDetail(
    'frontend',
    'team-tools'
  ))!.plugin.installs.find((row) => row.scope === 'project')!
  assert.equal(install.enablement_known, false)
  assert.equal(
    (
      await sample.api.disablePlugin({
        name: 'frontend',
        marketplace: 'team-tools',
        scope: 'project',
        projectPath: SAMPLE_PROJECT
      })
    ).ok,
    false
  )
  assert.equal((await sample.api.listSkills()).scanSummary!.outcome, 'partial')
})

test('missing explicitly granted projects retain cached inventory and a healthy parent', async () => {
  const sample = demo({ scenario: 'projects-missing' })
  assert.ok(
    (await sample.api.listAllowedPaths()).some(
      (row) => row.path === SAMPLE_PROJECT
    )
  )
  const projects = await sample.api.listProjects()
  assert.equal(
    projects.find((row) => row.path === SAMPLE_PROJECT)!.status,
    'missing'
  )
  assert.equal(
    projects.find((row) => row.path === SAMPLE_PARENT)!.status,
    'available'
  )
  await sample.simulateInventoryChange('delete-project')
  assert.ok(
    (await sample.api.listProjects()).some(
      (row) => row.path === SAMPLE_PROJECT && row.status === 'missing'
    )
  )
  assert.ok(
    (await sample.api.listSkills()).skills.some(
      (row) => row.project_root === SAMPLE_PROJECT
    )
  )
  assert.equal(
    (await sample.api.listSkills()).scanSummary!.sources.filter(
      (source) => source.name === 'scanSkills'
    ).length,
    1
  )
})

test('reset cancels pending inventory notifications and clears the simulated change', async () => {
  const notices: string[] = []
  const sample = demo({
    actionDelayMs: 10,
    onNotice: (message: string) => notices.push(message)
  })
  let finishes = 0
  sample.api.onScanComplete(() => {
    finishes += 1
  })
  const pending = sample.simulateInventoryChange('add-skill')
  sample.reset()
  const afterReset = finishes
  await pending
  assert.equal(finishes, afterReset)
  assert.equal((await sample.api.listSkills()).skills.length, 20)
  assert.deepEqual(notices, [])
})

test('unknown inventory actions fail before altering sample state', async () => {
  const sample = demo()
  await assert.rejects(
    sample.simulateInventoryChange('read-local-files' as never),
    /Unknown/
  )
  assert.equal((await sample.api.listSkills()).skills.length, 20)
})

test('a background summary is newer than the requested rescan it follows', async () => {
  const sample = demo()
  const manual = await sample.api.rescan()
  await sample.simulateInventoryChange('unavailable-project')
  const latest = (await sample.api.listSkills()).scanSummary!
  assert.ok(Date.parse(latest.completedAt) > Date.parse(manual.completedAt))
  assert.equal(latest.outcome, 'partial')
})
