import type {
  ActivityBucketDetails,
  ActivityDay,
  ActivityHour,
  ActivityStats,
  ActivityWindow,
  CostDay,
  CostHour,
  CostStats,
  CostWindow,
  EffortBucket,
  ModelStats,
  ModelStatsWindow,
  SkillCostAttribution,
  SkillInvocationRecord,
  SkillRow,
  SkillStats,
  SkillStatsWindow,
  SkillTrendBucket,
  TriggerTypeCount,
  UsageOverview
} from '../../vendor/megatron/src/shared/ipc'
import { isWithinProjectPath } from '../../vendor/megatron/src/shared/project-path.ts'
import {
  DAY_MS,
  HOUR_MS,
  SAMPLE_PROJECT,
  type SampleEvent,
  type SampleState
} from './fixtures.ts'

const WINDOW_DAYS = [1, 7, 30] as const
const WINDOW_KEYS = ['24h', '7d', '30d'] as const
const EFFORTS: EffortBucket[] = [
  'xhigh',
  'high',
  'medium',
  'low',
  'not_recorded'
]

export function localDate(timestamp: string | Date): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function sum<T>(rows: T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0)
}

function grouped<T>(
  rows: T[],
  key: (row: T) => string,
  value: (row: T) => number
): Map<string, number> {
  const totals = new Map<string, number>()
  for (const row of rows)
    totals.set(key(row), (totals.get(key(row)) ?? 0) + value(row))
  return new Map([...totals].sort((a, b) => b[1] - a[1]))
}

function sessionCount(events: SampleEvent[]): number {
  return new Set(events.map((event) => event.sessionId)).size
}

function eventsWithin(
  events: SampleEvent[],
  start: string,
  end: string
): SampleEvent[] {
  return events.filter((event) => event.at >= start && event.at < end)
}

function windowRange(
  now: string,
  days: number
): { startAt: string; endAt: string } {
  return {
    startAt: new Date(new Date(now).getTime() - days * DAY_MS).toISOString(),
    endAt: now
  }
}

