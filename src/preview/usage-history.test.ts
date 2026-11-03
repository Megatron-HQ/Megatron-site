import assert from 'node:assert/strict'
import test from 'node:test'
import { createSampleState, SAMPLE_PROJECT, API_PROJECT } from './fixtures.ts'

async function history() {
  try {
    return await import('./usage-history.ts')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ERR_MODULE_NOT_FOUND')
      throw error
    assert.fail('The sample usage history has not been implemented.')
  }
}

function exampleState() {
  const now = new Date(2026, 9, 9, 12)
  const state = createSampleState(now)
  const template = state.events.at(-1)!
  state.history = []
  state.events = [
    {
      ...template,
      at: new Date(2026, 9, 8, 12).toISOString(),
      sessionId: 'one',
      project: SAMPLE_PROJECT,
      model: 'claude-sonnet-5',
      bareSlash: false,
      tokens: {
        input: 100,
        output: 200,
        cacheRead: 300,
        cacheWrite: 400,
        total: 1000
      }
    },
    {
      ...template,
      at: now.toISOString(),
      sessionId: 'two',
      project: API_PROJECT,
      model: 'claude-opus-5',
      bareSlash: true,
      tokens: {
        input: 10,
        output: 20,
        cacheRead: 30,
        cacheWrite: 40,
        total: 100
      }
    },
    {
      ...template,
      at: new Date(now.getTime() - 1).toISOString(),
      sessionId: 'missing',
      project: API_PROJECT,
      bareSlash: false,
      tokens: null
    },
    {
      ...template,
      at: new Date(2026, 9, 8, 11, 59).toISOString(),
      sessionId: 'older',
      project: SAMPLE_PROJECT,
      bareSlash: false,
      tokens: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, total: 10 }
    }
  ]
  return state
}

test('token windows include cutoff and current-time records and reconcile every breakdown', async () => {
  const { buildTokenStats } = await history()
  const state = exampleState()
  const stats = buildTokenStats(state)
  assert.deepEqual(stats.last24h.tokens, {
    input: 110,
    output: 220,
    cacheRead: 330,
    cacheWrite: 440,
    total: 1100
  })
  assert.equal(stats.last7d.tokens?.total, 1110)
  assert.equal(stats.missingSessionCount, 1)
  assert.equal(stats.last24h.trend.length, 24)
  assert.equal(stats.last24h.trend[0].tokens?.total, 1000)
  assert.equal(stats.last24h.trend.at(-1)?.tokens?.total, 100)
  assert.equal(stats.last24h.byModel[0].key, 'claude-sonnet-5')
  assert.equal(stats.last24h.byProject[0].key, SAMPLE_PROJECT)
  for (const window of [stats.last24h, stats.last7d, stats.last30d]) {
    for (const groups of [window.trend, window.byModel, window.byProject]) {
      assert.equal(
        groups.reduce((sum, row) => sum + (row.tokens?.total ?? 0), 0),
        window.tokens?.total
      )
    }
  }
})

test('missing token records remain unavailable and recorded zero remains zero', async () => {
  const { buildTokenStats } = await history()
  const state = exampleState()
  state.events = [state.events[2]]
  assert.equal(buildTokenStats(state).last24h.tokens, null)
  state.events[0].tokens = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    total: 0
  }
  assert.equal(buildTokenStats(state).last24h.tokens?.total, 0)
})

test('annual history distinguishes unavailable and future days and reconciles full-day details', async () => {
  const { buildUsageCalendar, buildUsageDay } = await history()
  const state = exampleState()
  const calendar = buildUsageCalendar(state, 2026)
  assert.equal(calendar.days.length, 365)
  assert.equal(
    calendar.days.find((day) => day.date === '2026-01-01')?.coverage,
    'unavailable'
  )
  assert.equal(
    calendar.days.find((day) => day.date === '2026-10-10')?.coverage,
    'future'
  )
  const day = buildUsageDay(state, '2026-10-09')
  assert.equal(day.count, 1)
  assert.equal(day.sessions, 1)
  assert.equal(day.slashCommands, 1)
  assert.equal(day.tokens?.total, 100)
  assert.deepEqual(day.byProject, [{ project: API_PROJECT, count: 1 }])
  assert.equal(
    calendar.days.find((day) => day.date === '2026-10-09')?.count,
    day.count
  )
  assert.equal(calendar.prompts, 3)
})

test('archived years share the same intensity thresholds and retain coherent daily summaries', async () => {
  const { buildUsageCalendar, buildUsageDay } = await history()
  const state = createSampleState(new Date(2026, 9, 9, 12))
  const recent = buildUsageCalendar(state, 2026)
  const older = buildUsageCalendar(state, 2024)
  assert.deepEqual(recent.years, [2026, 2025, 2024])
  assert.deepEqual(recent.thresholds, older.thresholds)
  assert.equal(older.days.length, 366)
  const active = older.days.find((day) => day.count > 0)!
  const details = buildUsageDay(state, active.date)
  assert.equal(details.count, active.count)
  assert.equal(details.tokens?.total, active.tokens?.total)
  assert.equal(
    details.byProject.reduce((sum, row) => sum + row.count, 0),
    active.count
  )
  assert.ok(
    older.days.some((day) => day.coverage === 'available' && day.count === 0)
  )
  assert.ok(older.days.some((day) => day.coverage === 'unavailable'))
})

test('history rejects invalid calendar years and normalized nonexistent dates', async () => {
  const { buildUsageCalendar, buildUsageDay } = await history()
  const state = exampleState()
  for (const year of [NaN, 2026.5, 1969, 10000]) {
    assert.throws(() => buildUsageCalendar(state, year), RangeError)
  }
  for (const date of ['2026-02-30', '2026-2-3', 'invalid']) {
    assert.throws(() => buildUsageDay(state, date), RangeError)
  }
})
