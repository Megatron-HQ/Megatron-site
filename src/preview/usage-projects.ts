import type {
  ActivityWindow,
  CostWindow,
  UsageCalendar,
  UsageDayDetails,
  UsageOverview
} from '../../vendor/megatron/src/shared/ipc'
import {
  primaryUsageProject,
  readProjectIdentity,
  usageProjectOwner,
  type ProjectIdentity
} from '../../vendor/megatron/src/shared/project-identity.ts'
import {
  normalizeProjectPath,
  isWithinProjectPath
} from '../../vendor/megatron/src/shared/project-path.ts'
import {
  groupProjectCounts,
  groupProjectMonths,
  groupProjectSpending,
  groupProjectTokens,
  isClaudeAppScratchPath,
  type UsageProject,
  type UsageProjectCatalog,
  type UsageProjectLocation
} from '../../vendor/megatron/src/shared/usage-projects.ts'
import {
  SAMPLE_CLAUDE_APP_CHATS,
  SAMPLE_HOME,
  windowsPath,
  type SampleState
} from './fixtures.ts'

const MAXIMUM_LOCATION_ID_LENGTH = 128

export function sampleSkillProject(path: string, state: SampleState): string {
  const identity = readProjectIdentity(
    { locations: [], claudeCodeFolders: [windowsPath(SAMPLE_HOME, '.claude')] },
    state.worktrees
  )
  return identity.checkoutOf(path)?.path ?? path
}

export function reconcileSampleUsageProjects(
  previous: UsageProjectLocation[],
  state: SampleState
): UsageProjectLocation[] {
  const locations = structuredClone(previous)
  for (const project of state.projects) {
    const existing = locations.find(
      (location) =>
        normalizeProjectPath(location.path) ===
        normalizeProjectPath(project.path)
    )
    if (existing) {
      if (
        existing.kind === 'folder' &&
        project.kind === 'repository' &&
        existing.inferredOwner
      ) {
        delete existing.linkedTo
        delete existing.inferredOwner
      }
      if (project.kind === 'repository') existing.kind = 'repository'
      existing.path = project.path
    } else
      locations.push({ ...project, id: `sample-location:${locations.length}` })
  }
  for (const worktree of state.worktrees ?? []) {
    const checkout = usageProjectOwner(worktree.canonical, locations)
    if (
      !checkout ||
      locations.some((location) => location.path === worktree.path)
    )
      continue
    locations.push({
      id: `sample-location:${locations.length}`,
      path: worktree.path,
      kind: 'repository',
      status: 'available',
      linkedTo: checkout.id,
      worktree: true,
      worktreeEvidence: 'git'
    })
  }
  const paths = [
    ...state.events.map((event) => event.project),
    ...(state.prompts ?? []).map((prompt) => prompt.project),
    ...state.history.flatMap((day) =>
      day.byProject.map((project) => project.project)
    )
  ]
  for (const path of paths) {
    if (!path || usageProjectOwner(path, locations)) continue
    locations.push({
      id: `sample-location:${locations.length}`,
      path,
      kind: 'folder',
      status: 'needs_access'
    })
  }
  for (const location of locations) {
    const granted = state.folders.some((folder) =>
      isWithinProjectPath(location.path, folder.path)
    )
    const known = state.projects.find(
      (project) =>
        normalizeProjectPath(project.path) ===
        normalizeProjectPath(location.path)
    )
    location.status = !granted
      ? 'needs_access'
      : (known?.status ?? (location.worktree ? 'available' : 'missing'))
    if (
      location.kind === 'repository' ||
      (location.linkedTo && !location.inferredOwner)
    )
      continue
    const owner = locations
      .filter(
        (candidate) =>
          candidate.kind === 'repository' &&
          candidate.id !== location.id &&
          isWithinProjectPath(location.path, candidate.path)
      )
      .sort((a, b) => b.path.length - a.path.length)[0]
    if (owner) {
      location.linkedTo = primaryUsageProject(owner, locations).id
      location.inferredOwner = true
    }
  }
  return locations
}

function pathParts(path: string): string[] {
  return path.replace(/\\/g, '/').replace(/\/+$/, '').split('/')
}

type ClaudeAppChat = NonNullable<UsageProject['chat']>

// Like the desktop, a chat is marked at read time from its title and its
// earliest recorded start; neither is stored with the location.
export function sampleClaudeAppChat(
  state: SampleState,
  path: string
): ClaudeAppChat | null {
  if (!isClaudeAppScratchPath(path)) return null
  const key = normalizeProjectPath(path)
  const matches = (project: string) => normalizeProjectPath(project) === key
  const starts = [
    ...state.events.filter((event) => matches(event.project)),
    ...(state.prompts ?? []).filter((prompt) => matches(prompt.project))
  ]
    .map((record) => record.at)
    .concat(
      state.history
        .filter((day) => day.byProject.some((row) => matches(row.project)))
        .map((day) => day.startAt)
    )
    .sort()
  return {
    title:
      SAMPLE_CLAUDE_APP_CHATS.find((chat) => matches(chat.path))?.title ?? null,
    startedAt: starts[0] ?? null
  }
}

