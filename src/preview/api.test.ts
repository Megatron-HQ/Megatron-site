import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ADDITIONAL_PARENT,
  ADDITIONAL_PROJECT,
  EMPTY_PROJECT,
  NESTED_PROJECT,
  SAMPLE_PARENT,
  SAMPLE_PROJECT
} from './fixtures.ts'
import { isWithinProjectPath } from '../../vendor/megatron/src/shared/project-path.ts'

test('context baseline is independent of session usage and separates deferred and reserved space', async () => {
  const { api } = await createDemo({ scenario: 'usage-empty' })
  assert.equal(typeof api.getContextBaseline, 'function')
  const result = await api.getContextBaseline()
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.usage.totalTokens, 32000)
  assert.equal(result.usage.windowTokens, 1000000)
  assert.equal(
    result.usage.categories
      .filter((row) => row.group === 'used')
      .reduce((sum, row) => sum + row.tokens, 0),
    32000
  )
  assert.ok(
    result.usage.categories.some(
      (row) => row.group === 'deferred' && row.tokens > 0
    )
  )
  assert.ok(
    result.usage.categories.some(
      (row) => row.group === 'buffer' && row.tokens > 0
    )
  )
  assert.ok(
    result.usage.categories.some(
      (row) => row.group === 'free' && row.tokens > 0
    )
  )
  result.usage.categories[0].name = 'Changed by caller'
  const next = await api.getContextBaseline()
  assert.ok(next.ok && next.usage.categories[0].name !== 'Changed by caller')
})

test('recorded context contains self-consistent synthetic request details without sharing mutable data', async () => {
  const { api } = await createDemo()
  assert.equal(typeof api.getRecordedRequest, 'function')
  const request = await api.getRecordedRequest()
  assert.ok(request)
  assert.equal(request.cwd, SAMPLE_PROJECT)
  for (const block of [
    ...request.systemBlocks,
    ...request.hookOutputs,
    ...request.mcpInstructions
  ])
    assert.equal(block.chars, block.text.length)
  for (const tool of request.tools)
    assert.equal(
      tool.chars,
      JSON.stringify(JSON.parse(tool.definitionJson)).length
    )
  assert.ok(
    request.tools.every(
      (tool, index, rows) => index === 0 || rows[index - 1].chars >= tool.chars
    )
  )
  assert.ok(request.cacheBreakpoints.some((row) => row.path === 'system[1]'))
  request.systemBlocks[0].text = 'Changed by caller'
  assert.notEqual(
    (await api.getRecordedRequest())!.systemBlocks[0].text,
    'Changed by caller'
  )
})

test('context measurement distinguishes CLI failure, unreadable output, and unavailable recordings', async () => {
  for (const scenario of ['context-unavailable', 'context-unreadable']) {
    const { api } = await createDemo({ scenario })
    assert.equal(typeof api.getContextBaseline, 'function')
    const result = await api.getContextBaseline()
    assert.equal(result.ok, false)
    if (result.ok) continue
    assert.ok(result.error.length > 0)
    assert.equal(
      typeof result.raw === 'string',
      scenario === 'context-unreadable'
    )
  }
  const { api } = await createDemo({ scenario: 'recorded-empty' })
  assert.equal(typeof api.getRecordedRequest, 'function')
  assert.equal(await api.getRecordedRequest(), null)
})

test('reset suppresses notices from a pending context measurement', async () => {
  const notices: string[] = []
  const { api, reset } = await createDemo({
    actionDelayMs: 10,
    onNotice: (message: string) => notices.push(message)
  })
  assert.equal(typeof api.getContextBaseline, 'function')
  const pending = api.getContextBaseline()
  reset()
  await pending
  assert.equal(notices.length, 0)
  await api.getContextBaseline()
  assert.equal(notices.length, 1)
  assert.match(notices[0], /sample|synthetic/i)
})

