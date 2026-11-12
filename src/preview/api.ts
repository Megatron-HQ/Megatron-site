import type {
  AppSection,
  PluginActionInput,
  PluginActionResult,
  PluginInstall,
  PluginRow,
  PluginUpdateProgress,
  ScanActivity,
  ScanFinished,
  ScanProgress,
  ScanSummary,
  SkillInvocationSliceInput,
  SkillRow,
  ThemePreference,
  UpdateState
} from '../../vendor/megatron/src/shared/ipc'
import type { Api } from '../../vendor/megatron/src/preload/index.d.ts'
import { isWithinProjectPath } from '../../vendor/megatron/src/shared/project-path.ts'
import { missingProjectInstallMessage } from '../../vendor/megatron/src/shared/missing-project.ts'
import { SCAN_BANNER_REVEAL_MS } from '../../vendor/megatron/src/shared/scan-banner.ts'
import {
  ADDITIONAL_PARENT,
  ADDITIONAL_PROJECT,
  SAMPLE_HOME,
  SAMPLE_PARENT,
  SAMPLE_PROJECT,
  CONTEXT_LIMIT,
  DAY_MS,
  createSampleState,
  sampleFiles,
  sampleFindings,
  samplePluginComponents,
  samplePluginInstallPath,
  windowsPath,
  type SampleState
} from './fixtures.ts'
import {
  buildUsageOverview,
  resolveSampleSkill,
  sampleInvocation,
  triggerCounts
} from './analytics.ts'
import { buildUsageCalendar, buildUsageDay } from './usage-history.ts'
import { sampleContextBaseline, sampleRecordedRequest } from './context.ts'
import { applyInventoryChange } from './inventory.ts'
import { findStaleSkillIds, sampleStaleEvidence } from './stale-skills.ts'
import {
  resolveSampleGrantChange,
  type SampleGrantChange
} from './folder-grants.ts'

export const PREVIEW_APP_VERSION = '0.2.0'
// The desktop's updater never runs in a browser, so the preview shows the
// state an uninstalled build reports.
const INITIAL_UPDATE_STATE: UpdateState = {
  status: 'unsupported',
  version: null,
  autoCheck: true
}
const UPDATES_UNAVAILABLE_NOTICE =
  'The browser preview never checks for updates. Installed builds ask github.com for new releases; turn that off in Settings → Updates.'

function projectName(path: string): string {
  return path.split('\\').at(-1) ?? path
}
import { INVENTORY_CHANGES, type InventoryChange } from './protocol.ts'
import {
  groupSampleCalendar,
  groupSampleDay,
  groupSampleUsageOverview,
  linkSampleUsageProjects,
  reconcileSampleUsageProjects,
  sampleUsageProjectCatalog,
  unlinkSampleUsageProject
} from './usage-projects.ts'

