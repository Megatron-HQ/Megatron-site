export const PREVIEW_SECTIONS = ['skills', 'plugins', 'usage'] as const
export const USAGE_PANELS = [
  'activity',
  'cost',
  'models',
  'skills',
  'resident-tax'
] as const

export type PreviewSection = (typeof PREVIEW_SECTIONS)[number]
export type PreviewPanel = (typeof USAGE_PANELS)[number]
export type PreviewCommand =
  | {
      type: 'megatron-preview:navigate'
      section: PreviewSection
      panel?: PreviewPanel
    }
  | { type: 'megatron-preview:reset' }

export function parsePreviewCommand(value: unknown): PreviewCommand | null {
  if (typeof value !== 'object' || value === null) return null
  const message = value as Record<string, unknown>
  if (message.type === 'megatron-preview:reset') return { type: message.type }
  if (message.type !== 'megatron-preview:navigate') return null
  if (!PREVIEW_SECTIONS.includes(message.section as PreviewSection)) return null
  if (
    message.panel !== undefined &&
    (message.section !== 'usage' ||
      !USAGE_PANELS.includes(message.panel as PreviewPanel))
  )
    return null
  return {
    type: message.type,
    section: message.section as PreviewSection,
    ...(message.panel !== undefined
      ? { panel: message.panel as PreviewPanel }
      : {})
  }
}