test('missing project scans retain cached projects and distinguish genuine warnings', async () => {
  const { api } = await createDemo({ scenario: 'projects-missing' })
  const result = await api.rescan()
  assert.equal(result.outcome, 'partial')
  const issues = result.sources.flatMap((source) => source.issues ?? [])
  assert.ok(issues.length > 0)
  assert.ok(issues.every((issue) => issue.code === 'project_missing'))
  assert.ok(result.projects!.every((project) => project.status === 'missing'))
  const mixed = await createDemo({ scenario: 'projects-missing-warning' })
  assert.equal((await mixed.api.listSkills()).scanSummary?.isStartup, true)
  mixed.reset()
  assert.equal((await mixed.api.listSkills()).scanSummary?.isStartup, true)
  const warning = await mixed.api.rescan()
  assert.equal(warning.isStartup, false)
  assert.ok(
    warning.sources.some((source) =>
      source.issues?.some((issue) => issue.code === 'permission_required')
    )
  )
})

test('rescans publish archive progress before finishing the matching run', async () => {
  const { api } = await createDemo({ actionDelayMs: 1 })
  assert.equal(typeof api.onScanProgress, 'function')
  const events: { type: string; id: number; source?: string }[] = []
  api.onScanStarted(({ id }) => events.push({ type: 'start', id }))
  const unsubscribe = api.onScanProgress(({ id, source }) => {
    events.push({ type: 'progress', id, source: source.name })
    source.name = 'Changed by subscriber'
  })
  api.onScanComplete(({ id }) => events.push({ type: 'finish', id }))
  const scan = api.rescan()
  const activity = (await api.listSkills()).scanActivity!
  const summary = await scan
  assert.deepEqual(events, [
    { type: 'start', id: activity.id },
    { type: 'progress', id: activity.id, source: 'scanTranscripts' },
    { type: 'progress', id: activity.id, source: 'archiveTokens' },
    { type: 'progress', id: activity.id, source: 'scanPromptHistory' },
    { type: 'progress', id: activity.id, source: 'archivePrompts' },
    { type: 'finish', id: activity.id }
  ])
  assert.equal(summary.isStartup, false)
  assert.equal(summary.sources[1].name, 'archiveTokens')
  assert.equal((await api.listSkills()).scanActivity, null)
  unsubscribe()
  events.length = 0
  await api.rescan()
  assert.deepEqual(
    events.map((event) => event.type),
    ['start', 'finish']
  )
})

test('reset cancels archive progress and completion from a pending rescan', async () => {
  const { api, reset } = await createDemo({ actionDelayMs: 10 })
  assert.equal(typeof api.onScanProgress, 'function')
  let progressCount = 0
  const finishedIds: number[] = []
  api.onScanProgress(() => {
    progressCount += 1
  })
  api.onScanComplete(({ id }) => finishedIds.push(id))
  const scan = api.rescan()
  const pendingId = (await api.listSkills()).scanActivity!.id
  reset()
  await scan
  assert.equal(progressCount, 0)
  assert.ok(!finishedIds.includes(pendingId))
  assert.equal((await api.listSkills()).scanActivity, null)
})

test('usage history agrees with Activity and survives sample rescans and reset', async () => {
  const { api, reset } = await createDemo()
  assert.equal(typeof api.getUsageCalendar, 'function')
  assert.equal(typeof api.getUsageDay, 'function')
  const overview = await api.getUsageOverview()
  assert.ok(overview.tokens.last30d.tokens!.total > 0)
  const calendar = await api.getUsageCalendar(2026)
  const day = await api.getUsageDay('2026-10-08')
  assert.equal(
    day.count,
    calendar.days.find((row) => row.date === day.date)?.count
  )
  assert.equal(
    day.count,
    overview.activity.last7d.byDay.find((row) => row.date === day.date)?.count
  )
  day.count = -1
  calendar.days[0].count = -1
  assert.ok((await api.getUsageDay('2026-10-08')).count > 0)
  await api.rescan()
  reset()
  assert.equal((await api.getUsageCalendar(2026)).prompts, calendar.prompts)
  await assert.rejects(api.getUsageCalendar(2026.5), RangeError)
  await assert.rejects(api.getUsageDay('2026-02-30'), RangeError)
})

