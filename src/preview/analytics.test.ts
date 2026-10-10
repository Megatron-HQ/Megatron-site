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

test('no events produces the app’s empty cost and resident-sample states', () => {
  const state = createSampleState(new Date('2026-10-09T18:00:00Z'))
  state.events = []
  const result = buildUsageOverview(state)
  assert.equal(result.cost, null)
  assert.equal(result.residentTax, null)
  assert.equal(result.models.last30d.turnCount, 0)
})
