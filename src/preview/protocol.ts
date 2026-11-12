export const PREVIEW_SECTIONS = ['skills', 'plugins', 'usage'] as const
export const USAGE_PANELS = [
  'activity',
  'history',
  'tokens',
  'cost',
  'models',
  'skills',
  'resident-tax'
] as const

export type PreviewSection = (typeof PREVIEW_SECTIONS)[number]
export type PreviewPanel = (typeof USAGE_PANELS)[number]

export function parseSamplePanel(value: string): PreviewPanel {
  if (!USAGE_PANELS.includes(value as PreviewPanel))
    throw new RangeError(`Unknown sample view: ${value}`)
  return value as PreviewPanel
}
export type PreviewThemeMessage = {
  type: 'megatron-preview:theme'
  dark: boolean
}

export function parsePreviewThemeMessage(
  value: unknown
): PreviewThemeMessage | null {
  if (typeof value !== 'object' || value === null) return null
  const message = value as Record<string, unknown>
  if (
    message.type !== 'megatron-preview:theme' ||
    typeof message.dark !== 'boolean'
  )
    return null
  return { type: message.type, dark: message.dark }
}

export const INVENTORY_CHANGES = [
  'add-skill',
  'edit-skill',
  'delete-skill',
  'move-project',
  'delete-project',
  'unavailable-project',
  'pending-project',
  'retry-project',
  'recover-project'
] as const
export type InventoryChange = (typeof INVENTORY_CHANGES)[number]
export type PreviewCommand =
  | {
      type: 'megatron-preview:navigate'
      section: PreviewSection
      panel?: PreviewPanel
    }
  | { type: 'megatron-preview:reset' }
  | { type: 'megatron-preview:inventory-change'; action: InventoryChange }

export function parsePreviewCommand(value: unknown): PreviewCommand | null {
  if (typeof value !== 'object' || value === null) return null
  const message = value as Record<string, unknown>
  if (message.type === 'megatron-preview:reset') return { type: message.type }
  if (message.type === 'megatron-preview:inventory-change')
    return INVENTORY_CHANGES.includes(message.action as InventoryChange)
      ? { type: message.type, action: message.action as InventoryChange }
      : null
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