function calendarDays(
  start: string,
  end: string
): {
  date: string
  weekday: number
  startAt: string
  endAt: string
  partial: boolean
}[] {
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)
  const result = []
  while (cursor.getTime() < new Date(end).getTime()) {
    const next = new Date(cursor)
    next.setDate(next.getDate() + 1)
    const startAt = new Date(
      Math.max(cursor.getTime(), new Date(start).getTime())
    ).toISOString()
    const endAt = new Date(
      Math.min(next.getTime(), new Date(end).getTime())
    ).toISOString()
    result.push({
      date: localDate(cursor),
      weekday: cursor.getDay(),
      startAt,
      endAt,
      partial: startAt !== cursor.toISOString() || endAt !== next.toISOString()
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

function timeMargins(
  events: SampleEvent[],
  value: (row: SampleEvent) => number
) {
  const byHourWeekday = Array.from({ length: 7 }, () =>
    Array<number>(24).fill(0)
  )
  for (const event of events) {
    const date = new Date(event.at)
    byHourWeekday[date.getDay()][date.getHours()] += value(event)
  }
  return {
    byHourWeekday,
    byHour: Array.from({ length: 24 }, (_, hour) =>
      sum(byHourWeekday, (row) => row[hour])
    ),
    byWeekday: byHourWeekday.map((row) => sum(row, (value) => value))
  }
}

export function resolveSampleSkill(
  skills: SkillRow[],
  name: string,
  project?: string
): SkillRow | null {
  const candidates = skills.filter(
    (skill) => skill.name === name && skill.shadowed_by_skill_id === null
  )
  const global = candidates.find(
    (skill) => skill.source_type === 'global' && skill.is_synced === 0
  )
  if (global) return global
  const preferred = candidates.some((skill) => skill.is_synced === 0)
    ? candidates.filter((skill) => skill.is_synced === 0)
    : candidates
  const scoped =
    project === undefined
      ? preferred
      : preferred.filter(
          (skill) =>
            skill.source_type !== 'project' ||
            (skill.project_root !== null &&
              isWithinProjectPath(project, skill.project_root))
        )
  return scoped.length === 1 ? scoped[0] : null
}

export function sampleInvocation(
  state: SampleState,
  event: SampleEvent
): SkillInvocationRecord {
  const target = resolveSampleSkill(
    state.skills,
    event.skillName ?? '',
    event.project
  )
  return {
    preceding_user_text: event.prompt,
    invoked_at: event.at,
    trigger_type: event.trigger,
    cwd: event.project,
    git_branch: 'main',
    agent_id: event.trigger === 'subagent' ? `agent-${event.sessionId}` : null,
    skillName: event.skillName ?? '',
    skillId: target?.id ?? null,
    sourceType: target?.source_type ?? null
  }
}

export function triggerCounts(events: SampleEvent[]): TriggerTypeCount[] {
  return ['user_invoked', 'autonomous', 'subagent']
    .map((trigger_type) => ({
      trigger_type: trigger_type as TriggerTypeCount['trigger_type'],
      count: events.filter((row) => row.trigger === trigger_type).length
    }))
    .filter((row) => row.count > 0)
}

// Shared by a whole window and each of its bars, as in the app, so a bar's
// details always reconcile with the totals around it.
function summarizeActivity(
  events: SampleEvent[]
): Omit<ActivityBucketDetails, 'startAt' | 'endAt'> {
  const prompts = events.filter((row) => !row.bareSlash)
  return {
    count: prompts.length,
    sessions: sessionCount(prompts),
    slashCommands: events.length - prompts.length,
    byProject: [
      ...grouped(
        prompts,
        (row) => row.project,
        () => 1
      )
    ].map(([project, count]) => ({ project, count }))
  }
}

function activityWindow(state: SampleState, days: 1 | 7 | 30): ActivityWindow {
  const range = windowRange(state.now, days)
  const all = eventsWithin(state.events, range.startAt, range.endAt)
  const prompts = all.filter((row) => !row.bareSlash)
  const summary = summarizeActivity(all)
  return {
    days,
    activeDays: new Set(prompts.map((row) => localDate(row.at))).size,
    sessions: summary.sessions,
    prompts: summary.count,
    slashCommands: summary.slashCommands,
    ...timeMargins(prompts, () => 1),
    byProject: summary.byProject,
    byDay: calendarDays(range.startAt, range.endAt).map((day): ActivityDay => ({
      ...day,
      ...summarizeActivity(eventsWithin(all, day.startAt, day.endAt))
    }))
  }
}

function hourlyBuckets(startAt: string): { startAt: string; endAt: string }[] {
  const start = new Date(startAt).getTime()
  return Array.from({ length: 24 }, (_, index) => ({
    startAt: new Date(start + index * HOUR_MS).toISOString(),
    endAt: new Date(start + (index + 1) * HOUR_MS).toISOString()
  }))
}

function costBreakdown(events: SampleEvent[]) {
  const priced = events.filter((row) => row.costCents !== null)
  return {
    costUsd: sum(priced, (row) => row.costCents ?? 0) / 100,
    pricedSessionCount: sessionCount(priced),
    hasUnknownModelCost: false,
    byModel: [
      ...grouped(
        priced,
        (row) => row.model,
        (row) => row.costCents ?? 0
      )
    ].map(([model, cents]) => ({ model, costUsd: cents / 100 })),
    byProject: [
      ...grouped(
        priced,
        (row) => row.project,
        (row) => row.costCents ?? 0
      )
    ].map(([project, cents]) => ({ project, costUsd: cents / 100 }))
  }
}

function costWindow(state: SampleState, days: 1 | 7 | 30): CostWindow {
  const range = windowRange(state.now, days)
  const events = eventsWithin(state.events, range.startAt, range.endAt)
  const breakdown = costBreakdown(events)
  const byDay: CostDay[] = calendarDays(range.startAt, range.endAt).map(
    (day) => ({
      ...day,
      ...costBreakdown(eventsWithin(events, day.startAt, day.endAt))
    })
  )
  const byHourChronological: CostHour[] =
    days === 1
      ? hourlyBuckets(range.startAt).map((hour) => ({
          ...hour,
          ...costBreakdown(eventsWithin(events, hour.startAt, hour.endAt))
        }))
      : []
  const margins = timeMargins(events, (row) => (row.costCents ?? 0) / 100)
  return {
    days,
    ...range,
    totalCostUsd: breakdown.costUsd,
    pricedSessionCount: breakdown.pricedSessionCount,
    hasUnknownModelCost: breakdown.hasUnknownModelCost,
    byModel: breakdown.byModel,
    byProject: breakdown.byProject,
    byDay,
    byHourChronological,
    ...margins
  }
}

function modelWindow(
  state: SampleState,
  days: 1 | 7 | 30,
  window: '24h' | '7d' | '30d'
): ModelStatsWindow {
  const range = windowRange(state.now, days)
  const events = eventsWithin(state.events, range.startAt, range.endAt)
  const models = [...new Set(events.map((row) => row.model))]
  return {
    window,
    turnCount: events.length,
    modelCount: models.length,
    outputTokens: sum(events, (row) => row.outputTokens),
    byModel: models.map((model) => {
      const rows = events.filter((row) => row.model === model)
      return {
        model,
        turnCount: rows.length,
        outputTokens: sum(rows, (row) => row.outputTokens)
      }
    }),
    byEffort: EFFORTS.map((effort) => {
      const rows = events.filter((row) => row.effort === effort)
      return {
        effort,
        turnCount: rows.length,
        outputTokens: sum(rows, (row) => row.outputTokens)
      }
    }).filter((row) => row.turnCount > 0),
    matrix: models.map((model) => {
      const rows = events.filter((row) => row.model === model)
      return {
        model,
        total: rows.length,
        byEffort: Object.fromEntries(
          EFFORTS.map((effort) => [
            effort,
            rows.filter((row) => row.effort === effort).length
          ])
        ) as Record<EffortBucket, number>
      }
    })
  }
}

function costAttribution(
  state: SampleState,
  events: SampleEvent[]
): SkillCostAttribution {
  const priced = events.filter((row) => row.costCents !== null)
  const buckets = new Map<string | null, SampleEvent[]>()
  for (const event of priced) {
    const rows = buckets.get(event.skillName) ?? []
    rows.push(event)
    buckets.set(event.skillName, rows)
  }
  const totalEstimatedCostCents = sum(priced, (row) => row.costCents ?? 0)
  return {
    totalEstimatedCostCents,
    trackedSessionCount: sessionCount(priced),
    hasUnknownModelCost: false,
    hasUndatedCost: true,
    rows: [...buckets]
      .map(([skillName, rows]) => {
        const skill =
          skillName === null
            ? null
            : resolveSampleSkill(state.skills, skillName)
        const cents = sum(rows, (row) => row.costCents ?? 0)
        return {
          skillName,
          skillId: skill?.id ?? null,
          sourceType: skill?.source_type ?? null,
          trackedSessionCount: sessionCount(rows),
          estimatedCostCents: cents,
          share:
            totalEstimatedCostCents > 0 ? cents / totalEstimatedCostCents : 0,
          resolution:
            skillName === null
              ? ('general' as const)
              : skill
                ? ('installed' as const)
                : state.skills.some((row) => row.name === skillName)
                  ? ('ambiguous' as const)
                  : ('missing' as const)
        }
      })
      .sort((a, b) => b.estimatedCostCents - a.estimatedCostCents)
  }
}

function skillWindow(
  state: SampleState,
  days: 1 | 7 | 30,
  window: '24h' | '7d' | '30d'
): SkillStatsWindow {
  const range = windowRange(state.now, days)
  const all = eventsWithin(state.events, range.startAt, range.endAt)
  const invocations = all.filter((row) => row.skillName !== null)
  const buckets =
    days === 1
      ? hourlyBuckets(range.startAt).map((hour) => ({
          ...hour,
          key: hour.startAt
        }))
      : calendarDays(range.startAt, range.endAt).map((day) => ({
          startAt: day.startAt,
          endAt: day.endAt,
          key: day.date
        }))
  const trend: SkillTrendBucket[] = buckets.map((bucket) => ({
    ...bucket,
    count: eventsWithin(invocations, bucket.startAt, bucket.endAt).length
  }))
  const bySkill = [
    ...grouped(
      invocations,
      (row) => row.skillName as string,
      () => 1
    )
  ].map(([skillName, count]) => {
    const target = resolveSampleSkill(state.skills, skillName)
    return {
      skillName,
      count,
      skillId: target?.id ?? null,
      sourceType: target?.source_type ?? null,
      resolution: target
        ? ('installed' as const)
        : state.skills.some((row) => row.name === skillName)
          ? ('ambiguous' as const)
          : ('missing' as const)
    }
  })
  return {
    window,
    ...range,
    invocationCount: invocations.length,
    unpricedInvocationCount: invocations.filter((row) => row.costCents === null)
      .length,
    skillCount: bySkill.length,
    sessionCount: sessionCount(invocations),
    bySkill,
    byTriggerType: triggerCounts(invocations),
    trend,
    attribution: costAttribution(state, all),
    associations: bySkill.map((row) => {
      const events = invocations.filter(
        (event) => event.skillName === row.skillName
      )
      const priced = events.filter((event) => event.costCents !== null)
      return {
        skillName: row.skillName,
        skillId: row.skillId,
        sourceType: row.sourceType,
        sessionCount: sessionCount(events),
        trackedSessionCount: sessionCount(priced),
        associatedCostUsd: sum(priced, (event) => event.costCents ?? 0) / 100,
        associatedOutputTokens: sum(priced, (event) => event.outputTokens)
      }
    })
  }
}

export function buildUsageOverview(state: SampleState): UsageOverview {
  const [activity24h, activity7d, activity30d] = WINDOW_DAYS.map((days) =>
    activityWindow(state, days)
  )
  const start24h = windowRange(state.now, 1).startAt
  const activity: ActivityStats = {
    last24h: {
      ...activity24h,
      days: 1,
      hourlyTrend: hourlyBuckets(start24h).map((hour): ActivityHour => ({
        key: hour.startAt,
        ...hour,
        ...summarizeActivity(
          eventsWithin(state.events, hour.startAt, hour.endAt)
        )
      }))
    },
    last7d: activity7d,
    last30d: activity30d,
    generatedAt: state.now
  }
  const [cost24h, cost7d, cost30d] = WINDOW_DAYS.map((days) =>
    costWindow(state, days)
  )
  const cost: CostStats = {
    trackedSince: windowRange(state.now, 30).startAt,
    totalTrackedCostUsd: cost30d.totalCostUsd + 11.28,
    pricedSessionCount: sessionCount(
      state.events.filter((row) => row.costCents !== null)
    ),
    preTrackingSessionCount: 8,
    unusableSessionCount: 3,
    undatedCostUsd: 11.28,
    undatedSessionCount: 2,
    last24h: cost24h,
    last7d: cost7d,
    last30d: cost30d
  }
  const [model24h, model7d, model30d] = WINDOW_DAYS.map((days, index) =>
    modelWindow(state, days, WINDOW_KEYS[index])
  )
  const models: ModelStats = {
    last24h: model24h,
    last7d: model7d,
    last30d: model30d
  }
  const [skills24h, skills7d, skills30d] = WINDOW_DAYS.map((days, index) =>
    skillWindow(state, days, WINDOW_KEYS[index])
  )
  const skills: SkillStats = {
    last24h: skills24h,
    last7d: skills7d,
    last30d: skills30d,
    pricedSessionsWithoutSkill: 0
  }
  return {
    activity,
    cost: state.events.some((event) => event.costCents !== null) ? cost : null,
    models,
    skills,
    scanComplete: true,
    residentTax:
      state.events.length === 0
        ? null
        : {
            measuredTokens: 18200,
            sampledAt: new Date(
              new Date(state.now).getTime() - HOUR_MS
            ).toISOString(),
            project: SAMPLE_PROJECT,
            model: 'claude-sonnet-5-5',
            claudeVersion: '2.1.0',
            categories: [
              { key: 'skills', tokens: 1800, itemCount: 20, estimated: true },
              { key: 'agents', tokens: 2400, itemCount: 4, estimated: true },
              { key: 'hooks', tokens: 1100, itemCount: 2, estimated: true },
              { key: 'mcp', tokens: 3700, itemCount: 3, estimated: true },
              {
                key: 'instructions',
                tokens: 2900,
                itemCount: 2,
                estimated: true
              },
              {
                key: 'remainder',
                tokens: 6300,
                itemCount: null,
                estimated: false
              }
            ]
          }
  }
}
