import { useEffect, useEffectEvent } from 'react'
import type { SourceFilter } from '../../vendor/megatron/src/renderer/src/lib/source-filter'
import type { PluginFilter } from '../../vendor/megatron/src/renderer/src/lib/plugin-filter'
import {
  parsePreviewCommand,
  type PreviewPanel,
  type PreviewSection
} from './protocol.ts'

export function sendPreviewMessage(message: Record<string, unknown>): void {
  if (window.parent !== window)
    window.parent.postMessage(message, window.location.origin)
}

/** Tells the host about an Escape the app did not use, so it can collapse its own chrome. */
export function forwardUnhandledEscape(): () => void {
  function forwardEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return
    const mcpBack = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Back to MCP servers"]'
    )
    const appHandlesEscape =
      document.querySelector(
        '[role="dialog"], [role="alertdialog"], [role="listbox"], tbody button[aria-pressed="true"], button[aria-label="Back to skills"], button[aria-label="Back to skill details"]'
      ) !== null
    queueMicrotask(() => {
      if (event.defaultPrevented || appHandlesEscape) return
      if (mcpBack) mcpBack.click()
      else sendPreviewMessage({ type: 'megatron-preview:escape' })
    })
  }
  document.addEventListener('keydown', forwardEscape)
  return () => document.removeEventListener('keydown', forwardEscape)
}

export function usePreviewNavigation(
  setSection: (section: PreviewSection) => void,
  setPanel: (panel: PreviewPanel) => void,
  filters: {
    selectSkillSource: (filter: SourceFilter) => void
    selectPluginScope: (filter: PluginFilter) => void
    selectMcpInventory: () => void
    selectMcpServer: (id: string) => void
  }
): void {
  const selectMcpServer = useEffectEvent(async (id: string) => {
    const detail = await window.api.getMcpServerDetail(id)
    if (detail) filters.selectMcpServer(id)
  })
  const selectTarget = useEffectEvent(
    (section: PreviewSection, target: string) => {
      if (
        section === 'skills' &&
        (target === 'global' || target === 'project' || target === 'plugin')
      )
        filters.selectSkillSource({ kind: target })
      else if (
        section === 'plugins' &&
        (target === 'user' || target === 'project')
      )
        filters.selectPluginScope({
          kind: target === 'project' ? 'projects' : 'user'
        })
      else if (section === 'mcp' && target === 'all')
        filters.selectMcpInventory()
    }
  )
  useEffect(() => {
    function receive(event: MessageEvent): void {
      if (
        event.source !== window.parent ||
        event.origin !== window.location.origin
      )
        return
      const command = parsePreviewCommand(event.data)
      if (!command) return
      if (command.type === 'megatron-preview:reset') {
        window.dispatchEvent(new Event('megatron-preview:reset'))
        return
      }
      if (command.type === 'megatron-preview:inventory-change') {
        window.dispatchEvent(
          new CustomEvent('megatron-preview:inventory-change', {
            detail: command.action
          })
        )
        return
      }
      if (command.serverId) {
        void selectMcpServer(command.serverId).catch(() => {
          sendPreviewMessage({
            type: 'megatron-preview:notice',
            message: 'The sample server could not be loaded.'
          })
        })
        return
      }
      setSection(command.section)
      if (command.panel) setPanel(command.panel)
      if (command.target) selectTarget(command.section, command.target)
      void window.api.setLastSection(command.section)
    }
    window.addEventListener('message', receive)
    const stopForwardingEscape = forwardUnhandledEscape()
    const parameters = new URLSearchParams(window.location.search)
    const initial = parsePreviewCommand({
      type: 'megatron-preview:navigate',
      section: parameters.get('section') ?? 'skills',
      ...(parameters.has('panel') ? { panel: parameters.get('panel') } : {})
    })
    if (initial?.type === 'megatron-preview:navigate') {
      setSection(initial.section)
      if (initial.panel) setPanel(initial.panel)
    }
    sendPreviewMessage({
      type: 'megatron-preview:ready',
      section: window.api.getInitialSection()
    })
    return () => {
      window.removeEventListener('message', receive)
      stopForwardingEscape()
    }
  }, [setSection, setPanel])
}
