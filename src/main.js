import '@fontsource/geist-sans/latin-400.css'
import '@fontsource/geist-sans/latin-500.css'
import '@fontsource/geist-sans/latin-600.css'
import '@fontsource/geist-sans/latin-700.css'
import '@fontsource/geist-mono/latin-400.css'
import { mountProductDemo, refreshIcons } from './product-preview-host.js'

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
      await navigator.clipboard.writeText(code.textContent.trim())
      label.textContent = 'Copied'
      status.textContent = 'Installation commands copied.'
    } catch (error) {
      if (!(error instanceof DOMException)) {
        label.textContent = 'Copy failed'
        status.textContent =
          'The commands could not be copied. Select the code to copy it manually.'
        console.error('Installation copy failed:', error)
      } else {
        selectCommands(code)
        label.textContent = 'Selected'
        status.textContent = 'Commands selected. Press Ctrl+C or Cmd+C to copy.'
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
      '.section-heading, .feature-panel, .plugin-feature, .analytics-layout, .local-layout, .installation-intro, .installation-guide'
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

refreshIcons()
const preview = mountProductDemo(requireElement('#product-demo'))
initializeNavigation()
initializeInstallationCopy()
initializeHeaderElevation()
initializeSectionReveals()
requireElement('[data-show-cost]').addEventListener('click', () => {
  preview.showCost()
  requireElement('#product').scrollIntoView({
    behavior: reducedMotion.matches ? 'instant' : 'smooth',
    block: 'start'
  })
})
