import type {
  TokenCounts,
  TokenStats,
  TokenWindow,
  TokenBreakdown,
  TokenBucket,
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

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
    const next = new Date(cursor)
    if (days === 1)
      next.setTime(
        trend.length === 23 ? end.getTime() : cursor.getTime() + HOUR_MS
      )
    else next.setDate(next.getDate() + 1)
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
  const archived = state.history.find((day) => day.date === date)
  if (archived) return structuredClone(archived)
  const now = new Date(state.now)
  const next = new Date(start)
  next.setDate(next.getDate() + 1)
  const future = start > now
  const end = future
    ? next
    : new Date(Math.min(next.getTime(), now.getTime() + 1))
  const startAt = start.toISOString()
  const endAt = end.toISOString()
  const events = state.events.filter(
    (event) => event.at >= startAt && event.at < endAt
  )
  const prompts = events.filter((event) => !event.bareSlash)
  const byProject = new Map<string, number>()
  for (const event of prompts)
    byProject.set(event.project, (byProject.get(event.project) ?? 0) + 1)
  const cutoff = new Date(now.getTime() - HISTORY_WINDOW_DAYS * DAY_MS)
  return {
    date,
    weekday: start.getDay(),
    startAt,
    endAt,
    partial: next > now,
    count: prompts.length,
    sessions: new Set(prompts.map((event) => event.sessionId)).size,
    slashCommands: events.length - prompts.length,
    byProject: [...byProject]
      .map(([project, count]) => ({ project, count }))
      .sort((a, b) => b.count - a.count || a.project.localeCompare(b.project)),
    coverage: future
      ? 'future'
      : next <= cutoff
        ? 'unavailable'
        : start < cutoff
          ? 'partial'
          : 'available',
    tokens: eventTokens(events)
  }
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
  ].sort((a, b) => b - a)
  const countsByDate = new Map(
    state.history.map((day) => [day.date, day.count])
  )
  for (const event of state.events) {
    if (event.bareSlash || event.at > state.now) continue
    const key = dateKey(new Date(event.at))
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1)
  }
  const counts = [...countsByDate.values()]
    .filter((count) => count > 0)
    .sort((a, b) => a - b)
  const thresholds = THRESHOLD_QUANTILES.map(
    (fraction) =>
      counts[Math.max(0, Math.ceil(counts.length * fraction) - 1)] ?? 1
  )
  const days = []
  const cursor = new Date(year, 0, 1)
  while (cursor.getFullYear() === year) {
    const { date, weekday, count, coverage, tokens } = buildUsageDay(
      state,
      dateKey(cursor)
    )
    days.push({ date, weekday, count, coverage, tokens })
    cursor.setDate(cursor.getDate() + 1)
  }
  return {
    year,
    years,
    days,
    thresholds,
    prompts: days.reduce((sum, day) => sum + day.count, 0),
    activeDays: days.filter((day) => day.count > 0).length
  }
}