test('empty Usage has no archived activity or token totals', async () => {
  const { api } = await createDemo({ scenario: 'usage-empty' })
  assert.equal(typeof api.getUsageCalendar, 'function')
  assert.equal((await api.getUsageOverview()).tokens.last30d.tokens, null)
  assert.equal((await api.getUsageCalendar(2026)).prompts, 0)
})

test('plugin update progress identifies its install and unsubscribes after completion', async () => {
  const { api } = await createDemo()
  assert.equal(typeof api.onPluginUpdateProgress, 'function')
  const phases: string[] = []
  const input = {
    name: 'frontend',
    marketplace: 'team-tools',
    scope: 'user',
    projectPath: null
  } as const
  const unsubscribe = api.onPluginUpdateProgress((progress) => {
    assert.deepEqual(progress.input, input)
    phases.push(progress.phase)
  })
  assert.equal((await api.updatePlugin(input)).ok, true)
  assert.deepEqual(phases, ['marketplace', 'install', 'verify'])
  unsubscribe()
  await api.updatePlugin(input)
  assert.equal(phases.length, 3)
})

async function createDemo(options: Record<string, unknown> = {}) {
  let module
  try {
    module = await import('./api.ts')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ERR_MODULE_NOT_FOUND')
      throw error
    assert.fail('The browser sample API has not been implemented.')
  }
  return module.createDemoApi({
    now: new Date('2026-10-09T18:00:00Z'),
    actionDelayMs: 0,
    ...options
  })
}

test('inventory snapshots cannot mutate the next API response', async () => {
  const { api } = await createDemo()
  const first = await api.listSkills()
  assert.ok(first.skills.length >= 12)
  first.skills[0].name = 'changed by caller'
  assert.notEqual((await api.listSkills()).skills[0].name, 'changed by caller')
})

test('budget excludes project, disabled, and user-only listings in separate buckets', async () => {
  const { api } = await createDemo()
  const { skills, contextBudget } = await api.listSkills()
  const eligible = skills.filter((skill) => skill.source_type !== 'project')
  assert.equal(
    contextBudget.used,
    eligible
      .filter(
        (skill) => skill.disabled_reason === null && skill.model_invocable === 1
      )
      .reduce((sum, skill) => sum + skill.est_listing_tokens, 0)
  )
  assert.equal(
    contextBudget.excludedCount,
    eligible.filter((skill) => skill.disabled_reason !== null).length
  )
  assert.equal(
    contextBudget.userInvocableOnlyCount,
    eligible.filter(
      (skill) => skill.disabled_reason === null && skill.model_invocable === 0
    ).length
  )
  assert.ok(contextBudget.excludedCount > 0)
  assert.ok(contextBudget.userInvocableOnlyCount > 0)
})

test('plugin actions affect only the selected install and refresh the skill budget at user scope', async () => {
  const { api } = await createDemo()
  const input = {
    name: 'frontend',
    marketplace: 'team-tools',
    scope: 'project',
    projectPath: SAMPLE_PROJECT
  } as const
  const before = await api.listSkills()
  assert.equal((await api.disablePlugin(input)).ok, true)
  const detail = await api.getPluginDetail('frontend', 'team-tools')
  assert.equal(
    detail?.plugin.installs.find((install) => install.scope === 'project')
      ?.disabled_reason,
    'plugin'
  )
  assert.equal(
    detail?.plugin.installs.find((install) => install.scope === 'user')
      ?.disabled_reason,
    null
  )
  assert.equal(
    (await api.listSkills()).contextBudget.used,
    before.contextBudget.used
  )
  assert.equal(
    (await api.disablePlugin({ ...input, scope: 'user', projectPath: null }))
      .ok,
    true
  )
  const after = await api.listSkills()
  assert.ok(after.contextBudget.used < before.contextBudget.used)
  assert.ok(
    after.skills
      .filter((skill) => skill.plugin_name === 'frontend@team-tools')
      .every((skill) => skill.disabled_reason === 'plugin')
  )
})

