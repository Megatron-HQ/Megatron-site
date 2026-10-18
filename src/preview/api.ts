import type {
  AppSection,
  PluginActionInput,
  PluginActionResult,
  PluginInstall,
  PluginRow,
  ScanActivity,
  ScanFinished,
  ScanSummary,
  SkillInvocationSliceInput,
  SkillRow,
  ThemePreference
} from '../../vendor/megatron/src/shared/ipc'
import type { Api } from '../../vendor/megatron/src/preload/index.d.ts'
import { isWithinProjectPath } from '../../vendor/megatron/src/shared/project-path.ts'
import { missingProjectInstallMessage } from '../../vendor/megatron/src/shared/missing-project.ts'
import { SCAN_BANNER_REVEAL_MS } from '../../vendor/megatron/src/shared/scan-banner.ts'
import {
  ADDITIONAL_PROJECT,
  SAMPLE_PARENT,
  CONTEXT_LIMIT,
  DAY_MS,
  createSampleState,
  sampleFiles,
  sampleFindings,
  samplePluginInstallPath,
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
  let scanActivity: ScanActivity | null = null
  let nextScanId = 0
  const subscriptions = new Set<(finished: ScanFinished) => void>()
  const scanStartedSubscriptions = new Set<(activity: ScanActivity) => void>()
  const delay = options.actionDelayMs ?? 450
  const copy = <T>(value: T): T => structuredClone(value)
  const notify = (activity: ScanActivity | null = null) => {
    if (activity?.id === scanActivity?.id) scanActivity = null
    const finished = {
      id: activity?.id ?? ++nextScanId,
      summary: scanSummary()
    }
    for (const subscriber of subscriptions) subscriber(copy(finished))
  }
  const scanSummary = (): ScanSummary => {
    const outcome =
      options.scenario === 'scan-failed'
        ? 'failed'
        : options.scenario === 'scan-partial'
          ? 'partial'
          : 'complete'
    return {
      outcome,
      completedAt: state.now,
      sources: [
        {
          name: 'Sample data',
          status: outcome,
          ...(outcome === 'partial'
            ? {
                issues: [
                  {
                    code: 'permission_required' as const,
                    path: 'C:/Projects/restricted-repo'
                  }
                ]
              }
            : {})
        }
      ],
      lastSuccessfulAt:
        outcome === 'complete'
          ? state.now
          : new Date(now.getTime() - DAY_MS).toISOString(),
      projects: state.projects
    }
  }

  function checkScenario(name: string): void {
    if (options.scenario === `${name}-error`)
      throw new Error(`Could not load sample ${name}.`)
  }

  function currentSkills(): SkillRow[] {
    const base =
      options.scenario === 'projects-empty'
        ? state.skills.filter((skill) => skill.source_type !== 'project')
        : state.skills
    return base.map((skill) => {
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
      for (const skill of state.skills.filter(
        (row) => row.plugin_name === `${plugin.name}@${plugin.marketplace}`
      ))
        skill.disabled_reason = plugin.disabled_reason
      for (const install of plugin.installs) {
        install.project_missing =
          install.scope !== 'user' &&
          install.project_path !== null &&
          hasFolderAccess(install.project_path) &&
          options.scenario === 'projects-missing'
        install.enablement_known =
          install.scope === 'user' ||
          (install.project_path !== null &&
            hasFolderAccess(install.project_path) &&
            ![
              'projects-missing',
              'projects-unavailable',
              'projects-needs-access'
            ].includes(options.scenario ?? ''))
      }
    }
  }

  function hasFolderAccess(path: string): boolean {
    return state.folders.some((folder) =>
      isWithinProjectPath(path, folder.path)
    )
  }

  function discoverProjects(): void {
    state.projects = [
      ...initial.projects,
      {
        path: ADDITIONAL_PROJECT,
        kind: 'repository' as const,
        status: 'available' as const
      },
      {
        path: SAMPLE_PARENT,
        kind: 'folder' as const,
        status: 'available' as const
      }
    ].filter((project) =>
      project.kind === 'folder'
        ? state.folders.some((folder) => folder.path === project.path)
        : hasFolderAccess(project.path)
    )
    state.skills = state.skills.filter(
      (skill) =>
        skill.project_root === null || hasFolderAccess(skill.project_root)
    )
    for (const skill of initial.skills) {
      if (
        skill.project_root !== null &&
        hasFolderAccess(skill.project_root) &&
        !state.skills.some((row) => row.id === skill.id)
      )
        state.skills.push(copy(skill))
    }
  }

  function updateInstallVersion(
    plugin: PluginRow,
    install: PluginInstall
  ): void {
    const previousPath = install.install_path
    install.installed_version =
      install.available_version ?? install.installed_version
    install.install_path = samplePluginInstallPath(
      plugin.name,
      plugin.marketplace,
      install.installed_version
    )
    install.last_updated = state.now
    if (previousPath === install.install_path) return

    const identity = `${plugin.name}@${plugin.marketplace}`
    const previousSkills = state.skills.filter(
      (skill) =>
        skill.plugin_name === identity &&
        isWithinProjectPath(skill.source_path, previousPath)
    )
    const stillInstalled = plugin.installs.some(
      (row) => row !== install && row.install_path === previousPath
    )
    let nextId = Math.max(...state.skills.map((skill) => skill.id)) + 1
    if (!stillInstalled)
      state.skills = state.skills.filter(
        (skill) => !previousSkills.includes(skill)
      )
    for (const skill of previousSkills) {
      const sourcePath =
        install.install_path + skill.source_path.slice(previousPath.length)
      if (
        !state.skills.some(
          (row) =>
            row.plugin_name === identity && row.source_path === sourcePath
        )
      )
        state.skills.push({
          ...skill,
          id: stillInstalled ? nextId++ : skill.id,
          source_path: sourcePath
        })
    }
    plugin.installed_version = install.installed_version
  }

  async function runPluginAction(
    verb: 'enable' | 'disable' | 'update' | 'uninstall',
    input: PluginActionInput
  ): Promise<PluginActionResult> {
    refreshPlugins()
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
    if (install.project_missing && install.project_path !== null)
      return {
        ok: false,
        stderr: missingProjectInstallMessage(install.project_path)
      }
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
      if (install.scope !== 'user' && !install.enablement_known)
        return {
          ok: false,
          stderr:
            'Access to this sample repository was revoked before the action finished.'
        }
      if (verb === 'uninstall') {
        plugin.installs = plugin.installs.filter((row) => row !== install)
        state.skills = state.skills.filter(
          (skill) =>
            skill.plugin_name !== `${plugin.name}@${plugin.marketplace}` ||
            plugin.installs.some((remaining) =>
              isWithinProjectPath(skill.source_path, remaining.install_path)
            )
        )
        if (plugin.installs.length === 0) {
          state.plugins = state.plugins.filter((row) => row !== plugin)
          state.skills = state.skills.filter(
            (row) => row.plugin_name !== `${plugin.name}@${plugin.marketplace}`
          )
        }
      } else if (verb === 'update') {
        updateInstallVersion(plugin, install)
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
        scanActivity,
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
      if (options.scenario === 'projects-empty') return []
      return copy(state.folders)
    },
    async listProjects() {
      checkScenario('projects')
      if (options.scenario === 'projects-empty') return []
      if (options.scenario === 'projects-unavailable')
        return copy(
          state.projects.map((p) => ({ ...p, status: 'unavailable' as const }))
        )
      if (options.scenario === 'projects-missing')
        return copy(
          state.projects.map((p) => ({ ...p, status: 'missing' as const }))
        )
      if (options.scenario === 'projects-needs-access')
        return copy(
          state.projects.map((p) => ({ ...p, status: 'needs_access' as const }))
        )
      return copy(state.projects)
    },
    async pickAndAddFolders() {
      const path = state.folders.some((row) => row.path === ADDITIONAL_PROJECT)
        ? SAMPLE_PARENT
        : ADDITIONAL_PROJECT
      if (!state.folders.some((row) => row.path === path))
        state.folders.push({ path, granted_at: state.now })
      discoverProjects()
      refreshPlugins()
      notify()
      options.onNotice?.(
        path === SAMPLE_PARENT
          ? 'Granted the sample Projects parent folder and discovered its repositories. Your local folders are never accessed.'
          : 'Added the sample docs-site repository. Add Folder again to try a parent-folder grant. Your local folders are never accessed.'
      )
      return copy(state.folders)
    },
    async revokeAllowedPath(path) {
      if (!state.folders.some((row) => row.path === path))
        throw new RangeError('Unknown sample repository.')
      state.folders = state.folders.filter((row) => row.path !== path)
      discoverProjects()
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
      const activity: ScanActivity = {
        id: ++nextScanId,
        startedAt: Date.now(),
        isStartup: false,
        revealMs: SCAN_BANNER_REVEAL_MS
      }
      const revision = sessionRevision
      scanActivity = activity
      for (const subscriber of scanStartedSubscriptions)
        subscriber(copy(activity))
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      if (revision === sessionRevision) notify(activity)
      return scanSummary()
    },
    async revealDataFolder() {
      options.onNotice?.(
        'This browser preview has no local data folder. The desktop app stores its index on your machine.'
      )
    },
    getVersion: () => '0.1.0',
    onScanStarted(callback) {
      scanStartedSubscriptions.add(callback)
      return () => {
        scanStartedSubscriptions.delete(callback)
      }
    },
    onScanComplete(callback) {
      subscriptions.add(callback)
      return () => {
        subscriptions.delete(callback)
      }
    }
  }
  refreshPlugins()
  return {
    api,
    reset() {
      sessionRevision += 1
      pendingAction = false
      scanActivity = null
      state = structuredClone(initial)
      refreshPlugins()
      section = options.initialSection ?? 'skills'
      theme = options.initialTheme ?? 'light'
      notify()
    }
  }
}
