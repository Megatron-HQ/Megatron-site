import { refreshIcons } from './icons.js'
import { parsePreviewThemeMessage } from './preview/protocol.ts'
export { refreshIcons } from './icons.js'

const SECTIONS = [
  { id: 'skills', label: 'Skills', icon: 'brain-circuit' },
  { id: 'plugins', label: 'Plugins', icon: 'blocks' },
  { id: 'usage', label: 'Usage', icon: 'chart-no-axes-combined' }
]
const LOAD_TIMEOUT_MS = 15000
// The vendored renderer's minimum layout width. Narrower viewports scale the
// frame down to it rather than reflowing an app the site must not edit.
const APP_WIDTH = 860

/**
 * Mounts the full app preview. `onSampleTheme` receives the app's resolved
 * light/dark appearance so other samples on the page can follow it.
 */
export function mountProductDemo(root, { onSampleTheme } = {}) {
  if (!(root instanceof HTMLElement))
    throw new TypeError('The product preview needs a root element.')
  if (onSampleTheme !== undefined && typeof onSampleTheme !== 'function')
    throw new TypeError('onSampleTheme must be a function.')
  const previewUrl = new URL(
    `${import.meta.env.BASE_URL}preview/index.html`,
    window.location.origin
  )
  const parameters = new URLSearchParams(window.location.search)
  for (const key of ['clock', 'platform', 'scenario']) {
    if (parameters.has(key))
      previewUrl.searchParams.set(key, parameters.get(key))
  }
  root.innerHTML = `<dialog open role="region" aria-label="Interactive Megatron preview" class="preview-host" data-preview-host data-ready="false" data-expanded="false">
    <div class="preview-toolbar">
      <div class="preview-switcher" role="tablist" aria-label="Product preview sections">${SECTIONS.map((section) => `<button type="button" id="preview-${section.id}" role="tab" aria-selected="${section.id === 'skills'}" aria-controls="preview-screen" tabindex="${section.id === 'skills' ? 0 : -1}" class="preview-tab" data-preview-section="${section.id}"><i data-lucide="${section.icon}" aria-hidden="true"></i>${section.label}</button>`).join('')}</div>
      <div class="preview-host-actions"><span class="preview-sample-label">INTERACTIVE / SAMPLE DATA</span><button type="button" class="preview-host-button" data-preview-reset>Reset sample</button><button type="button" class="preview-host-button" data-preview-expand aria-expanded="false">Expand preview</button></div>
    </div>
    <div class="preview-viewport" id="preview-screen" role="tabpanel" aria-labelledby="preview-skills"><iframe class="preview-frame" data-preview-frame src="${previewUrl.href}" title="Megatron app preview with sample data" referrerpolicy="no-referrer"></iframe></div>
    <p class="preview-host-notice" data-preview-notice role="status" aria-live="polite">Loading the Megatron preview…</p>
  </dialog>`
  refreshIcons(root)
  const host = root.querySelector('[data-preview-host]')
  const frame = root.querySelector('[data-preview-frame]')
  const viewport = root.querySelector('.preview-viewport')
  const notice = root.querySelector('[data-preview-notice]')
  const expandButton = root.querySelector('[data-preview-expand]')
  let ready = false
  let pendingCommand = null
  let previousOverflow = ''
  const loadTimeout = window.setTimeout(() => {
    if (!ready)
      notice.textContent =
        'The preview is taking longer to load. Use Reset sample to try again.'
  }, LOAD_TIMEOUT_MS)
  new ResizeObserver(([entry]) => {
    const width = entry.contentRect.width
    // Closing the dialog to reopen it as a modal briefly measures 0.
    if (width > 0)
      viewport.style.setProperty(
        '--preview-scale',
        String(Math.min(1, width / APP_WIDTH))
      )
  }).observe(viewport)

  function selectSection(section) {
    if (!SECTIONS.some((item) => item.id === section)) return
    for (const tab of root.querySelectorAll('[data-preview-section]')) {
      const selected = tab.dataset.previewSection === section
      tab.setAttribute('aria-selected', String(selected))
      tab.tabIndex = selected ? 0 : -1
    }
    viewport.setAttribute('aria-labelledby', `preview-${section}`)
  }
  function send(command) {
    if (!ready) {
      pendingCommand = command
      return
    }
    frame.contentWindow.postMessage(command, previewUrl.origin)
  }
  function navigate(section, panel) {
    selectSection(section)
    send({
      type: 'megatron-preview:navigate',
      section,
      ...(panel ? { panel } : {})
    })
  }
  function setExpanded(expanded) {
    if (expanded === (host.dataset.expanded === 'true')) return
    host.close()
    host.dataset.expanded = String(expanded)
    expandButton.textContent = expanded ? 'Close preview' : 'Expand preview'
    expandButton.setAttribute('aria-expanded', String(expanded))
    if (expanded) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      host.setAttribute('role', 'dialog')
      host.showModal()
      expandButton.focus({ preventScroll: true })
    } else {
      document.body.style.overflow = previousOverflow
      host.setAttribute('role', 'region')
      host.show()
      expandButton.focus({ preventScroll: true })
    }
  }
  host.addEventListener('cancel', (event) => {
    event.preventDefault()
    setExpanded(false)
  })
  window.addEventListener('message', (event) => {
    if (
      event.origin !== previewUrl.origin ||
      typeof event.data !== 'object' ||
      event.data === null
    )
      return
    if (event.source !== frame.contentWindow) return
    const theme = parsePreviewThemeMessage(event.data)
    if (theme) {
      onSampleTheme?.(theme.dark)
      return
    }
    const message = event.data
    if (message.type === 'megatron-preview:ready') {
      ready = true
      host.dataset.ready = 'true'
      window.clearTimeout(loadTimeout)
      notice.textContent =
        'Explore every view. On narrow screens the whole app is scaled to fit. Expand it or rotate your device for a closer look.'
      selectSection(message.section)
      if (pendingCommand) {
        const command = pendingCommand
        pendingCommand = null
        send(command)
      }
    } else if (message.type === 'megatron-preview:section')
      selectSection(message.section)
    else if (
      message.type === 'megatron-preview:notice' &&
      typeof message.message === 'string'
    )
      notice.textContent = message.message
    else if (message.type === 'megatron-preview:error')
      notice.textContent =
        'The sample preview could not load. Use Reset sample to try again.'
    else if (
      message.type === 'megatron-preview:escape' &&
      host.dataset.expanded === 'true'
    )
      setExpanded(false)
  })
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button')
    if (!button || !root.contains(button)) return
    if (button.dataset.previewSection) navigate(button.dataset.previewSection)
    else if (button.hasAttribute('data-preview-reset')) {
      if (ready) send({ type: 'megatron-preview:reset' })
      else frame.src = previewUrl.href
    } else if (button.hasAttribute('data-preview-expand'))
      setExpanded(host.dataset.expanded !== 'true')
  })
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && host.dataset.expanded === 'true') {
      event.preventDefault()
      setExpanded(false)
      return
    }
    const tab = event.target.closest('[role="tab"]')
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
      return
    event.preventDefault()
    const tabs = [...root.querySelectorAll('[role="tab"]')]
    const index = tabs.indexOf(tab)
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
            tabs.length
    navigate(tabs[next].dataset.previewSection)
    tabs[next].focus({ preventScroll: true })
  })
}