test('unknown project installs reject actions until the sample repository is granted', async () => {
  const { api } = await createDemo()
  const input = {
    name: 'docs',
    marketplace: 'community',
    scope: 'local',
    projectPath: ADDITIONAL_PROJECT
  } as const
  assert.equal((await api.disablePlugin(input)).ok, false)
  await api.pickAndAddFolders()
  assert.equal((await api.disablePlugin(input)).ok, true)
  await api.revokeAllowedPath(input.projectPath)
  assert.equal((await api.enablePlugin(input)).ok, false)
})

test('uninstall preserves recorded usage and resolves the removed skill as missing', async () => {
  const { api } = await createDemo()
  const before = await api.getUsageOverview()
  await api.uninstallPlugin({
    name: 'commit',
    marketplace: 'team-tools',
    scope: 'user',
    projectPath: null
  })
  assert.equal(await api.getPluginDetail('commit', 'team-tools'), null)
  const after = await api.getUsageOverview()
  assert.equal(
    after.skills.last30d.invocationCount,
    before.skills.last30d.invocationCount
  )
  const removed = after.skills.last30d.bySkill.find(
    (row) => row.skillName === 'commit:commit'
  )
  assert.equal(removed?.resolution, 'missing')
  assert.equal(removed?.skillId, null)
})

test('scan subscriptions unsubscribe cleanly and reset restores sample state', async () => {
  const demo = await createDemo()
  let updates = 0
  const unsubscribe = demo.api.onScanComplete(() => updates++)
  await demo.api.rescan()
  assert.equal(updates, 1)
  unsubscribe()
  await demo.api.rescan()
  assert.equal(updates, 1)
  await demo.api.disablePlugin({
    name: 'commit',
    marketplace: 'team-tools',
    scope: 'user',
    projectPath: null
  })
  demo.reset()
  assert.equal(
    (await demo.api.getPluginDetail('commit', 'team-tools'))?.plugin
      .disabled_reason,
    null
  )
})

test('usage windows reconcile chart, effort, attribution, and invocation drilldown totals', async () => {
  const { api } = await createDemo()
  const overview = await api.getUsageOverview()
  for (const key of ['last24h', 'last7d', 'last30d'] as const) {
    const activity = overview.activity[key]
    assert.equal(
      activity.byDay.reduce((sum, day) => sum + day.count, 0),
      activity.prompts
    )
    assert.equal(
      activity.byHour.reduce((sum, value) => sum + value, 0),
      activity.prompts
    )
    const models = overview.models[key]
    assert.equal(
      models.matrix.reduce((sum, row) => sum + row.total, 0),
      models.turnCount
    )
    assert.equal(
      models.byEffort.reduce((sum, row) => sum + row.turnCount, 0),
      models.turnCount
    )
    assert.equal(
      models.byModel.reduce((sum, row) => sum + row.outputTokens, 0),
      models.outputTokens
    )
    const skills = overview.skills[key]
    assert.equal(
      (
        await api.getUsageSkillInvocations({
          startAt: skills.startAt,
          endAt: skills.endAt
        })
      ).length,
      skills.invocationCount
    )
    assert.equal(
      skills.trend.reduce((sum, bucket) => sum + bucket.count, 0),
      skills.invocationCount
    )
    assert.equal(
      skills.attribution.rows.reduce(
        (sum, row) => sum + row.estimatedCostCents,
        0
      ),
      skills.attribution.totalEstimatedCostCents
    )
    const cost = overview.cost?.[key]
    assert.ok(cost)
    assert.equal(
      Math.round(cost.byDay.reduce((sum, day) => sum + day.costUsd, 0) * 100),
      Math.round(cost.totalCostUsd * 100)
    )
    assert.equal(
      Math.round(cost.totalCostUsd * 100),
      skills.attribution.totalEstimatedCostCents
    )
  }
})

