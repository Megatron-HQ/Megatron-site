import assert from 'node:assert/strict'
import test from 'node:test'
import { createSampleState, SAMPLE_PROJECT, API_PROJECT } from './fixtures.ts'

test('archived token-only days keep prompt coverage unavailable and retain token details', async () => {
  const { buildUsageCalendar, buildUsageDay } = await history()
  const state = createSampleState(new Date(2026, 9, 9, 12))
  const day = buildUsageDay(state, '2024-07-01')
  assert.equal(day.coverage, 'unavailable')
  assert.equal(day.count, 0)
  assert.equal(day.tokens?.total, 162200)
  const square = buildUsageCalendar(state, 2024).days.find(
    (row) => row.date === day.date
  )!
  assert.equal(square.coverage, 'unavailable')
  assert.equal(square.tokens?.total, 162200)
})

test('day details and token trends reset to local midnight after a daylight-saving jump', async () => {
  const { buildUsageDay, buildTokenStats } = await history()
  const previousTimezone = process.env.TZ
  process.env.TZ = 'America/Sao_Paulo'
  try {
    const state = createSampleState(new Date('2018-11-06T14:00:00.000Z'))
    const template = state.events[0]
    state.history = []
    state.events = ['2018-11-04T03:30:00.000Z', '2018-11-05T02:30:00.000Z'].map(
      (at) => ({
        ...template,
        at,
        bareSlash: false,
        tokens: {
          input: 100,
          output: 200,
          cacheRead: 300,
          cacheWrite: 400,
          total: 1000
        }
      })
    )
    const day = buildUsageDay(state, '2018-11-04')
    assert.equal(day.endAt, '2018-11-05T02:00:00.000Z')
    assert.equal(day.count, 1)
    const followingDay = buildTokenStats(state).last7d.trend.find(
      (bucket) => bucket.key === '2018-11-05'
    )!
    assert.equal(followingDay.startAt, '2018-11-05T02:00:00.000Z')
    assert.equal(followingDay.tokens?.total, 1000)
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ
    else process.env.TZ = previousTimezone
  }
})

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

test('annual summaries verify streaks across coverage gaps and keep the earliest tied record', async () => {
  const { buildUsageCalendar } = await history()
  const state = createSampleState(new Date(2026, 0, 6, 12))
  const template = state.history[1]
  state.events = []
  state.history = [
    { date: '2026-01-01', count: 2, coverage: 'available' as const },
    { date: '2026-01-02', count: 4, coverage: 'available' as const },
    { date: '2026-01-03', count: 0, coverage: 'unavailable' as const },
    { date: '2026-01-04', count: 4, coverage: 'available' as const },
    { date: '2026-01-05', count: 2, coverage: 'partial' as const }
  ].map((day) => ({ ...template, ...day }))
  const calendar = buildUsageCalendar(state, 2026)
  assert.equal(calendar.prompts, 12)
  assert.equal(calendar.activeDays, 4)
  assert.deepEqual(calendar.summary, {
    observedDays: 5,
    partialDays: 1,
    elapsedDays: 6,
    longestStreak: {
      days: 2,
      startDate: '2026-01-01',
      endDate: '2026-01-02'
    },
    busiestDay: { date: '2026-01-02', count: 4 },
    promptsPerActiveDay: 3
  })
})

test('project months reconcile archived and recent prompts without counting slash commands', async () => {
  const { buildUsageCalendar } = await history()
  const state = exampleState()
  const template = createSampleState(new Date(state.now)).history[1]
  state.history = [
    {
      ...template,
      date: '2026-01-02',
      count: 5,
      coverage: 'available',
      byProject: [
        { project: API_PROJECT, count: 2 },
        { project: SAMPLE_PROJECT, count: 3 }
      ]
    }
  ]
  const calendar = buildUsageCalendar(state, 2026)
  assert.deepEqual(calendar.byProject, [
    {
      project: SAMPLE_PROJECT,
      total: 5,
      byMonth: [3, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0]
    },
    {
      project: API_PROJECT,
      total: 3,
      byMonth: [2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0]
    }
  ])
  assert.equal(calendar.months.length, 12)
  assert.deepEqual(calendar.months[0], {
    month: 1,
    count: 5,
    coverage: 'partial'
  })
  assert.deepEqual(calendar.months[1], {
    month: 2,
    count: 0,
    coverage: 'unavailable'
  })
  assert.deepEqual(calendar.months[9], {
    month: 10,
    count: 3,
    coverage: 'available'
  })
  assert.deepEqual(calendar.months[10], {
    month: 11,
    count: 0,
    coverage: 'future'
  })
})

test('unobserved years and observed empty days retain distinct annual coverage', async () => {
  const { buildUsageCalendar } = await history()
  const state = exampleState()
  state.events = []
  const unavailable = buildUsageCalendar(state, 2024)
  assert.deepEqual(unavailable.summary, {
    observedDays: 0,
    partialDays: 0,
    elapsedDays: 366,
    longestStreak: null,
    busiestDay: null,
    promptsPerActiveDay: null
  })
  assert.deepEqual(unavailable.byProject, [])
  const empty = buildUsageCalendar(state, 2026)
  assert.equal(empty.summary.observedDays, 31)
  assert.equal(empty.summary.partialDays, 1)
  assert.equal(empty.summary.busiestDay, null)
  assert.equal(empty.summary.promptsPerActiveDay, null)
  assert.deepEqual(empty.byProject, [])
})

test('future records cannot inflate annual totals, project months, years, or intensity', async () => {
  const { buildUsageCalendar, buildUsageDay } = await history()
  const state = exampleState()
  const current = buildUsageCalendar(state, 2026)
  const template = createSampleState(new Date(state.now)).history[1]
  state.history = [
    { ...template, date: '2026-10-10', count: 500 },
    { ...template, date: '2028-01-01', count: 1000 }
  ]
  state.events.push({ ...state.events[0], at: '2029-01-01T12:00:00.000Z' })
  const calendar = buildUsageCalendar(state, 2026)
  assert.equal(calendar.prompts, 3)
  assert.deepEqual(calendar.years, [2026])
  assert.deepEqual(calendar.thresholds, current.thresholds)
  assert.deepEqual(calendar.byProject, current.byProject)
  const future = buildUsageDay(state, '2026-10-10')
  assert.equal(future.coverage, 'future')
  assert.equal(future.count, 0)
  assert.equal(future.tokens, null)
})

test('archived sample years can expand the project timeline without losing daily totals', async () => {
  const { buildUsageCalendar } = await history()
  const state = createSampleState(new Date(2026, 9, 9, 12))
  const calendar = buildUsageCalendar(state, 2025)
  assert.equal(calendar.byProject.length, 13)
  assert.equal(buildUsageCalendar(state, 2024).byProject.length, 13)
  for (const day of state.history)
    assert.equal(
      day.byProject.reduce((sum, row) => sum + row.count, 0),
      day.count
    )
  assert.equal(
    calendar.byProject.reduce((sum, row) => sum + row.total, 0),
    calendar.prompts
  )
  for (const project of calendar.byProject)
    assert.equal(
      project.byMonth.reduce((sum, count) => sum + count, 0),
      project.total
    )
})
