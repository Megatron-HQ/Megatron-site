import type {
  HistoryCoverage,
  PluginRow,
  SkillRow
} from '../../vendor/megatron/src/shared/ipc'
import { isWithinProjectPath } from '../../vendor/megatron/src/shared/project-path.ts'
import { DAY_MS, type SampleState } from './fixtures.ts'

// Mirrors the desktop's stale-skill rule (src/main/db/stale-skills.ts,
// docs/usage-analytics.md "Stale skills") over the synthetic sample. Every
// unknown resolves to no signal, because a missing icon costs less than a
// false one.
export const STALE_WINDOW_DAYS = 30

export interface SkillActivityObservation {
  project: string
  at: string
}

export interface StaleSkillEvidence {
  // The last prompt observation, not the wall clock.
  asOf: string
  coverage: HistoryCoverage
  observations: SkillActivityObservation[]
  plugins: PluginRow[]
  // Global and project sample skills predate the retained history.
  localSkillsExistedSince: string | null
}

type ActivityScope = string[] | 'everywhere'

function timeOf(value: string | null | undefined): number | null {
  const time = Date.parse(value ?? '')
  return time > 0 ? time : null
}

function pluginSkillOrigin(
  skill: SkillRow,
  plugins: PluginRow[]
): { existedSince: number | null; scope: ActivityScope } {
  const installs = plugins
    .filter((row) => `${row.name}@${row.marketplace}` === skill.plugin_name)
    .flatMap((row) => row.installs)
  const installedAt = installs
    .map((install) => timeOf(install.installed_at))
    .filter((time): time is number => time !== null)
  return {
    existedSince: installedAt.length > 0 ? Math.min(...installedAt) : null,
    scope: installs.some((install) => install.scope === 'user')
      ? 'everywhere'
      : installs
          .map((install) => install.project_path)
          .filter((path): path is string => path !== null && path !== '')
  }
}

function localSkillScope(skill: SkillRow): ActivityScope {
  if (skill.source_type === 'global') return 'everywhere'
  return skill.project_root === null ? [] : [skill.project_root]
}

// A scope only gives a signal when it was in use on both sides of the window
// start: an idle repository had no chance to run the skill.
function hadOpportunity(
  scope: ActivityScope,
  observations: SkillActivityObservation[],
  windowStart: number
): boolean {
  const active =
    scope === 'everywhere'
      ? observations
      : observations.filter((row) =>
          scope.some((root) => isWithinProjectPath(row.project, root))
        )
  return (
    active.some((row) => Date.parse(row.at) < windowStart) &&
    active.some((row) => Date.parse(row.at) >= windowStart)
  )
}

export function findStaleSkillIds(
  skills: SkillRow[],
  evidence: StaleSkillEvidence
): Set<number> {
  const stale = new Set<number>()
  const asOf = timeOf(evidence.asOf)
  if (asOf === null || evidence.coverage !== 'available') return stale
  const windowStart = asOf - STALE_WINDOW_DAYS * DAY_MS
  for (const skill of skills) {
    if (skill.disabled_reason !== null || skill.shadowed_by_skill_id !== null)
      continue
    const { existedSince, scope } =
      skill.source_type === 'plugin'
        ? pluginSkillOrigin(skill, evidence.plugins)
        : {
            existedSince: timeOf(evidence.localSkillsExistedSince),
            scope: localSkillScope(skill)
          }
    if (existedSince === null || existedSince >= windowStart) continue
    if (!hadOpportunity(scope, evidence.observations, windowStart)) continue
    const lastInvoked = timeOf(skill.last_invoked_at)
    if (lastInvoked === null || lastInvoked < windowStart) stale.add(skill.id)
  }
  return stale
}

export function sampleStaleEvidence(state: SampleState): StaleSkillEvidence {
  const recentPrompts = (state.prompts ?? [])
    .filter((prompt) => !prompt.bareSlash)
    .map(({ project, at }) => ({ project, at }))
  const archivedDays = state.history.flatMap((day) =>
    day.byProject
      .filter((row) => row.count > 0)
      .map((row) => ({ project: row.project, at: day.startAt }))
  )
  return {
    asOf: state.now,
    coverage:
      state.promptCoverage === undefined || state.promptCoverage === 'future'
        ? 'available'
        : state.promptCoverage,
    observations: [...archivedDays, ...recentPrompts],
    plugins: state.plugins,
    localSkillsExistedSince: state.history[0]?.startAt ?? null
  }
}