test('invalid action identities and malformed invocation windows fail at the boundary', async () => {
  const { api } = await createDemo()
  assert.equal(
    (
      await api.enablePlugin({
        name: 'missing',
        marketplace: 'missing',
        scope: 'user',
        projectPath: null
      })
    ).ok,
    false
  )
  await assert.rejects(
    () =>
      api.getUsageSkillInvocations({ startAt: 'invalid', endAt: 'invalid' }),
    /window/i
  )
  assert.equal(await api.openSkill(-1), null)
})

test('all file statuses and frontend metadata are available through real API responses', async () => {
  const { api } = await createDemo()
  const skills = (await api.listSkills()).skills
  const skill = skills.find((row) => row.name === 'code-review')
  assert.ok(skill)
  const detail = await api.openSkillMeta(skill.id)
  assert.ok(detail?.skillMdContent?.includes('metadata:'))
  const files = await api.openSkill(skill.id)
  assert.deepEqual(
    [...new Set(files?.files.map((file) => file.status))].sort(),
    ['ok', 'preview_limit', 'too_large', 'unreadable']
  )
})

test('a failed sample action leaves installation state intact and releases the pending lock', async () => {
  const { createDemoApi } = await import('./api.ts')
  const { api } = createDemoApi({ actionDelayMs: 0, scenario: 'action-error' })
  const input = {
    name: 'commit',
    marketplace: 'team-tools',
    scope: 'user' as const,
    projectPath: null
  }
  const before = await api.getPluginDetail(input.name, input.marketplace)
  assert.equal((await api.disablePlugin(input)).ok, false)
  assert.equal((await api.updatePlugin(input)).ok, false)
  assert.deepEqual(
    await api.getPluginDetail(input.name, input.marketplace),
    before
  )
})

test('a partial scan identifies its incomplete sample source', async () => {
  const { createDemoApi } = await import('./api.ts')
  const { api } = createDemoApi({ actionDelayMs: 0, scenario: 'scan-partial' })
  const summary = await api.rescan()
  assert.equal(summary.outcome, 'partial')
  assert.ok(summary.sources.some((source) => source.status === 'partial'))
})

test('reset cancels a pending action without unlocking a newer action', async () => {
  const { createDemoApi } = await import('./api.ts')
  const { api, reset } = createDemoApi({ actionDelayMs: 20 })
  const commit = {
    name: 'commit',
    marketplace: 'team-tools',
    scope: 'user' as const,
    projectPath: null
  }
  const workflow = {
    name: 'workflow',
    marketplace: 'claude-plugins-official',
    scope: 'user' as const,
    projectPath: null
  }
  const abandoned = api.disablePlugin(commit)
  reset()
  const current = api.enablePlugin(workflow)
  assert.equal((await abandoned).ok, false)
  assert.equal((await api.updatePlugin(commit)).ok, false)
  assert.equal((await current).ok, true)
  assert.equal(
    (await api.getPluginDetail(commit.name, commit.marketplace))?.plugin
      .installs[0].disabled_reason,
    null
  )
  assert.equal(
    (await api.getPluginDetail(workflow.name, workflow.marketplace))?.plugin
      .installs[0].disabled_reason,
    null
  )
})

test('listProjects returns the project catalog and tracks folder additions/revocations', async () => {
  const { api } = await createDemo()
  const initialProjects = await api.listProjects()
  assert.ok(initialProjects.length >= 4)
  assert.ok(
    initialProjects.some(
      (p) => p.path === SAMPLE_PROJECT && p.kind === 'repository'
    )
  )
  assert.ok(initialProjects.some((p) => p.path === EMPTY_PROJECT))

  await api.pickAndAddFolders()
  const withAdded = await api.listProjects()
  assert.ok(withAdded.some((p) => p.path === ADDITIONAL_PROJECT))

  await api.revokeAllowedPath(ADDITIONAL_PROJECT)
  const afterRevoke = await api.listProjects()
  assert.ok(!afterRevoke.some((p) => p.path === ADDITIONAL_PROJECT))
})

