import assert from 'node:assert/strict'
import test from 'node:test'
import { buildUsageOverview } from './analytics.ts'
import { createSampleState } from './fixtures.ts'
import { buildUsageCalendar } from './usage-history.ts'
import { ANALYTICS_VIEWS, buildAnalyticsCardStats } from './card-stats.ts'

const CLOCK = new Date('2026-10-09T12:00:00.000Z')

test('cards follow the analytics list order', () => {
  assert.deepEqual(
    buildAnalyticsCardStats(CLOCK).map((card) => card.view),
    [...ANALYTICS_VIEWS]
  )
  assert.deepEqual(
    [...ANALYTICS_VIEWS],
    [
      'tokens',
      'cost',
      'activity',
      'history',
      'models',
      'skills',
      'resident-tax'
    ]
  )
})

test('card figures match the 30-day sample the opened views load', () => {
  const overview = buildUsageOverview(createSampleState(CLOCK))
  const calendar = buildUsageCalendar(
    createSampleState(CLOCK),
    CLOCK.getFullYear()
  )
  const figures = Object.fromEntries(
    buildAnalyticsCardStats(CLOCK).map((card) => [card.view, card.figure])
  )
  const tokens = overview.tokens?.last30d.tokens
  assert.ok(tokens, 'The sample records 30-day tokens.')
  assert.ok(overview.cost, 'The sample records cost.')
  assert.ok(overview.models && overview.skills && overview.activity)
  assert.equal(
    figures.tokens,
    new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(tokens.total)
  )
  assert.equal(
    figures.cost,
    `$${Math.round(overview.cost.last30d.totalCostUsd).toLocaleString()}`
  )
  assert.equal(
    figures.activity,
    overview.activity.last30d.prompts.toLocaleString()
  )
  assert.equal(figures.history, calendar.activeDays.toLocaleString())
  assert.equal(
    figures.models,
    overview.models.last30d.turnCount.toLocaleString()
  )
  assert.equal(
    figures.skills,
    overview.skills.last30d.invocationCount.toLocaleString()
  )
  assert.equal(figures['resident-tax'], '32k')
})

test('every card carries a drawable chart', () => {
  for (const card of buildAnalyticsCardStats(CLOCK)) {
    if (card.chart.kind === 'bars') {
      assert.ok(card.chart.values.length > 0, `${card.view} has bars`)
      assert.ok(
        card.chart.values.every(
          (value) => Number.isFinite(value) && value >= 0
        ),
        `${card.view} bars are non-negative`
      )
      assert.ok(
        card.chart.values.some((value) => value > 0),
        `${card.view} bars are not all empty`
      )
    } else {
      const total = card.chart.segments.reduce(
        (sum, segment) => sum + segment.share,
        0
      )
      assert.ok(Math.abs(total - 1) < 1e-9, `${card.view} shares sum to 1`)
    }
  }
})

test('resident tax keeps the app category identities', () => {
  const resident = buildAnalyticsCardStats(CLOCK).find(
    (card) => card.view === 'resident-tax'
  )
  assert.ok(resident && resident.chart.kind === 'segments')
  const tones = new Set(resident.chart.segments.map((segment) => segment.tone))
  for (const tone of ['skills', 'mcp', 'memory', 'agents', 'system'])
    assert.ok(tones.has(tone as never), `missing ${tone}`)
})

test('resident tax lists its categories with /context-style values', () => {
  const resident = buildAnalyticsCardStats(CLOCK).find(
    (card) => card.view === 'resident-tax'
  )
  assert.deepEqual(resident?.legend, [
    { label: 'Skills', value: '10k', tone: 'skills' },
    { label: 'MCP', value: '2k', tone: 'mcp' },
    { label: 'Memory', value: '1.5k', tone: 'memory' },
    { label: 'Agents', value: '600', tone: 'agents' },
    { label: 'System and messages', value: '17.9k', tone: 'system' }
  ])
  for (const card of buildAnalyticsCardStats(CLOCK))
    if (card.view !== 'resident-tax') assert.deepEqual(card.legend, [])
})

test('an invalid clock fails fast', () => {
  assert.throws(
    () => buildAnalyticsCardStats(new Date('not a date')),
    RangeError
  )
})
