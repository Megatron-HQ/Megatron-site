import '@fontsource/geist-sans/latin-400.css'
import '@fontsource/geist-sans/latin-500.css'
import '@fontsource/geist-sans/latin-600.css'
import '@fontsource/geist-sans/latin-700.css'
import '@fontsource/geist-mono/latin-400.css'
import { mountProductDemo, refreshIcons } from './product-preview-host.js'
import { mountAnalyticsDeck } from './analytics-deck.js'

const COPY_FEEDBACK_DURATION_MS = 2500
const HEADER_SCROLLED_THRESHOLD = 20
const DESKTOP_NAVIGATION_WIDTH = '(min-width: 768px)'
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function requireElement(selector) {
  const element = document.querySelector(selector)
  if (!element) throw new Error(`Required page element is missing: ${selector}`)
  return element
}

function initializeNavigation() {
  const button = requireElement('[data-menu-toggle]')
  const navigation = requireElement('#mobile-navigation')
  const desktop = window.matchMedia(DESKTOP_NAVIGATION_WIDTH)
  function setOpen(open) {
    button.setAttribute('aria-expanded', String(open))
    button.setAttribute(
      'aria-label',
      open ? 'Close navigation' : 'Open navigation'
    )
    navigation.hidden = !open
  }
  button.addEventListener('click', () =>
    setOpen(button.getAttribute('aria-expanded') !== 'true')
  )
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false)
  })
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || navigation.hidden) return
    setOpen(false)
    button.focus()
  })
  desktop.addEventListener('change', () => {
    if (desktop.matches) setOpen(false)
  })
}

function selectCommands(code) {
  const selection = window.getSelection()
  if (!selection)
    throw new Error('Text selection is unavailable in this browser.')
  const range = document.createRange()
  range.selectNodeContents(code)
  selection.removeAllRanges()
  selection.addRange(range)
}

function initializeInstallationCopy() {
  const button = requireElement('[data-copy-install]')
  const label = requireElement('[data-copy-label]')
  const status = requireElement('[data-copy-status]')
  const code = requireElement('#install-commands')
  let feedbackTimer
  let copying = false
  button.addEventListener('click', async () => {
    if (copying) return
    copying = true
    window.clearTimeout(feedbackTimer)
    try {
      if (!navigator.clipboard?.writeText)
        throw new DOMException('Clipboard is unavailable', 'NotSupportedError')
      // Collapse whitespace as the browser renders it: a formatter line break inside
      // the code would otherwise paste as a newline and run a truncated command.
      await navigator.clipboard.writeText(
        code.textContent.replace(/\s+/g, ' ').trim()
      )
      label.textContent = 'Copied'
      status.textContent = 'Install command copied.'
    } catch (error) {
      if (!(error instanceof DOMException)) {
        label.textContent = 'Copy failed'
        status.textContent =
          'The command could not be copied. Select it to copy it manually.'
        console.error('Installation copy failed:', error)
      } else {
        selectCommands(code)
        label.textContent = 'Selected'
        status.textContent = 'Command selected. Press Ctrl+C or Cmd+C to copy.'
      }
    } finally {
      copying = false
      feedbackTimer = window.setTimeout(() => {
        label.textContent = 'Copy'
        status.textContent = ''
      }, COPY_FEEDBACK_DURATION_MS)
    }
  })
}

// The markup ships both platforms visible and the tabs hidden, so visitors without
// JavaScript read both install paths stacked instead of meeting dead tabs. Only
// Windows is detected: every other visitor, phones included, starts on macOS.
function initializePlatformTabs() {
  const tablist = requireElement('[data-install-tabs]')
  const tabs = [...tablist.querySelectorAll('[role="tab"]')]
  const panels = [...document.querySelectorAll('[data-platform-panel]')]
  function select(platform) {
    for (const tab of tabs) {
      const selected = tab.dataset.platform === platform
      tab.setAttribute('aria-selected', String(selected))
      tab.tabIndex = selected ? 0 : -1
    }
    for (const panel of panels)
      panel.hidden = panel.dataset.platformPanel !== platform
  }
  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]')
    if (tab) select(tab.dataset.platform)
  })
  tablist.addEventListener('keydown', (event) => {
    const tab = event.target.closest('[role="tab"]')
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
      return
    event.preventDefault()
    const index = tabs.indexOf(tab)
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) %
            tabs.length
    select(tabs[next].dataset.platform)
    tabs[next].focus()
  })
  select(/Windows/.test(navigator.userAgent) ? 'windows' : 'mac')
  tablist.hidden = false
}

function initializeHeaderElevation() {
  const header = requireElement('[data-header]')
  let scheduled = false
  const updateHeader = () => {
    header.classList.toggle(
      'is-scrolled',
      window.scrollY > HEADER_SCROLLED_THRESHOLD
    )
    scheduled = false
  }
  window.addEventListener(
    'scroll',
    () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(updateHeader)
    },
    { passive: true }
  )
  updateHeader()
}

function initializeSectionReveals() {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in-view')
        observer.unobserve(entry.target)
      }
    },
    { threshold: 0.12 }
  )
  document
    .querySelectorAll(
      '.section-heading, .feature-panel, .plugin-feature, .analytics-list, .context-visual, .local-layout, .installation-intro, .installation-guide'
    )
    .forEach((element) => {
      element.classList.add('reveal-ready')
      observer.observe(element)
    })
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return
    observer.disconnect()
    document
      .querySelectorAll('.reveal-ready')
      .forEach((element) => element.classList.add('is-in-view'))
  })
}

// A `?clock=` override pins every sample to one moment, as QA and the full preview do.
function resolveSampleClock() {
  const requested = new URLSearchParams(window.location.search).get('clock')
  if (requested === null) return new Date()
  const clock = new Date(requested)
  if (!Number.isFinite(clock.getTime()))
    throw new RangeError('Invalid sample clock.')
  return clock
}

function initializeAnalyticsDeck() {
  const deck = mountAnalyticsDeck(requireElement('[data-analytics-deck]'), {
    sampleClock: resolveSampleClock(),
    reducedMotion
  })
  for (const button of document.querySelectorAll('[data-analytics-open]'))
    button.addEventListener('click', () =>
      deck.open(button.dataset.analyticsOpen, button)
    )
  return deck
}

refreshIcons()
const analyticsDeck = initializeAnalyticsDeck()
mountProductDemo(requireElement('#product-demo'), {
  onSampleTheme: analyticsDeck.setTheme
})
initializeNavigation()
initializePlatformTabs()
initializeInstallationCopy()
initializeHeaderElevation()
initializeSectionReveals()
