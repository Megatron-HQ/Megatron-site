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

test('no events produces the app’s empty cost and resident-sample states', () => {
  const state = createSampleState(new Date('2026-10-09T18:00:00Z'))
  state.events = []
  const result = buildUsageOverview(state)
  assert.equal(result.cost, null)
  assert.equal(result.residentTax, null)
  assert.equal(result.models.last30d.turnCount, 0)
})
