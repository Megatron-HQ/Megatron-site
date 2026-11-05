import type {
  TokenCounts,
  TokenStats,
  TokenWindow,
  TokenBreakdown,
  TokenBucket,
  ContributionDay,
  HistoryMonth,
  HistoryProject,
  HistoryYearSummary,
  UsageCalendar,
  UsageDayDetails
} from '../../vendor/megatron/src/shared/ipc'
import {
  DAY_MS,
  HOUR_MS,
  type SampleEvent,
  type SampleState
} from './fixtures.ts'

const MINIMUM_YEAR = 1970
const MAXIMUM_YEAR = 9999
const HISTORY_WINDOW_DAYS = 30
const THRESHOLD_QUANTILES = [0.25, 0.5, 0.75]
const MONTHS_PER_YEAR = 12

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function nextLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
}

function sumTokens(rows: TokenCounts[]): TokenCounts {
  const counts = rows.reduce(
    (sum, row) => ({
      input: sum.input + row.input,
      output: sum.output + row.output,
      cacheRead: sum.cacheRead + row.cacheRead,
      cacheWrite: sum.cacheWrite + row.cacheWrite
    }),
    { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  )
  return {
    ...counts,
    total: counts.input + counts.output + counts.cacheRead + counts.cacheWrite
  }
}

function eventTokens(events: SampleEvent[]): TokenCounts | null {
  const rows = events.flatMap((event) =>
    event.tokens === null ? [] : [event.tokens]
  )
  return rows.length === 0 ? null : sumTokens(rows)
}

function tokenBreakdown(
  events: SampleEvent[],
  dimension: 'model' | 'project'
): TokenBreakdown[] {
  const groups = new Map<string, TokenCounts[]>()
  for (const event of events) {
    if (event.tokens === null) continue
    const key = event[dimension]
    const rows = groups.get(key) ?? []
    rows.push(event.tokens)
    groups.set(key, rows)
  }
  return [...groups]
    .map(([key, rows]) => ({ key, tokens: sumTokens(rows) }))
    .sort(
      (a, b) => b.tokens.total - a.tokens.total || a.key.localeCompare(b.key)
    )
}

function tokenWindow(state: SampleState, days: number): TokenWindow {
  const now = new Date(state.now).getTime()
  const start = new Date(now - days * DAY_MS)
  const end = new Date(now + 1)
  const startAt = start.toISOString()
  const endAt = end.toISOString()
  const events = state.events.filter(
    (event) => event.at >= startAt && event.at < endAt
  )
  const cursor = new Date(start)
  if (days !== 1) cursor.setHours(0, 0, 0, 0)
  const trend: TokenBucket[] = []
  while (cursor < end && (days !== 1 || trend.length < 24)) {
    const next =
      days === 1
        ? new Date(
            trend.length === 23 ? end.getTime() : cursor.getTime() + HOUR_MS
          )
        : nextLocalMidnight(cursor)
    const bucketStart = new Date(
      Math.max(cursor.getTime(), start.getTime())
    ).toISOString()
    const bucketEnd = new Date(
      Math.min(next.getTime(), end.getTime())
    ).toISOString()
    trend.push({
      key: days === 1 ? cursor.toISOString() : dateKey(cursor),
      startAt: bucketStart,
      endAt: bucketEnd,
      tokens: eventTokens(
        events.filter(
          (event) => event.at >= bucketStart && event.at < bucketEnd
        )
      )
    })
    cursor.setTime(next.getTime())
  }
  return {
    startAt,
    endAt,
    tokens: eventTokens(events),
    byModel: tokenBreakdown(events, 'model'),
    byProject: tokenBreakdown(events, 'project'),
    trend
  }
}

export function buildTokenStats(state: SampleState): TokenStats {
  return {
    last24h: tokenWindow(state, 1),
    last7d: tokenWindow(state, 7),
    last30d: tokenWindow(state, 30),
    missingSessionCount: new Set(
      state.events
        .filter((event) => event.tokens === null)
        .map((event) => event.sessionId)
    ).size,
    undatedTokens: sumTokens([])
  }
}

export function buildUsageDay(
  state: SampleState,
  date: string
): UsageDayDetails {
  const start = new Date(`${date}T00:00:00`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(start.getTime()) ||
    dateKey(start) !== date
  ) {
    throw new RangeError('Invalid history date.')
  }
  const now = new Date(state.now)
  const next = nextLocalMidnight(start)
  const future = start > now
  const archived = state.history.find((day) => day.date === date)
  if (archived && !future) return structuredClone(archived)
  const end = future
    ? next
    : new Date(Math.min(next.getTime(), now.getTime() + 1))
  const startAt = start.toISOString()
  const endAt = end.toISOString()
  const events = state.events.filter(
    (event) => event.at >= startAt && event.at < endAt && event.at <= state.now
  )
  const promptEvents = (
    state.prompts ?? state.events.map((event) => ({ ...event, copies: 1 }))
  ).filter(
    (event) => event.at >= startAt && event.at < endAt && event.at <= state.now
  )
  const prompts = promptEvents.filter((event) => !event.bareSlash)
  const byProject = new Map<string, number>()
  for (const event of prompts)
    byProject.set(
      event.project,
      (byProject.get(event.project) ?? 0) + event.copies
    )
  const cutoff = new Date(now.getTime() - HISTORY_WINDOW_DAYS * DAY_MS)
  return {
    date,
    weekday: start.getDay(),
    startAt,
    endAt,
    partial: next > now,
    count: prompts.reduce((total, prompt) => total + prompt.copies, 0),
    sessions: new Set(prompts.map((event) => event.sessionId)).size,
    slashCommands: promptEvents
      .filter((event) => event.bareSlash)
      .reduce((total, prompt) => total + prompt.copies, 0),
    byProject: [...byProject]
      .map(([project, count]) => ({ project, count }))
      .sort((a, b) => b.count - a.count || a.project.localeCompare(b.project)),
    coverage: future
      ? 'future'
      : (state.promptCoverage ??
        (next <= cutoff
          ? 'unavailable'
          : start < cutoff
            ? 'partial'
            : 'available')),
    tokens: eventTokens(events)
  }
}

export function sampleHistoryCoverage(
  state: SampleState,
  startAt: string,
  endAt: string
): 'available' | 'partial' | 'unavailable' {
  if (state.promptCoverage && state.promptCoverage !== 'future')
    return state.promptCoverage
  const cursor = new Date(startAt)
  cursor.setHours(0, 0, 0, 0)
  const coverage: string[] = []
  while (cursor < new Date(endAt) && cursor <= new Date(state.now)) {
    coverage.push(buildUsageDay(state, dateKey(cursor)).coverage)
    cursor.setDate(cursor.getDate() + 1)
  }
  if (coverage.every((value) => value === 'available')) return 'available'
  return coverage.every((value) => value === 'unavailable')
    ? 'unavailable'
    : 'partial'
}

function summarizeHistory(days: ContributionDay[]): HistoryYearSummary {
  let longestStreak: HistoryYearSummary['longestStreak'] = null
  let busiestDay: HistoryYearSummary['busiestDay'] = null
  let streakDays = 0
  let streakStart = ''
  for (const day of days) {
    if (day.count > (busiestDay?.count ?? 0))
      busiestDay = { date: day.date, count: day.count }
    if (
      day.count === 0 ||
      day.coverage === 'unavailable' ||
      day.coverage === 'future'
    ) {
      streakDays = 0
      continue
    }
    if (streakDays === 0) streakStart = day.date
    streakDays++
    if (streakDays > (longestStreak?.days ?? 0))
      longestStreak = {
        days: streakDays,
        startDate: streakStart,
        endDate: day.date
      }
  }
  const activeDays = days.filter((day) => day.count > 0)
  return {
    observedDays: days.filter(
      (day) => day.coverage === 'available' || day.coverage === 'partial'
    ).length,
    partialDays: days.filter((day) => day.coverage === 'partial').length,
    elapsedDays: days.filter((day) => day.coverage !== 'future').length,
    longestStreak,
    busiestDay,
    promptsPerActiveDay:
      activeDays.length === 0
        ? null
        : activeDays.reduce((sum, day) => sum + day.count, 0) /
          activeDays.length
  }
}

function historyMonths(days: ContributionDay[]): HistoryMonth[] {
  return Array.from({ length: MONTHS_PER_YEAR }, (_, index) => {
    const monthDays = days.filter(
      (day) => Number(day.date.slice(5, 7)) === index + 1
    )
    const elapsed = monthDays.filter((day) => day.coverage !== 'future')
    const coverage =
      elapsed.length === 0
        ? 'future'
        : elapsed.every((day) => day.coverage === 'unavailable')
          ? 'unavailable'
          : elapsed.every((day) => day.coverage === 'available')
            ? 'available'
            : 'partial'
    return {
      month: index + 1,
      count: monthDays.reduce((sum, day) => sum + day.count, 0),
      coverage
    }
  })
}

function historyProjects(days: UsageDayDetails[]): HistoryProject[] {
  const projects = new Map<string, HistoryProject>()
  for (const day of days) {
    const monthIndex = Number(day.date.slice(5, 7)) - 1
    for (const row of day.byProject) {
      const project = projects.get(row.project) ?? {
        project: row.project,
        total: 0,
        byMonth: Array<number>(MONTHS_PER_YEAR).fill(0)
      }
      project.byMonth[monthIndex] += row.count
      project.total += row.count
      projects.set(row.project, project)
    }
  }
  return [...projects.values()].sort(
    (a, b) => b.total - a.total || a.project.localeCompare(b.project)
  )
}

export function buildUsageCalendar(
  state: SampleState,
  year: number
): UsageCalendar {
  if (!Number.isInteger(year) || year < MINIMUM_YEAR || year > MAXIMUM_YEAR) {
    throw new RangeError('Invalid history year.')
  }
  const now = new Date(state.now)
  const years = [
    ...new Set([
      now.getFullYear(),
      ...state.history.map((day) => Number(day.date.slice(0, 4))),
      ...state.events.map((event) => new Date(event.at).getFullYear())
    ])
  ]
    .filter((value) => value >= MINIMUM_YEAR && value <= now.getFullYear())
    .sort((a, b) => b - a)
  const countsByDate = new Map(
    state.history
      .filter((day) => day.date <= dateKey(now))
      .map((day) => [day.date, day.count])
  )
  const archivedDates = new Set(countsByDate.keys())
  for (const event of state.events) {
    if (event.bareSlash || event.at > state.now) continue
    const key = dateKey(new Date(event.at))
    if (archivedDates.has(key)) continue
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1)
  }
  const counts = [...countsByDate.values()]
    .filter((count) => count > 0)
    .sort((a, b) => a - b)
  const thresholds = THRESHOLD_QUANTILES.map(
    (fraction) =>
      counts[Math.max(0, Math.ceil(counts.length * fraction) - 1)] ?? 1
  )
  const details: UsageDayDetails[] = []
  const cursor = new Date(year, 0, 1)
  while (cursor.getFullYear() === year) {
    details.push(buildUsageDay(state, dateKey(cursor)))
    cursor.setDate(cursor.getDate() + 1)
  }
  const days = details.map(({ date, weekday, count, coverage, tokens }) => ({
    date,
    weekday,
    count,
    coverage,
    tokens
  }))
  return {
    year,
    years,
    days,
    thresholds,
    prompts: days.reduce((sum, day) => sum + day.count, 0),
    activeDays: days.filter((day) => day.count > 0).length,
    summary: summarizeHistory(days),
    months: historyMonths(days),
    byProject: historyProjects(details)
  }
}
