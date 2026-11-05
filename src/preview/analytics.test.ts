import assert from 'node:assert/strict'
import test from 'node:test'
import { buildUsageOverview } from './analytics.ts'
import { createSampleState } from './fixtures.ts'

test('slash-command-only sessions do not inflate Activity sessions or prompts', () => {
  const state = createSampleState(new Date('2026-10-09T18:00:00Z'))
  const template = state.events.at(-1)!
  state.events = [
    {
      ...template,
      at: '2026-10-09T16:00:00Z',
      sessionId: 'prompt-session',
      bareSlash: false
    },
    {
      ...template,
      at: '2026-10-09T17:00:00Z',
      sessionId: 'slash-only-session',
      bareSlash: true,
      skillName: null
    }
  ]
  const activity = buildUsageOverview(state).activity.last24h
  assert.equal(activity.sessions, 1)
  assert.equal(activity.prompts, 1)
  assert.equal(activity.slashCommands, 1)
})

test('Activity day and hour details reconcile with their window', () => {
  const overview = buildUsageOverview(
    createSampleState(new Date('2026-10-09T18:00:00Z'))
  )
  const { last24h, last7d, last30d } = overview.activity
  const bucketSets = [
    { window: last24h, buckets: last24h.hourlyTrend },
    ...[last24h, last7d, last30d].map((window) => ({
      window,
      buckets: window.byDay
    }))
  ]
  for (const { window, buckets } of bucketSets) {
    assert.equal(
      buckets.reduce((sum, bucket) => sum + bucket.count, 0),
      window.prompts
    )
    assert.equal(
      buckets.reduce((sum, bucket) => sum + bucket.slashCommands, 0),
      window.slashCommands
    )
    for (const bucket of buckets) {
      assert.equal(
        bucket.byProject.reduce((sum, project) => sum + project.count, 0),
        bucket.count
      )
      assert.ok(bucket.sessions <= bucket.count)
      assert.ok(bucket.startAt < bucket.endAt)
    }
  }
  for (const { byDay } of [last7d, last30d]) {
    assert.equal(byDay[0].partial, true)
    assert.equal(byDay.at(-1)!.endAt, overview.activity.generatedAt)
  }
})

test('no events produces empty cost and model activity', () => {
  const state = createSampleState(new Date('2026-10-09T18:00:00Z'))
  state.events = []
  const result = buildUsageOverview(state)
  assert.equal(result.cost, null)
  assert.equal(result.models.last30d.turnCount, 0)
})

test('Activity reads retained prompt copies after current source events have gone', () => {
  const state = createSampleState(new Date('2026-10-09T18:00:00Z'))
  state.events = []
  state.history = [
    {
      date: '2026-10-09',
      weekday: 5,
      startAt: '2026-10-09T00:00:00Z',
      endAt: '2026-10-09T18:00:00Z',
      partial: true,
      count: 5,
      sessions: 2,
      slashCommands: 4,
      byProject: [{ project: 'C:\\Dev\\web-app', count: 5 }],
      coverage: 'partial',
      tokens: null
    }
  ]
  state.prompts = [
    {
      at: '2026-10-09T16:00:00.000Z',
      sessionId: 'retained-first',
      project: 'C:\\Dev\\web-app',
      bareSlash: false,
      copies: 3
    },
    {
      at: '2026-10-09T17:00:00.000Z',
      sessionId: 'retained-second',
      project: 'C:\\Dev\\web-app',
      bareSlash: false,
      copies: 2
    },
    {
      at: '2026-10-09T17:30:00.000Z',
      sessionId: 'bare-slash',
      project: 'C:\\Dev\\web-app',
      bareSlash: true,
      copies: 4
    },
    {
      at: '2026-10-10T00:00:00.000Z',
      sessionId: 'future',
      project: 'C:\\Dev\\web-app',
      bareSlash: false,
      copies: 100
    }
  ]
  const overview = buildUsageOverview(state)
  assert.equal(overview.activity.last24h.prompts, 5)
  assert.equal(overview.activity.last24h.sessions, 2)
  assert.equal(overview.activity.last24h.slashCommands, 4)
  assert.equal(
    overview.activity.last24h.hourlyTrend.reduce(
      (sum, hour) => sum + hour.count,
      0
    ),
    5
  )
  assert.equal(overview.activity.last24h.coverage, 'partial')
  assert.equal(overview.tokens.last24h.tokens, null)
})
