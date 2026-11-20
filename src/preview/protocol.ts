import { MAX_MCP_SERVER_ID_LENGTH } from '../../vendor/megatron/src/shared/ipc.ts'

export const PREVIEW_SECTIONS = ['skills', 'plugins', 'mcp', 'usage'] as const
export const USAGE_PANELS = [
  'activity',
  'history',
  'tokens',
  'cost',
  'models',
  'skills',
  'mcp',
  'resident-tax'
] as const

export type PreviewSection = (typeof PREVIEW_SECTIONS)[number]
export type PreviewPanel = (typeof USAGE_PANELS)[number]
export type PreviewTarget = 'all' | 'global' | 'project' | 'plugin' | 'user'

const SECTION_TARGETS: Record<PreviewSection, readonly PreviewTarget[]> = {
  skills: ['global', 'project', 'plugin'],
  plugins: ['user', 'project'],
  mcp: ['all'],
  usage: []
}

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
      target?: PreviewTarget
      serverId?: string
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
    message.serverId !== undefined &&
    (message.section !== 'mcp' ||
      message.target !== undefined ||
      typeof message.serverId !== 'string' ||
      message.serverId.length === 0 ||
      message.serverId.length > MAX_MCP_SERVER_ID_LENGTH)
  )
    return null
  if (
    message.target !== undefined &&
    !SECTION_TARGETS[message.section as PreviewSection].includes(
      message.target as PreviewTarget
    )
  )
    return null
  if (
    message.panel !== undefined &&
    (message.section !== 'usage' ||
      !USAGE_PANELS.includes(message.panel as PreviewPanel))
  )
    return null
  return {
    type: message.type,
    section: message.section as PreviewSection,
    ...(typeof message.serverId === 'string'
      ? { serverId: message.serverId }
      : {}),
    ...(message.target !== undefined
      ? { target: message.target as PreviewTarget }
      : {}),
    ...(message.panel !== undefined
      ? { panel: message.panel as PreviewPanel }
      : {})
  }
}