test('partial scan exposes actionable scan issues and affected paths', async () => {
  const { createDemoApi } = await import('./api.ts')
  const { api } = createDemoApi({ actionDelayMs: 0, scenario: 'scan-partial' })
  const summary = await api.rescan()
  assert.equal(summary.outcome, 'partial')
  const sourceWithIssue = summary.sources.find(
    (source) => source.issues && source.issues.length > 0
  )
  assert.ok(sourceWithIssue)
  assert.equal(sourceWithIssue?.issues?.[0].code, 'permission_required')
})

test('scan-failed scenario returns a failed scan outcome', async () => {
  const { createDemoApi } = await import('./api.ts')
  const { api } = createDemoApi({ actionDelayMs: 0, scenario: 'scan-failed' })
  const summary = await api.rescan()
  assert.equal(summary.outcome, 'failed')
  assert.equal(summary.sources[0].status, 'failed')
})

test('listProjects handles empty and availability diagnostic scenarios', async () => {
  const { createDemoApi } = await import('./api.ts')
  const empty = createDemoApi({
    actionDelayMs: 0,
    scenario: 'projects-empty'
  }).api
  assert.deepEqual(await empty.listProjects(), [])

  const unavailable = createDemoApi({
    actionDelayMs: 0,
    scenario: 'projects-unavailable'
  }).api
  const unavailList = await unavailable.listProjects()
  assert.ok(unavailList.length > 0)
  assert.ok(unavailList.every((p) => p.status === 'unavailable'))

  const missing = createDemoApi({
    actionDelayMs: 0,
    scenario: 'projects-missing'
  }).api
  const missingList = await missing.listProjects()
  assert.ok(missingList.length > 0)
  assert.ok(missingList.every((p) => p.status === 'missing'))

  const needsAccess = createDemoApi({
    actionDelayMs: 0,
    scenario: 'projects-needs-access'
  }).api
  const needsAccessList = await needsAccess.listProjects()
  assert.ok(needsAccessList.length > 0)
  assert.ok(needsAccessList.every((p) => p.status === 'needs_access'))
})

test('the sample grants a parent folder whose repositories are labeled relative to it', async () => {
  const { api } = await createDemo()
  assert.deepEqual(
    (await api.listAllowedPaths()).map((folder) => folder.path),
    [SAMPLE_PARENT]
  )
  const projects = await api.listProjects()
  assert.ok(
    projects.some(
      (project) => project.path === SAMPLE_PARENT && project.kind === 'folder'
    )
  )
  assert.ok(
    projects.every((project) =>
      isWithinProjectPath(project.path, SAMPLE_PARENT)
    )
  )
  assert.ok(projects.every((project) => !project.path.includes('/')))
})

test('parent folder revocation removes nested child projects and skills', async () => {
  const { api } = await createDemo()
  await api.revokeAllowedPath(SAMPLE_PARENT)
  const projects = await api.listProjects()
  assert.ok(!projects.some((p) => p.path === SAMPLE_PROJECT))
  assert.ok(!projects.some((p) => p.path === NESTED_PROJECT))
  const skills = (await api.listSkills()).skills
  assert.ok(!skills.some((s) => s.project_root === SAMPLE_PROJECT))
})

test('a user install disabled alongside an enabled project install keeps shared skills available', async () => {
  const { api } = await createDemo()
  await api.disablePlugin({
    name: 'frontend',
    marketplace: 'team-tools',
    scope: 'user',
    projectPath: null
  })
  const skills = (await api.listSkills()).skills.filter(
    (skill) => skill.plugin_name === 'frontend@team-tools'
  )
  assert.ok(skills.length > 0)
  assert.ok(skills.every((skill) => skill.disabled_reason === null))
})

test('uninstalling one version removes its skills while preserving the other install', async () => {
  const { api } = await createDemo()
  await api.uninstallPlugin({
    name: 'frontend',
    marketplace: 'team-tools',
    scope: 'user',
    projectPath: null
  })
  const detail = await api.getPluginDetail('frontend', 'team-tools')
  assert.deepEqual(
    detail?.skills.map((skill) => skill.name),
    ['frontend:design']
  )
  assert.equal(detail?.plugin.skill_count, 1)
  assert.equal(detail?.plugin.installs[0].scope, 'project')
})