export function sampleUsageProjectCatalog(
  locations: UsageProjectLocation[],
  claudeCodeFolders: string[],
  chatOf: (path: string) => ClaudeAppChat | null = () => null
): UsageProjectCatalog {
  const roots = locations.filter((location) => !location.linkedTo)
  const labels = roots.map((location) => ({
    location,
    parts: pathParts(location.path),
    depth: 1
  }))
  let changed = true
  while (changed) {
    changed = false
    const groups = new Map<string, typeof labels>()
    for (const label of labels) {
      const name = label.parts.slice(-label.depth).join('/').toLowerCase()
      groups.set(name, [...(groups.get(name) ?? []), label])
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue
      for (const label of group) {
        if (label.depth >= label.parts.length) continue
        label.depth++
        changed = true
      }
    }
  }
  return structuredClone({
    locations,
    claudeCodeFolders,
    projects: labels
      .map(({ location, parts, depth }) => ({
        ...(chatOf(location.path) ? { chat: chatOf(location.path)! } : {}),
        id: location.id,
        path: location.path,
        label: parts.slice(-depth).join('/'),
        locations: locations.filter(
          (entry) => primaryUsageProject(entry, locations).id === location.id
        ),
        possibleMatches: roots
          .filter(
            (other) =>
              other.id !== location.id &&
              pathParts(other.path).at(-1)!.toLowerCase() ===
                parts.at(-1)!.toLowerCase()
          )
          .map((other) => other.id)
      }))
      .sort(
        (a, b) => a.label.localeCompare(b.label) || a.path.localeCompare(b.path)
      )
  })
}

export function linkSampleUsageProjects(
  locations: UsageProjectLocation[],
  input: { sourceId: string; targetId: string }
): UsageProjectLocation[] {
  if (
    !input ||
    Object.keys(input).length !== 2 ||
    typeof input.sourceId !== 'string' ||
    typeof input.targetId !== 'string' ||
    !input.sourceId ||
    !input.targetId ||
    input.sourceId.length > MAXIMUM_LOCATION_ID_LENGTH ||
    input.targetId.length > MAXIMUM_LOCATION_ID_LENGTH ||
    input.sourceId === input.targetId
  )
    throw new RangeError('Invalid project location IDs.')
  const source = locations.find((location) => location.id === input.sourceId)
  const target = locations.find((location) => location.id === input.targetId)
  if (!source || !target) throw new RangeError('Unknown project location.')
  const from = primaryUsageProject(source, locations)
  const to = primaryUsageProject(target, locations)
  if (from.id === to.id)
    throw new RangeError('These locations already belong to the same project.')
  return locations.map((location) =>
    primaryUsageProject(location, locations).id === from.id
      ? { ...location, linkedTo: to.id }
      : { ...location }
  )
}

export function unlinkSampleUsageProject(
  locations: UsageProjectLocation[],
  id: string
): UsageProjectLocation[] {
  const location = locations.find((entry) => entry.id === id)
  if (!location) throw new RangeError('Unknown project location.')
  if (location.worktree || location.inferredOwner || !location.linkedTo)
    throw new RangeError('Choose a confirmed linked location to separate.')
  return locations.map((entry) => {
    const result = { ...entry }
    if (entry.id === id) delete result.linkedTo
    return result
  })
}

function groupActivity(window: ActivityWindow, identity: ProjectIdentity) {
  return {
    ...window,
    byProject: groupProjectCounts(window.byProject, identity),
    byDay: window.byDay.map((day) => ({
      ...day,
      byProject: groupProjectCounts(day.byProject, identity)
    }))
  }
}

function groupCost(window: CostWindow, identity: ProjectIdentity): CostWindow {
  return {
    ...window,
    byProject: groupProjectSpending(window.byProject, identity),
    byDay: window.byDay.map((day) => ({
      ...day,
      byProject: groupProjectSpending(day.byProject, identity)
    })),
    byHourChronological: window.byHourChronological.map((hour) => ({
      ...hour,
      byProject: groupProjectSpending(hour.byProject, identity)
    }))
  }
}

export function groupSampleUsageOverview(
  overview: UsageOverview,
  identity: ProjectIdentity
): UsageOverview {
  const grouped = structuredClone(overview)
  for (const key of ['last24h', 'last7d', 'last30d'] as const) {
    Object.assign(
      grouped.activity[key],
      groupActivity(grouped.activity[key], identity)
    )
    grouped.tokens[key].byProject = groupProjectTokens(
      grouped.tokens[key].byProject,
      identity
    )
    grouped.tokens[key].trend = grouped.tokens[key].trend.map((bucket) => ({
      ...bucket,
      byProject: groupProjectTokens(bucket.byProject, identity)
    }))
    if (grouped.cost) grouped.cost[key] = groupCost(grouped.cost[key], identity)
  }
  grouped.activity.last24h.hourlyTrend =
    grouped.activity.last24h.hourlyTrend.map((hour) => ({
      ...hour,
      byProject: groupProjectCounts(hour.byProject, identity)
    }))
  return grouped
}

export function groupSampleCalendar(
  calendar: UsageCalendar,
  identity: ProjectIdentity
): UsageCalendar {
  return {
    ...calendar,
    byProject: groupProjectMonths(calendar.byProject, identity)
  }
}

export function groupSampleDay(
  day: UsageDayDetails,
  identity: ProjectIdentity
): UsageDayDetails {
  return { ...day, byProject: groupProjectCounts(day.byProject, identity) }
}
