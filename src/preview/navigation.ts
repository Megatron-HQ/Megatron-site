import { useEffect } from 'react'
import {
  parsePreviewCommand,
  type PreviewPanel,
  type PreviewSection
} from './protocol.ts'

export function sendPreviewMessage(message: Record<string, unknown>): void {
  if (window.parent !== window)
    window.parent.postMessage(message, window.location.origin)
}

export function usePreviewNavigation(
  setSection: (section: PreviewSection) => void,
  setPanel: (panel: PreviewPanel) => void
): void {
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
      setSection(command.section)
      if (command.panel) setPanel(command.panel)
      void window.api.setLastSection(command.section)
    }
    window.addEventListener('message', receive)
    function forwardEscape(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return
      const appHandlesEscape =
        document.querySelector(
          '[role="dialog"], [role="alertdialog"], [role="listbox"], tbody button[aria-pressed="true"], button[aria-label="Back to skills"], button[aria-label="Back to skill details"]'
        ) !== null
      queueMicrotask(() => {
        if (!event.defaultPrevented && !appHandlesEscape)
          sendPreviewMessage({ type: 'megatron-preview:escape' })
      })
    }
    document.addEventListener('keydown', forwardEscape)
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
      document.removeEventListener('keydown', forwardEscape)
    }
  }, [setSection, setPanel])
}
