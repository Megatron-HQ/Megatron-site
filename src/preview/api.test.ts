import assert from 'node:assert/strict'
import test from 'node:test'

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
    projectPath: 'C:/Projects/web-app'
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
    projectPath: 'C:/Projects/docs-site'
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
