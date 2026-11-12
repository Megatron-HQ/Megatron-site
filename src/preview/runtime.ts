import { createDemoApi } from './api.ts'
import { parsePreviewCommand, parseSamplePanel } from './protocol.ts'
import { sendPreviewMessage } from './navigation.ts'

// Plays the desktop preload's role: `window.api` must exist before any app
// module evaluates, because some read it at import time (for example the
// onboarding dialog's platform-specific path). Import this module ahead of
// the app renderer.
const parameters = new URLSearchParams(window.location.search)
const requestedSample = parameters.get('sample')
export const samplePanel =
  requestedSample === null ? null : parseSamplePanel(requestedSample)
const initial = parsePreviewCommand({
  type: 'megatron-preview:navigate',
  section: parameters.get('section') ?? 'skills',
  ...(parameters.has('panel') ? { panel: parameters.get('panel') } : {})
})
const requestedClock = parameters.get('clock')
export const clock = requestedClock ? new Date(requestedClock) : new Date()
if (!Number.isFinite(clock.getTime()))
  throw new RangeError('Invalid sample clock.')
export const demo = createDemoApi({
  now: clock,
  initialSection:
    initial?.type === 'megatron-preview:navigate' ? initial.section : 'skills',
  platform: parameters.get('platform') === 'darwin' ? 'darwin' : 'win32',
  scenario: parameters.get('scenario') ?? undefined,
  onSectionChange: (section) =>
    sendPreviewMessage({ type: 'megatron-preview:section', section }),
  onNotice: (message) =>
    sendPreviewMessage({ type: 'megatron-preview:notice', message })
})
window.api = demo.api