test('granting a parent discovers descendants and revoking it preserves independently granted repositories', async () => {
  const { api } = await createDemo()
  await api.pickAndAddFolders()
  await api.pickAndAddFolders()
  assert.ok(
    (await api.listAllowedPaths()).some(
      (folder) => folder.path === ADDITIONAL_PARENT
    )
  )
  assert.ok(
    (await api.listProjects()).some(
      (project) =>
        project.path === ADDITIONAL_PARENT && project.kind === 'folder'
    )
  )
  await api.revokeAllowedPath(ADDITIONAL_PARENT)
  const projects = await api.listProjects()
  assert.ok(projects.some((project) => project.path === ADDITIONAL_PROJECT))
  assert.ok(!projects.some((project) => project.path === ADDITIONAL_PARENT))
  assert.equal(
    (await api.listSkills()).skills.filter(
      (skill) => skill.project_root === SAMPLE_PROJECT
    ).length,
    4
  )
})

test('a rescan publishes matching start and completion events and clears in-progress state', async () => {
  const { api } = await createDemo({ actionDelayMs: 10 })
  assert.equal(typeof api.onScanStarted, 'function')
  const starts: { id: number; isStartup: boolean }[] = []
  const finishes: { id: number; summary: { outcome: string } }[] = []
  api.onScanStarted((activity) => starts.push(activity))
  api.onScanComplete((finished) => finishes.push(finished))
  const scan = api.rescan()
  assert.equal((await api.listSkills()).scanActivity?.id, starts[0].id)
  await scan
  assert.equal(starts[0].isStartup, false)
  assert.equal(finishes[0].id, starts[0].id)
  assert.equal(finishes[0].summary.outcome, 'complete')
  assert.equal((await api.listSkills()).scanActivity, null)
})

test('a granted missing project reports unknown plugin enablement and blocks actions', async () => {
  const { api } = await createDemo({ scenario: 'projects-missing' })
  const plugin = await api.getPluginDetail('frontend', 'team-tools')
  const install = plugin!.plugin.installs.find(
    (row) => row.scope === 'project'
  )!
  assert.equal(install.project_missing, true)
  assert.equal(install.enablement_known, false)
  const result = await api.disablePlugin({
    name: 'frontend',
    marketplace: 'team-tools',
    scope: 'project',
    projectPath: SAMPLE_PROJECT
  })
  assert.equal(result.ok, false)
  assert.match(result.stderr!, /missing/)
})

test('revoking access while a scoped action is pending prevents the mutation', async () => {
  const { api } = await createDemo({ actionDelayMs: 10 })
  const action = api.disablePlugin({
    name: 'frontend',
    marketplace: 'team-tools',
    scope: 'project',
    projectPath: SAMPLE_PROJECT
  })
  await api.revokeAllowedPath(SAMPLE_PARENT)
  assert.equal((await action).ok, false)
  const detail = await api.getPluginDetail('frontend', 'team-tools')
  assert.equal(
    detail?.plugin.installs.find((row) => row.scope === 'project')
      ?.disabled_reason,
    null
  )
})

test('updating a shared plugin version preserves the skills still used by another install', async () => {
  const { api } = await createDemo()
  await api.pickAndAddFolders()
  assert.equal(
    (
      await api.updatePlugin({
        name: 'docs',
        marketplace: 'community',
        scope: 'local',
        projectPath: ADDITIONAL_PROJECT
      })
    ).ok,
    true
  )
  const detail = await api.getPluginDetail('docs', 'community')
  assert.equal(detail?.skills.length, 2)
  assert.ok(
    detail?.skills.some((skill) => skill.source_path.includes('\\2.0.1\\'))
  )
  assert.ok(
    detail?.skills.some((skill) => skill.source_path.includes('\\2.1.0\\'))
  )
})
