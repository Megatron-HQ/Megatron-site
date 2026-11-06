import type { ContextCategory } from '../../vendor/megatron/src/shared/ipc'
import { formatTokenCount } from '../../vendor/megatron/src/shared/token-format.ts'
import { buildUsageOverview } from './analytics.ts'
import { sampleContextBaseline } from './context.ts'
import { createSampleState } from './fixtures.ts'
import { buildUsageCalendar } from './usage-history.ts'

/** The seven analytics views, in the order the landing page lists them. */
export const ANALYTICS_VIEWS = [
  'tokens',
  'cost',
  'activity',
  'history',
  'models',
  'skills',
  'resident-tax'
] as const
export type AnalyticsView = (typeof ANALYTICS_VIEWS)[number]

export type SegmentTone =
  | 'skills'
  | 'mcp'
  | 'memory'
  | 'agents'
  | 'system'
  | 'ink-1'
  | 'ink-2'
  | 'ink-3'
  | 'ink-4'
  | 'ink-5'
export type CardChart =
  | { kind: 'bars'; values: number[] }
  | { kind: 'segments'; segments: { share: number; tone: SegmentTone }[] }
export interface CardLegendEntry {
  label: string
  value: string
  tone: SegmentTone
}
export interface AnalyticsCardStat {
  view: AnalyticsView
  figure: string
  caption: string
  chart: CardChart
  legend: CardLegendEntry[]
}

const RESIDENT_TONES: Record<string, SegmentTone> = {
  skills: 'skills',
  'mcp server instructions': 'mcp',
  'mcp tools': 'mcp',
  'memory files': 'memory',
  'custom agents': 'agents'
}
const MODEL_TONES: SegmentTone[] = ['ink-1', 'ink-2', 'ink-3', 'ink-4', 'ink-5']
const RESIDENT_LEGEND: { tone: SegmentTone; label: string }[] = [
  { tone: 'skills', label: 'Skills' },
  { tone: 'mcp', label: 'MCP' },
  { tone: 'memory', label: 'Memory' },
  { tone: 'agents', label: 'Agents' },
  { tone: 'system', label: 'System and messages' }
]
const TOKENS_PER_THOUSAND = 1000

// Mirrors the app's formatCount and whole-dollar formatUsd, which live behind
// the renderer's path alias and cannot load in the Node test runner.
function formatCount(value: number): string {
  return value.toLocaleString()
}
function formatWholeDollars(value: number): string {
  if (value > 0 && value < 0.5) return '<$1'
  return `$${Math.round(value).toLocaleString()}`
}

function requireValue<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined)
    throw new RangeError(`The sample has no ${name} data for the cards.`)
  return value
}

function toSegments(
  entries: { weight: number; tone: SegmentTone }[]
): CardChart {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  if (total <= 0) throw new RangeError('Card segments need a positive total.')
  return {
    kind: 'segments',
    segments: entries.map((entry) => ({
      share: entry.weight / total,
      tone: entry.tone
    }))
  }
}

function residentTone(category: ContextCategory): SegmentTone {
  const name = category.name.toLowerCase().replace(/\s*\(deferred\)$/, '')
  return RESIDENT_TONES[name] ?? 'system'
}

// /context prints "1.8k" and "600"; summed rows follow the same style.
function formatContextTokens(tokens: number): string {
  if (tokens < TOKENS_PER_THOUSAND) return String(tokens)
  return `${Number((tokens / TOKENS_PER_THOUSAND).toFixed(1))}k`
}

function residentLegend(used: ContextCategory[]): CardLegendEntry[] {
  return RESIDENT_LEGEND.map(({ tone, label }) => {
    const matching = used.filter((category) => residentTone(category) === tone)
    if (matching.length === 0)
      throw new RangeError(`The sample baseline has no ${label} category.`)
    const value =
      matching.length === 1
        ? matching[0].display
        : formatContextTokens(
            matching.reduce((sum, category) => sum + category.tokens, 0)
          )
    return { label, value, tone }
  })
}

/**
 * Headline figures for the landing-page analytics cards, computed from the
 * same synthetic sample the opened views load, so a card never disagrees with
 * the view behind it. Uses the app's default 30-day window.
 */
export function buildAnalyticsCardStats(now: Date): AnalyticsCardStat[] {
  if (!Number.isFinite(now.getTime()))
    throw new RangeError('Invalid sample clock.')
  const state = createSampleState(now)
  const overview = buildUsageOverview(state)
  const calendar = buildUsageCalendar(state, now.getFullYear())
  const tokens = requireValue(overview.tokens, 'token').last30d
  const cost = requireValue(overview.cost, 'cost').last30d
  const activity = requireValue(overview.activity, 'activity').last30d
  const models = requireValue(overview.models, 'model').last30d
  const skills = requireValue(overview.skills, 'skill').last30d
  const baseline = sampleContextBaseline(now.toISOString())
  if (!baseline.ok) throw new RangeError('The sample context baseline failed.')
  const usage = baseline.usage
  const used = usage.categories.filter((category) => category.group === 'used')
  const cards: Omit<AnalyticsCardStat, 'legend'>[] = [
    {
      view: 'tokens',
      figure: formatTokenCount(requireValue(tokens.tokens, 'token').total),
      caption: 'tokens processed · 30 days',
      chart: {
        kind: 'bars',
        values: tokens.trend.map((bucket) => bucket.tokens?.total ?? 0)
      }
    },
    {
      view: 'cost',
      figure: formatWholeDollars(cost.totalCostUsd),
      caption: 'estimated API cost · 30 days',
      chart: { kind: 'bars', values: cost.byDay.map((day) => day.costUsd) }
    },
    {
      view: 'activity',
      figure: formatCount(activity.prompts),
      caption: 'prompts · 30 days',
      chart: { kind: 'bars', values: activity.byDay.map((day) => day.count) }
    },
    {
      view: 'history',
      figure: formatCount(calendar.activeDays),
      caption: `active days in ${calendar.year}`,
      chart: {
        kind: 'bars',
        values: calendar.months.map((month) => month.count)
      }
    },
    {
      view: 'models',
      figure: formatCount(models.turnCount),
      caption: `turns across ${models.modelCount} models · 30 days`,
      chart: toSegments(
        models.byModel.map((row, index) => ({
          weight: row.turnCount,
          tone: MODEL_TONES[Math.min(index, MODEL_TONES.length - 1)]
        }))
      )
    },
    {
      view: 'skills',
      figure: formatCount(skills.invocationCount),
      caption: 'skill invocations · 30 days',
      chart: {
        kind: 'bars',
        values: skills.trend.map((bucket) => bucket.count)
      }
    },
    {
      view: 'resident-tax',
      figure: usage.totalDisplay,
      caption: `of ${usage.windowDisplay} loaded before your first message`,
      chart: toSegments(
        used.map((category) => ({
          weight: category.tokens,
          tone: residentTone(category)
        }))
      )
    }
  ]
  return cards.map((card) => ({
    ...card,
    legend: card.view === 'resident-tax' ? residentLegend(used) : []
  }))
}