const STARTUP_SCAN_SCENARIOS = [
  'scan-failed',
  'scan-partial',
  'projects-missing',
  'projects-missing-warning'
]

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
  initial.prompts = initial.events.map((event) => ({
    at: event.at,
    project: event.project,
    sessionId: event.sessionId,
    bareSlash: event.bareSlash,
    copies: 1
  }))
  if (options.scenario === 'activity-partial')
    initial.promptCoverage = 'partial'
  if (options.scenario === 'activity-unavailable') {
    initial.prompts = []
    initial.promptCoverage = 'unavailable'
  }
  if (
    ['projects-missing', 'projects-missing-warning'].includes(
      options.scenario ?? ''
    )
  ) {
    initial.folders.push({ path: SAMPLE_PROJECT, granted_at: initial.now })
    initial.projects.find(
      (project) => project.path === SAMPLE_PROJECT
    )!.status = 'missing'
  }
  let state: SampleState = structuredClone(initial)
  let inventorySource = structuredClone(initial)
  let inventoryOnly = false
  let usageLocations = reconcileSampleUsageProjects([], initial)
  let section = options.initialSection ?? 'skills'
  let theme = options.initialTheme ?? 'light'
  let pendingAction = false
  let sessionRevision = 0
  let scanActivity: ScanActivity | null = null
  let nextScanId = 0
  let completedScanCount = 0
  let completedAt = initial.now
  let pendingProjectPath: string | null = null
  let discoveryPending = false
  let lastScanWasStartup = STARTUP_SCAN_SCENARIOS.includes(
    options.scenario ?? ''
  )
  const subscriptions = new Set<(finished: ScanFinished) => void>()
  const scanStartedSubscriptions = new Set<(activity: ScanActivity) => void>()
  const scanProgressSubscriptions = new Set<(progress: ScanProgress) => void>()
  const pluginProgressSubscriptions = new Set<
    (progress: PluginUpdateProgress) => void
  >()
  let updateState: UpdateState = { ...INITIAL_UPDATE_STATE }
  const updateSubscriptions = new Set<(state: UpdateState) => void>()
  const delay = options.actionDelayMs ?? 450
  function currentUsageLocations() {
    usageLocations = reconcileSampleUsageProjects(usageLocations, state)
    return usageLocations
  }
  async function changeUsageProjects(change: () => typeof usageLocations) {
    const revision = sessionRevision
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
    if (revision !== sessionRevision)
      throw new Error('Sample project linking was cancelled by Reset sample.')
    if (options.scenario === 'usage-project-link-error')
      throw new Error('Could not update sample project locations.')
    usageLocations = change()
    options.onNotice?.(
      'Updated sample Usage project locations. Inventory ownership and folder access are unchanged.'
    )
    return sampleUsageProjectCatalog(currentUsageLocations())
  }
  const copy = <T>(value: T): T => structuredClone(value)
  function startSampleDiscovery(): void {
    scanActivity = {
      id: ++nextScanId,
      startedAt: Date.now(),
      isStartup: false,
      revealMs: SCAN_BANNER_REVEAL_MS
    }
    for (const subscriber of scanStartedSubscriptions)
      subscriber(copy(scanActivity))
  }
  function setSampleProjectAvailability(
    path: string,
    status: 'available' | 'unavailable'
  ): void {
    const project = state.projects.find((entry) => entry.path === path)
    if (project) project.status = status
    else state.projects.push({ path, kind: 'repository', status })
    inventorySource.projects = copy(state.projects)
    discoveryPending = false
    refreshPlugins()
  }
  const notify = (activity: ScanActivity | null = null) => {
    completedAt = new Date(now.getTime() + ++completedScanCount).toISOString()
    if (activity?.id === scanActivity?.id) scanActivity = null
    const finished = {
      id: activity?.id ?? ++nextScanId,
      summary: scanSummary()
    }
    for (const subscriber of subscriptions) subscriber(copy(finished))
  }
  const scanSummary = (): ScanSummary => {
    const missingProjects = [
      'projects-missing',
      'projects-missing-warning'
    ].includes(options.scenario ?? '')
    const hasPermissionWarning =
      options.scenario === 'scan-partial' ||
      options.scenario === 'projects-missing-warning'
    const unavailableProjects = state.projects.filter(
      (project) => project.status === 'unavailable'
    )
    const outcome =
      options.scenario === 'scan-failed'
        ? 'failed'
        : hasPermissionWarning ||
            missingProjects ||
            unavailableProjects.length > 0
          ? 'partial'
          : 'complete'
    return {
      outcome,
      completedAt,
      isStartup: lastScanWasStartup,
      sources: [
        ...(inventoryOnly || unavailableProjects.length > 0 || missingProjects
          ? [
              {
                name: 'scanSkills',
                status:
                  unavailableProjects.length > 0 || missingProjects
                    ? ('partial' as const)
                    : ('complete' as const),
                ...(unavailableProjects.length > 0 || missingProjects
                  ? {
                      issues: [
                        ...unavailableProjects.map((project) => ({
                          code: 'source_unavailable' as const,
                          path: project.path
                        })),
                        ...(missingProjects
                          ? [
                              {
                                code: 'project_missing' as const,
                                path: SAMPLE_PROJECT
                              }
                            ]
                          : [])
                      ]
                    }
                  : {})
              },
              { name: 'scanPluginRegistry', status: 'complete' as const },
              { name: 'runLinter', status: 'complete' as const }
            ]
          : []),
        ...(!inventoryOnly
          ? [
              {
                name: 'scanTranscripts',
                status:
                  outcome === 'failed'
                    ? ('failed' as const)
                    : ('complete' as const),
                ...(outcome === 'failed'
                  ? { failureReason: 'scan_error' as const }
                  : {})
              },
              {
                name: 'archiveTokens',
                status:
                  outcome === 'failed'
                    ? ('partial' as const)
                    : ('complete' as const)
              },
              {
                name: 'scanPromptHistory',
                status: hasPermissionWarning
                  ? ('partial' as const)
                  : ('complete' as const),
                ...(hasPermissionWarning
                  ? {
                      issues: [
                        {
                          code: 'permission_required' as const,
                          path: windowsPath(SAMPLE_PARENT, 'restricted-repo')
                        }
                      ]
                    }
                  : {})
              },
              {
                name: 'archivePrompts',
                status: hasPermissionWarning
                  ? ('partial' as const)
                  : ('complete' as const)
              }
            ]
          : [])
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
          state.projects.some(
            (project) =>
              project.path === install.project_path &&
              project.status === 'missing'
          )
        install.enablement_known =
          install.scope === 'user' ||
          (install.project_path !== null &&
            hasFolderAccess(install.project_path) &&
            !(
              discoveryPending && install.project_path === pendingProjectPath
            ) &&
            !state.projects.some(
              (project) =>
                project.path === install.project_path &&
                project.status !== 'available'
            ) &&
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
      ...inventorySource.projects,
      {
        path: ADDITIONAL_PROJECT,
        kind: 'repository' as const,
        status: 'available' as const
      },
      {
        path: ADDITIONAL_PARENT,
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
    for (const skill of inventorySource.skills) {
      if (
        skill.project_root !== null &&
        hasFolderAccess(skill.project_root) &&
        !state.skills.some((row) => row.id === skill.id)
      )
        state.skills.push(copy(skill))
    }
  }

  function changeGrants(add: string[], remove: string[]): SampleGrantChange {
    const change = resolveSampleGrantChange(
      state.folders,
      { add, remove },
      state.now
    )
    state.folders = change.folders
    discoverProjects()
    refreshPlugins()
    notify()
    return change
  }

  // Stands in for the native "Choose Folders to Keep" dialog: the sample
  // keeps the first known repository inside the grant.
  function narrowingChoice(grant: string): string | null {
    const repositories = [
      ...inventorySource.projects,
      { path: ADDITIONAL_PROJECT, kind: 'repository' as const }
    ].filter((project) => project.kind === 'repository')
    return (
      repositories.find(
        (project) =>
          project.path !== grant && isWithinProjectPath(project.path, grant)
      )?.path ?? null
    )
  }

  function grantNotice(change: SampleGrantChange): string {
    const privacy = 'Your local folders are never accessed.'
    const [skipped] = change.skipped
    if (skipped)
      return `The sample ${projectName(skipped.path)} repository is already covered by ${projectName(skipped.coveredBy)}, so it was skipped. Narrow or remove ${projectName(skipped.coveredBy)} to grant it on its own. ${privacy}`
    if (change.added.includes(ADDITIONAL_PARENT))
      return `Granted the sample Clients parent folder and discovered its repositories.${change.absorbed.length > 0 ? ' It covers docs-site, so that separate grant was folded into it.' : ''} ${privacy}`
    return `Added the sample docs-site repository. Add Folder again to try a parent-folder grant. ${privacy}`
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
    const reportUpdate = (phase: PluginUpdateProgress['phase']) => {
      for (const subscriber of pluginProgressSubscriptions)
        subscriber(copy({ input, phase }))
    }
    try {
      if (verb === 'update') reportUpdate('marketplace')
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
        reportUpdate('install')
        updateInstallVersion(plugin, install)
        reportUpdate('verify')
      } else install.disabled_reason = verb === 'disable' ? 'plugin' : null
      refreshPlugins()
      inventorySource.skills = [
        ...copy(state.skills),
        ...inventorySource.skills.filter(
          (skill) =>
            skill.project_root !== null && !hasFolderAccess(skill.project_root)
        )
      ]
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
      // Like the desktop, the signal needs this session's transcripts and
      // prompt archive to be complete.
      const staleIds =
        options.scenario === 'scan-failed'
          ? new Set<number>()
          : findStaleSkillIds(skills, sampleStaleEvidence(state))
      return copy({
        skills: skills.map((skill) => ({
          ...skill,
          stale: staleIds.has(skill.id)
        })),
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
      if (options.scenario === 'projects-needs-access')
        return copy(
          state.projects.map((p) => ({ ...p, status: 'needs_access' as const }))
        )
      return copy(state.projects)
    },
    async pickAndAddFolders() {
      // Repository first, then its parent (which absorbs it), then the
      // repository again (which the parent now covers, so it is skipped).
      const pick = state.folders.some((row) => row.path === ADDITIONAL_PROJECT)
        ? ADDITIONAL_PARENT
        : ADDITIONAL_PROJECT
      const change = changeGrants([pick], [])
      options.onNotice?.(grantNotice(change))
      return copy({ folders: change.folders, skipped: change.skipped })
    },
    async narrowAllowedPath(path) {
      if (!state.folders.some((row) => row.path === path))
        throw new RangeError('Folder is not granted.')
      const keep = narrowingChoice(path)
      if (keep === null) {
        options.onNotice?.(
          'This sample folder has no repositories inside it to keep.'
        )
        return copy({ folders: state.folders, skipped: [] })
      }
      const change = changeGrants([keep], [path])
      options.onNotice?.(
        `Narrowed the sample ${projectName(path)} grant to ${projectName(keep)}. Everything else inside it lost access. Your local folders are never accessed.`
      )
      return copy({ folders: change.folders, skipped: change.skipped })
    },
    async revokeAllowedPath(path) {
      if (!state.folders.some((row) => row.path === path))
        throw new RangeError('Unknown sample repository.')
      return copy(changeGrants([], [path]).folders)
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
        components: samplePluginComponents(plugin),
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
      if (options.scenario === 'cost-empty') result.cost = null
      if (options.scenario === 'usage-empty')
        return buildUsageOverview({
          ...state,
          events: [],
          prompts: [],
          history: []
        })
      return copy(groupSampleUsageOverview(result, currentUsageLocations()))
    },
    async getUsageProjects() {
      checkScenario('usage-projects')
      if (options.scenario === 'usage-projects-loading')
        await new Promise(() => {})
      return sampleUsageProjectCatalog(currentUsageLocations())
    },
    linkUsageProjects: (input) =>
      changeUsageProjects(() =>
        linkSampleUsageProjects(currentUsageLocations(), input)
      ),
    unlinkUsageProject: (id) =>
      changeUsageProjects(() =>
        unlinkSampleUsageProject(currentUsageLocations(), id)
      ),
    async getContextBaseline() {
      checkScenario('context')
      const revision = sessionRevision
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      if (revision === sessionRevision)
        options.onNotice?.(
          'This is a synthetic /context sample. The preview never runs Claude Code, hooks, or MCP servers.'
        )
      if (options.scenario === 'context-unavailable')
        return {
          ok: false as const,
          error:
            'Claude Code CLI was not found. This is a simulated measurement failure.'
        }
      if (options.scenario === 'context-unreadable')
        return {
          ok: false as const,
          error: "Megatron couldn't read Claude Code's /context output.",
          raw: '## Context Usage\n\nAn illustrative unrecognized output format.'
        }
      return sampleContextBaseline(state.now)
    },
    async getRecordedRequest() {
      checkScenario('recorded')
      if (options.scenario === 'recorded-empty') return null
      return sampleRecordedRequest(state.now)
    },
    async getUsageCalendar(year: number) {
      checkScenario('calendar')
      const usageState =
        options.scenario === 'usage-empty'
          ? { ...state, events: [], prompts: [], history: [] }
          : state
      return copy(
        groupSampleCalendar(
          buildUsageCalendar(usageState, year),
          currentUsageLocations()
        )
      )
    },
    async getUsageDay(date: string) {
      checkScenario('calendar')
      const usageState =
        options.scenario === 'usage-empty'
          ? { ...state, events: [], prompts: [], history: [] }
          : state
      return copy(
        groupSampleDay(buildUsageDay(usageState, date), currentUsageLocations())
      )
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
      inventoryOnly = false
      lastScanWasStartup = false
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
      if (revision === sessionRevision) {
        inventoryOnly = false
        if (discoveryPending) {
          discoveryPending = false
          discoverProjects()
          refreshPlugins()
        }
        for (const source of scanSummary().sources) {
          for (const subscriber of scanProgressSubscriptions)
            subscriber(copy({ id: activity.id, source }))
        }
        notify(activity)
      }
      return scanSummary()
    },
    async revealDataFolder() {
      options.onNotice?.(
        'This browser preview has no local data folder. The desktop app stores its index on your machine.'
      )
    },
    getVersion: () => PREVIEW_APP_VERSION,
    getHomePath: () => SAMPLE_HOME,
    // An embedded welcome would cover the landing page; Settings → Show
    // welcome opens it on request.
    getInitialOnboarding: () => options.scenario === 'onboarding',
    async setOnboardingDone() {},
    async getUpdateState() {
      return copy(updateState)
    },
    async setAutoUpdateCheck(enabled) {
      if (typeof enabled !== 'boolean')
        throw new TypeError('Automatic update checks must be a boolean.')
      updateState = { ...updateState, autoCheck: enabled }
      for (const subscriber of updateSubscriptions)
        subscriber(copy(updateState))
    },
    async checkForUpdates() {
      options.onNotice?.(UPDATES_UNAVAILABLE_NOTICE)
    },
    async installUpdate() {
      options.onNotice?.(UPDATES_UNAVAILABLE_NOTICE)
    },
    async openUpdateDownload() {
      options.onNotice?.(
        'External links are shown as sample content in this preview.'
      )
    },
    onUpdateState(callback) {
      updateSubscriptions.add(callback)
      return () => {
        updateSubscriptions.delete(callback)
      }
    },
    onPluginUpdateProgress(callback) {
      pluginProgressSubscriptions.add(callback)
      return () => {
        pluginProgressSubscriptions.delete(callback)
      }
    },
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
    },
    onScanProgress(callback) {
      scanProgressSubscriptions.add(callback)
      return () => {
        scanProgressSubscriptions.delete(callback)
      }
    }
  }
  refreshPlugins()
  return {
    api,
    async simulateInventoryChange(action: InventoryChange) {
      if (!INVENTORY_CHANGES.includes(action))
        throw new RangeError('Unknown sample inventory change.')
      const revision = sessionRevision
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
      if (revision !== sessionRevision) return
      if (action === 'pending-project') {
        pendingProjectPath = ADDITIONAL_PROJECT
        discoveryPending = true
        if (!state.folders.some((folder) => folder.path === ADDITIONAL_PROJECT))
          state.folders.push({
            path: ADDITIONAL_PROJECT,
            granted_at: state.now
          })
        state.projects = state.projects.filter(
          (project) => project.path !== ADDITIONAL_PROJECT
        )
        refreshPlugins()
        inventoryOnly = true
        lastScanWasStartup = false
        notify()
        startSampleDiscovery()
        options.onNotice?.(
          'Granted the sample docs-site folder. Discovery is pending; cached counts stay visible without a refresh warning. Choose Complete folder discovery to continue.'
        )
        return
      }
      if (action === 'retry-project') {
        const path = pendingProjectPath ?? SAMPLE_PROJECT
        pendingProjectPath = path
        setSampleProjectAvailability(path, 'unavailable')
        inventoryOnly = true
        lastScanWasStartup = false
        notify(scanActivity)
        startSampleDiscovery()
        options.onNotice?.(
          'The sample folder has a confirmed read failure. Its warning and cached entries stay visible while a retry runs. Complete folder discovery to simulate recovery.'
        )
        return
      }
      if (action === 'recover-project') {
        const path = pendingProjectPath ?? SAMPLE_PROJECT
        setSampleProjectAvailability(path, 'available')
        inventoryOnly = true
        lastScanWasStartup = false
        notify(scanActivity)
        options.onNotice?.(
          'Sample folder discovery succeeded. Confirmed availability clears the warning and enables the readable sample install.'
        )
        return
      }
      const result = applyInventoryChange(
        {
          ...state,
          skills: inventorySource.skills,
          projects: inventorySource.projects
        },
        action
      )
      inventorySource = copy(result.state)
      state = result.state
      discoverProjects()
      refreshPlugins()
      inventoryOnly = true
      lastScanWasStartup = false
      notify()
      options.onNotice?.(result.message)
    },
    reset() {
      sessionRevision += 1
      pendingAction = false
      scanActivity = null
      lastScanWasStartup = STARTUP_SCAN_SCENARIOS.includes(
        options.scenario ?? ''
      )
      state = structuredClone(initial)
      usageLocations = reconcileSampleUsageProjects([], initial)
      inventorySource = structuredClone(initial)
      inventoryOnly = false
      pendingProjectPath = null
      discoveryPending = false
      refreshPlugins()
      section = options.initialSection ?? 'skills'
      theme = options.initialTheme ?? 'light'
      updateState = { ...INITIAL_UPDATE_STATE }
      for (const subscriber of updateSubscriptions)
        subscriber(copy(updateState))
      notify()
    }
  }
}
