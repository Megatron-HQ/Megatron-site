import type {
  AppSection,
  PluginActionInput,
  PluginActionResult,
  ScanSummary,
  SkillInvocationSliceInput,
  SkillRow,
  ThemePreference
} from '../../vendor/megatron/src/shared/ipc'
import type { Api } from '../../vendor/megatron/src/preload/index.d.ts'
import {
  ADDITIONAL_PROJECT,
  CONTEXT_LIMIT,
  DAY_MS,
  createSampleState,
  sampleFiles,
  sampleFindings,
  type SampleState
} from './fixtures.ts'
import {
  buildUsageOverview,
  resolveSampleSkill,
  sampleInvocation,
  triggerCounts
} from './analytics.ts'

export interface DemoOptions {
  now?: Date
  actionDelayMs?: number
  initialSection?: AppSection
  initialTheme?: ThemePreference
  platform?: NodeJS.Platform
  onSectionChange?: (section: AppSection) => void
  onNotice?: (message: string) => void
  scenario?: string
}

export function createDemoApi(options: DemoOptions = {}) {
  const now = options.now ?? new Date()
  const initial = createSampleState(now)
  let state: SampleState = structuredClone(initial)
  let section = options.initialSection ?? 'skills'
  let theme = options.initialTheme ?? 'light'
  let pendingAction = false
  let sessionRevision = 0
  const subscriptions = new Set<() => void>()
  const delay = options.actionDelayMs ?? 450
  const copy = <T>(value: T): T => structuredClone(value)
  const notify = () => {
    for (const subscriber of subscriptions) subscriber()
  }
  const scanSummary = (): ScanSummary => {
    const outcome = options.scenario === 'scan-partial' ? 'partial' : 'complete'
    return {
      outcome,
      completedAt: state.now,
      sources: [{ name: 'Sample data', status: outcome }],
      lastSuccessfulAt: state.now
    }
  }

  function checkScenario(name: string): void {
    if (options.scenario === `${name}-error`)
      throw new Error(`Could not load sample ${name}.`)
  }

  function currentSkills(): SkillRow[] {
    return state.skills.map((skill) => {
      const events =
        skill.shadowed_by_skill_id !== null
          ? []
          : state.events.filter(
              (event) =>
                event.skillName === skill.name &&
                resolveSampleSkill(state.skills, skill.name, event.project)
                  ?.id === skill.id
            )
      return {
        ...skill,
        total_invocations: events.length,
        last_invoked_at: events.at(-1)?.at ?? null
      }
    })
  }

  function contextBudget(skills: SkillRow[]) {
    const eligible = skills.filter((row) => row.source_type !== 'project')
    const disabled = eligible.filter((row) => row.disabled_reason !== null)
    const userOnly = eligible.filter(
      (row) => row.disabled_reason === null && row.model_invocable === 0
    )
    const total = (rows: SkillRow[]) =>
      rows.reduce((sum, row) => sum + row.est_listing_tokens, 0)
    return {
      used: total(
        eligible.filter(
          (row) => row.disabled_reason === null && row.model_invocable === 1
        )
      ),
      limit: CONTEXT_LIMIT,
      excludedTokens: total(disabled),
      excludedCount: disabled.length,
      userInvocableOnlyTokens: total(userOnly),
      userInvocableOnlyCount: userOnly.length
    }
  }

  function history(id: number) {
    const skill = state.skills.find((row) => row.id === id)
    if (!skill || skill.shadowed_by_skill_id !== null) return []
    return state.events
      .filter(
        (event) =>
          event.skillName === skill.name &&
          resolveSampleSkill(state.skills, skill.name, event.project)?.id === id
      )
      .toReversed()
      .map((event) => sampleInvocation(state, event))
  }

  function usage(id: number) {
    const rows = history(id)
    const projects = new Map<string, number>()
    for (const row of rows)
      projects.set(row.cwd, (projects.get(row.cwd) ?? 0) + 1)
    return {
      byTriggerType: triggerCounts(
        state.events.filter(
          (event) =>
            event.skillName !== null &&
            resolveSampleSkill(state.skills, event.skillName, event.project)
              ?.id === id
        )
      ),
      byProject: [...projects]
        .sort((a, b) => b[1] - a[1])
        .map(([cwd, count]) => ({ cwd, count })),
      recentTriggers: rows.slice(0, 5)
    }
  }

  function refreshPlugins(): void {
    for (const plugin of state.plugins) {
      plugin.disabled_reason = plugin.installs.every(
        (row) => row.disabled_reason !== null
      )
        ? 'plugin'
        : null
      plugin.skill_count = state.skills.filter(
        (row) => row.plugin_name === `${plugin.name}@${plugin.marketplace}`
      ).length
      const user = plugin.installs.find((row) => row.scope === 'user')
      for (const skill of state.skills.filter(
        (row) => row.plugin_name === `${plugin.name}@${plugin.marketplace}`
      ))
        skill.disabled_reason = user?.disabled_reason ?? null
      for (const install of plugin.installs)
        install.enablement_known =
          install.scope === 'user' ||
          (install.project_path !== null &&
            state.folders.some((row) => row.path === install.project_path))
    }
  }

  async function runPluginAction(
    verb: 'enable' | 'disable' | 'update' | 'uninstall',
    input: PluginActionInput
  ): Promise<PluginActionResult> {
    const plugin = state.plugins.find(
      (row) => row.name === input.name && row.marketplace === input.marketplace
    )
    const install = plugin?.installs.find(
      (row) =>
        row.scope === input.scope && row.project_path === input.projectPath
    )
    if (!plugin || !install)
      return { ok: false, stderr: 'This sample installation is unavailable.' }
    if (pendingAction)
      return { ok: false, stderr: 'Another sample action is still running.' }
    if (
      install.scope !== 'user' &&
      (install.project_path === null || !install.enablement_known)
    )
      return {
        ok: false,
        stderr:
          'Grant the sample project folder before changing this installation.'
      }
    pendingAction = true
    const actionRevision = sessionRevision
    try {
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      if (actionRevision !== sessionRevision)
        return {
          ok: false,
          stderr: 'This sample action was cancelled by Reset sample.'
        }
      if (options.scenario === 'action-error')
        return {
          ok: false,
          stderr:
            'The sample plugin action failed. Try again after resetting the preview.'
        }
      if (verb === 'uninstall') {
        plugin.installs = plugin.installs.filter((row) => row !== install)
        if (plugin.installs.length === 0) {
          state.plugins = state.plugins.filter((row) => row !== plugin)
          state.skills = state.skills.filter(
            (row) => row.plugin_name !== `${plugin.name}@${plugin.marketplace}`
          )
        }
      } else if (verb === 'update') {
        install.installed_version =
          install.available_version ?? install.installed_version
        plugin.installed_version =
          plugin.installs
            .map((row) => row.installed_version)
            .sort()
            .at(-1) ?? plugin.installed_version
        install.last_updated = state.now
      } else install.disabled_reason = verb === 'disable' ? 'plugin' : null
      refreshPlugins()
      notify()
      return { ok: true }
    } finally {
      if (actionRevision === sessionRevision) pendingAction = false
    }
  }

  const api: Api = {
    platform: options.platform ?? 'win32',
    async listSkills() {
      checkScenario('skills')
      const skills = currentSkills()
      return copy({
        skills,
        scanComplete: true,
        scanSummary: scanSummary(),
        contextBudget: contextBudget(skills)
      })
    },
    async openSkillMeta(id) {
      checkScenario('skill')
      const skill = currentSkills().find((row) => row.id === id)
      return skill
        ? copy({
            skill,
            usage: usage(id),
            skillMdContent: sampleFiles(skill)[0].content,
            findings: sampleFindings(skill)
          })
        : null
    },
    async openSkill(id) {
      checkScenario('files')
      const skill = currentSkills().find((row) => row.id === id)
      return skill
        ? copy({
            skill,
            usage: usage(id),
            files:
              options.scenario === 'files-limit'
                ? [
                    {
                      relativePath: 'SKILL.md',
                      content: null,
                      status: 'preview_limit' as const
                    }
                  ]
                : sampleFiles(skill),
            findings: sampleFindings(skill)
          })
        : null
    },
    async openSkillHistory(id) {
      checkScenario('history')
      return copy(history(id))
    },
    getInitialTheme: () => theme,
    async setTheme(value) {
      if (!['light', 'dark', 'system'].includes(value))
        throw new RangeError('Unknown appearance.')
      theme = value
    },
    async listAllowedPaths() {
      return copy(state.folders)
    },
    async pickAndAddFolders() {
      if (!state.folders.some((row) => row.path === ADDITIONAL_PROJECT))
        state.folders.push({ path: ADDITIONAL_PROJECT, granted_at: state.now })
      refreshPlugins()
      notify()
      options.onNotice?.(
        'Added the sample docs-site repository. Your local folders are never accessed.'
      )
      return copy(state.folders)
    },
    async revokeAllowedPath(path) {
      if (!state.folders.some((row) => row.path === path))
        throw new RangeError('Unknown sample repository.')
      state.folders = state.folders.filter((row) => row.path !== path)
      state.skills = state.skills.filter((row) => row.project_root !== path)
      refreshPlugins()
      notify()
      return copy(state.folders)
    },
    async openExternal() {
      options.onNotice?.(
        'External links are shown as sample content in this preview.'
      )
    },
    async listPlugins() {
      checkScenario('plugins')
      return copy(state.plugins)
    },
    async getPluginDetail(name, marketplace) {
      checkScenario('plugin')
      const plugin = state.plugins.find(
        (row) => row.name === name && row.marketplace === marketplace
      )
      if (!plugin) return null
      const skills = currentSkills().filter(
        (row) => row.plugin_name === `${name}@${marketplace}`
      )
      return copy({
        plugin,
        skills,
        totalInvocations: skills.reduce(
          (sum, row) => sum + row.total_invocations,
          0
        ),
        errorCount: skills.reduce((sum, row) => sum + row.error_count, 0),
        warningCount: skills.reduce((sum, row) => sum + row.warning_count, 0)
      })
    },
    enablePlugin: (input) => runPluginAction('enable', input),
    disablePlugin: (input) => runPluginAction('disable', input),
    updatePlugin: (input) => runPluginAction('update', input),
    uninstallPlugin: (input) => runPluginAction('uninstall', input),
    async getUsageOverview() {
      checkScenario('usage')
      const result = buildUsageOverview(state)
      if (options.scenario === 'resident-empty') result.residentTax = null
      if (options.scenario === 'cost-empty') result.cost = null
      if (options.scenario === 'usage-empty')
        return buildUsageOverview({ ...state, events: [] })
      return copy(result)
    },
    async getUsageSkillInvocations(input: SkillInvocationSliceInput) {
      const start = new Date(input.startAt)
      const end = new Date(input.endAt)
      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        start.toISOString() !== input.startAt ||
        end.toISOString() !== input.endAt ||
        end <= start ||
        end.getTime() - start.getTime() > 31 * DAY_MS + 1 ||
        (input.skillName !== undefined && input.skillName.trim() === '')
      )
        throw new RangeError('Invalid invocation window.')
      return copy(
        state.events
          .filter(
            (row) =>
              row.skillName !== null &&
              row.at >= input.startAt &&
              row.at < input.endAt &&
              (input.skillName === undefined ||
                row.skillName === input.skillName)
          )
          .toReversed()
          .map((event) => sampleInvocation(state, event))
      )
    },
    getInitialSection: () => section,
    async setLastSection(value) {
      if (!['skills', 'plugins', 'usage'].includes(value))
        throw new RangeError('Unknown app section.')
      section = value
      options.onSectionChange?.(value)
    },
    async rescan() {
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      notify()
      return scanSummary()
    },
    async revealDataFolder() {
      options.onNotice?.(
        'This browser preview has no local data folder. The desktop app stores its index on your machine.'
      )
    },
    getVersion: () => '0.1.0',
    onScanComplete(callback) {
      subscriptions.add(callback)
      return () => {
        subscriptions.delete(callback)
      }
    }
  }
  return {
    api,
    reset() {
      sessionRevision += 1
      pendingAction = false
      state = structuredClone(initial)
      section = options.initialSection ?? 'skills'
      theme = options.initialTheme ?? 'light'
      notify()
    }
  }
}
