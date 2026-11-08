import { refreshIcons } from './icons.js'
import {
  ANALYTICS_VIEWS,
  buildAnalyticsCardStats
} from './preview/card-stats.ts'
import { isFocusMessage, revealFocusedRange } from './preview-focus.js'
import {
  frameAt,
  createDeckMotion,
  isOnScreen
} from './analytics-deck-motion.js'

// Below this width the opened views wrap their own headers, so they open full screen instead.
const INLINE_MINIMUM_WIDTH = 440
const LOAD_TIMEOUT_MS = 15000
const STATS_IDLE_TIMEOUT_MS = 2000
const INTRO_NOTE =
  'The actual Megatron views with sample data. Pick a card to explore it here.'
const SLOW_LOAD_NOTICE =
  'The sample is taking longer to load. Close it and open it again to retry.'

const VIEW_DETAILS = Object.freeze({
  tokens: {
    label: 'Tokens',
    note: 'Switch periods, and hover or focus a compact value for its exact count.'
  },
  cost: {
    label: 'Cost',
    note: 'Estimated API-equivalent cost, not your subscription bill.'
  },
  activity: {
    label: 'Activity',
    note: 'Switch periods, then open a day or hour for its details.'
  },
  history: {
    label: 'History',
    note: 'Switch years, then open a day for its prompts, sessions, and projects.'
  },
  models: {
    label: 'Models',
    note: 'Switch periods to compare models and recorded reasoning effort.'
  },
  skills: {
    label: 'Skills',
    note: 'Open a trend bar for the invocations behind it.'
  },
  'resident-tax': {
    label: 'Resident tax',
    note: 'Open a category for its details. Deferred tools stay outside the loaded total.'
  }
})

function requirePart(root, selector) {
  const element = root.querySelector(selector)
  if (!element) throw new Error(`The analytics deck is missing ${selector}.`)
  return element
}

function cardNumber(view) {
  return String(ANALYTICS_VIEWS.indexOf(view) + 1).padStart(2, '0')
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;')
}

function cardMarkup(view, index) {
  const { label } = VIEW_DETAILS[view]
  const id = `deck-card-${view}`
  return `<li class="deck-card" style="--deck-index: ${index}">
    <button type="button" class="deck-card-button" data-deck-open="${view}" aria-label="Open ${escapeHtml(label)}" aria-describedby="${id}-figure ${id}-caption">
      <span class="deck-card-band">
        <span class="deck-card-number">${cardNumber(view)}</span>
        <span class="deck-card-title">${escapeHtml(label)}</span>
        <span class="deck-card-peek" data-deck-peek></span>
        <i data-lucide="arrow-up-right" aria-hidden="true"></i>
      </span>
      <span class="deck-card-body">
        <span class="deck-card-figure" id="${id}-figure" data-deck-figure></span>
        <span class="deck-card-caption" id="${id}-caption" data-deck-caption></span>
        <span class="deck-card-chart" data-deck-chart aria-hidden="true"></span>
        <span class="deck-card-legend" data-deck-legend aria-hidden="true"></span>
      </span>
    </button>
  </li>`
}

function stageMarkup() {
  return `<ol class="deck-stack" data-deck-stack aria-label="Analytics views">${ANALYTICS_VIEWS.map(cardMarkup).join('')}</ol>
  <dialog class="deck-viewer" data-deck-viewer role="region" aria-labelledby="deck-viewer-title" data-frame-ready="false">
    <div class="deck-viewer-header">
      <h3 class="eyebrow deck-viewer-title" id="deck-viewer-title" tabindex="-1" data-deck-title></h3>
      <div class="deck-viewer-actions">
        <button type="button" class="deck-viewer-button" data-deck-expand aria-expanded="false">Expand</button>
        <button type="button" class="deck-viewer-button deck-viewer-close" data-deck-close><i data-lucide="x" aria-hidden="true"></i></button>
      </div>
    </div>
    <div class="context-preview-viewport" tabindex="0" role="region" data-deck-viewport>
      <iframe class="context-preview" data-analytics-frame referrerpolicy="no-referrer"></iframe>
      <p class="deck-viewer-loading" aria-hidden="true">Loading sample…</p>
    </div>
    <p class="deck-viewer-note" data-deck-viewer-note></p>
    <p class="deck-viewer-notice" data-deck-notice role="status" aria-live="polite"></p>
  </dialog>`
}

function drawChart(container, chart) {
  container.dataset.kind = chart.kind
  if (chart.kind === 'bars') {
    const largest = Math.max(...chart.values)
    container.replaceChildren(
      ...chart.values.map((value) => {
        const bar = document.createElement('span')
        bar.className = 'deck-bar'
        bar.style.setProperty(
          '--deck-bar',
          String(largest > 0 ? value / largest : 0)
        )
        return bar
      })
    )
    return
  }
  container.replaceChildren(
    ...chart.segments.map((segment) => {
      const piece = document.createElement('span')
      piece.className = 'deck-segment'
      piece.dataset.tone = segment.tone
      piece.style.flexGrow = String(segment.share)
      return piece
    })
  )
}

function drawLegend(container, legend) {
  container.replaceChildren(
    ...legend.map((entry) => {
      const row = document.createElement('span')
      row.className = 'deck-legend-row'
      row.dataset.tone = entry.tone
      const label = document.createElement('span')
      label.className = 'deck-legend-label'
      label.textContent = entry.label
      const value = document.createElement('span')
      value.className = 'deck-legend-value'
      value.textContent = entry.value
      row.append(label, value)
      return row
    })
  )
}

function scheduleIdle(callback) {
  if ('requestIdleCallback' in window)
    window.requestIdleCallback(callback, { timeout: STATS_IDLE_TIMEOUT_MS })
  else window.setTimeout(callback, 0)
}

/**
 * The Follow-the-work card stack: seven sample cards that each open the
 * matching live Megatron view in place, or full screen when the column is
 * too narrow for the app's layout.
 */
export function mountAnalyticsDeck(root, { sampleClock, reducedMotion }) {
  if (!(root instanceof HTMLElement))
    throw new TypeError('The analytics deck needs a root element.')
  if (!(sampleClock instanceof Date) || !Number.isFinite(sampleClock.getTime()))
    throw new RangeError('The analytics deck needs a valid sample clock.')
  const stage = requirePart(root, '[data-deck-stage]')
  const panelNote = requirePart(root, '[data-deck-note]')
  root.style.setProperty(
    '--deck-back-cards',
    String(ANALYTICS_VIEWS.length - 1)
  )
  stage.innerHTML = stageMarkup()
  refreshIcons(stage)
  const stack = requirePart(stage, '[data-deck-stack]')
  const viewer = requirePart(stage, '[data-deck-viewer]')
  const title = requirePart(viewer, '[data-deck-title]')
  const expandButton = requirePart(viewer, '[data-deck-expand]')
  const closeButton = requirePart(viewer, '[data-deck-close]')
  const viewport = requirePart(viewer, '[data-deck-viewport]')
  const frame = requirePart(viewer, '[data-analytics-frame]')
  const viewerNote = requirePart(viewer, '[data-deck-viewer-note]')
  const notice = requirePart(viewer, '[data-deck-notice]')
  const cards = [...stack.querySelectorAll('.deck-card')]
  const motion = createDeckMotion({ reducedMotion })
  const sampleBase = new URL(
    `${import.meta.env.BASE_URL}preview/index.html`,
    window.location.origin
  )

  let mode = 'stack'
  let openView = null
  let openedFullScreen = false
  let returnFocusTo = null
  let frameReady = false
  let loadTimedOut = false
  let loadTimer
  let darkTheme = false
  let previousOverflow = ''
  let running = null
  let settling = []

  panelNote.textContent = INTRO_NOTE

  function cardFor(view) {
    return requirePart(stack, `[data-deck-open="${view}"]`).closest('li')
  }
  function sampleUrl(view) {
    const url = new URL(sampleBase)
    url.searchParams.set('sample', view)
    url.searchParams.set('clock', sampleClock.toISOString())
    return url.href
  }
  function loadedView() {
    const source = frame.getAttribute('src')
    return source ? new URL(source).searchParams.get('sample') : null
  }
  function postToFrame(message) {
    frame.contentWindow?.postMessage(message, sampleBase.origin)
  }
  function postTheme() {
    postToFrame({ type: 'megatron-preview:theme', dark: darkTheme })
  }
  function setMode(next) {
    mode = next
    root.dataset.state = next
  }

  function startLoading(view) {
    frameReady = false
    loadTimedOut = false
    viewer.dataset.frameReady = 'false'
    window.clearTimeout(loadTimer)
    loadTimer = window.setTimeout(() => {
      if (frameReady) return
      loadTimedOut = true
      notice.textContent = SLOW_LOAD_NOTICE
    }, LOAD_TIMEOUT_MS)
    frame.src = sampleUrl(view)
  }
  function navigateFrame(view) {
    postToFrame({
      type: 'megatron-preview:navigate',
      section: 'usage',
      panel: view
    })
  }
  // A ready frame always remounts the view, so every open starts on the card's window.
  // A frame still loading is redirected by the ready handler instead.
  function showView(view) {
    if (!frame.getAttribute('src') || loadTimedOut) startLoading(view)
    else if (frameReady) navigateFrame(view)
    viewport.scrollLeft = 0
  }
  function describeView(view) {
    const { label, note } = VIEW_DETAILS[view]
    title.textContent = `${cardNumber(view)} / ${label.toUpperCase()}`
    frame.title = `${label} view from Megatron with sample data`
    viewport.setAttribute(
      'aria-label',
      `${label} sample; scroll for the full view and pan sideways on narrow screens`
    )
    closeButton.setAttribute('aria-label', `Close ${label}`)
    panelNote.textContent = note
    viewerNote.textContent = note
    if (!loadTimedOut) notice.textContent = ''
  }

  function setStackCovered(covered) {
    stack.toggleAttribute('data-covered', covered)
    stack.inert = covered
  }
  function surfaces() {
    const style = getComputedStyle(root)
    return {
      card: style.getPropertyValue('--deck-surface').trim(),
      panel: style.getPropertyValue('--panel-surface').trim()
    }
  }
  // A back card is mostly hidden behind the cards in front of it; morphing
  // uses only the strip a visitor can actually see.
  function visibleRect(element) {
    const card = element.closest('.deck-card')
    if (!card) return element.getBoundingClientRect()
    const rect = card.getBoundingClientRect()
    const inFront = cards[cards.indexOf(card) + 1]
    if (!inFront) return rect
    const height = inFront.getBoundingClientRect().top - rect.top
    return new DOMRect(rect.left, rect.top, rect.width, Math.max(0, height))
  }
  function frameFrom(element) {
    if (!element) return null
    const rect = visibleRect(element)
    return isOnScreen(rect)
      ? frameAt(rect, viewer.getBoundingClientRect())
      : null
  }

  // Each transition fills its animations until `commit` lands the end state.
  // Any new action fast-forwards the running one first, so rapid input never
  // leaves the deck between states.
  function fastForward() {
    for (const animation of settling) animation.cancel()
    settling = []
    if (!running) return
    const { animations, commit } = running
    running = null
    commit()
    for (const animation of animations) animation.cancel()
  }
  // `settlingAnimations` may outlast the commit; they carry no end state.
  async function play(animations, commit, settlingAnimations = []) {
    const entry = { animations, commit }
    running = entry
    settling = settlingAnimations
    try {
      await Promise.all(animations.map((animation) => animation.finished))
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        throw error
    }
    if (running !== entry) return
    running = null
    commit()
    for (const animation of animations) animation.cancel()
  }

  function showFullScreen() {
    if (viewer.open) viewer.close()
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    viewer.setAttribute('role', 'dialog')
    viewer.setAttribute('aria-modal', 'true')
    expandButton.hidden = openedFullScreen
    expandButton.textContent = 'Collapse'
    expandButton.setAttribute('aria-expanded', 'true')
    viewer.showModal()
    setMode('expanded')
  }
  function leaveFullScreen() {
    viewer.close()
    document.body.style.overflow = previousOverflow
    viewer.setAttribute('role', 'region')
    viewer.removeAttribute('aria-modal')
    expandButton.hidden = false
    expandButton.textContent = 'Expand'
    expandButton.setAttribute('aria-expanded', 'false')
  }

  function openInPlace(view) {
    const card = cardFor(view)
    const origin = cards.indexOf(card)
    viewer.show()
    setMode('inline')
    // The view owns focus from the first frame; only the pile's fade waits for the commit.
    stack.inert = true
    const { card: cardSurface, panel } = surfaces()
    void play(
      [
        ...motion.reveal(viewer, frameFrom(card)),
        ...motion.surface(viewer, cardSurface, panel, motion.timing.grow),
        ...motion.contentIn(viewer),
        ...motion.pileAway(stack),
        ...motion.cardsAway(cards, origin)
      ],
      () => setStackCovered(true)
    )
  }
  function openFullScreen(source) {
    openedFullScreen = true
    showFullScreen()
    const { card: cardSurface, panel } = surfaces()
    void play(
      [
        ...motion.reveal(viewer, frameFrom(source)),
        ...(source.closest('.deck-card')
          ? motion.surface(viewer, cardSurface, panel, motion.timing.grow)
          : []),
        ...motion.backdrop(viewer, true),
        ...motion.contentIn(viewer)
      ],
      () => {}
    )
  }
  function switchView() {
    void play(motion.contentIn(viewer), () => {})
  }

  function open(view, invoker) {
    if (!ANALYTICS_VIEWS.includes(view))
      throw new RangeError(`Unknown analytics view: ${view}`)
    fastForward()
    returnFocusTo =
      invoker instanceof HTMLElement
        ? invoker
        : requirePart(stack, `[data-deck-open="${view}"]`)
    const alreadyOpen = mode !== 'stack'
    openView = view
    describeView(view)
    showView(view)
    if (alreadyOpen) switchView()
    else if (stage.clientWidth >= INLINE_MINIMUM_WIDTH) {
      openedFullScreen = false
      openInPlace(view)
    } else openFullScreen(returnFocusTo)
    title.focus({ preventScroll: true })
  }

  function close() {
    fastForward()
    if (mode === 'stack') return
    const card = cardFor(openView)
    const origin = cards.indexOf(card)
    const focusTarget = returnFocusTo
    const { card: cardSurface, panel } = surfaces()
    openView = null
    panelNote.textContent = INTRO_NOTE
    setStackCovered(false)
    if (mode === 'inline') {
      focusTarget?.focus({ preventScroll: true })
      void play(
        [
          ...motion.contentOut(viewer),
          ...motion.land(viewer, frameFrom(card)),
          ...motion.surface(viewer, panel, cardSurface, motion.timing.shrink),
          ...motion.pileBack(stack)
        ],
        () => {
          viewer.close()
          setMode('stack')
        },
        motion.cardsBack(cards, origin)
      )
      return
    }
    // Opened straight to full screen: return to whatever opened it. Expanded
    // from the panel: land back on the card while the pile settles behind.
    const target = openedFullScreen ? focusTarget : card
    void play(
      [
        ...motion.contentOut(viewer),
        ...motion.land(viewer, frameFrom(target)),
        ...(target.closest('.deck-card')
          ? motion.surface(viewer, panel, cardSurface, motion.timing.shrink)
          : []),
        ...motion.backdrop(viewer, false),
        ...(openedFullScreen ? [] : motion.pileBack(stack))
      ],
      () => {
        leaveFullScreen()
        setMode('stack')
        // Focus can only leave a modal dialog once it has closed.
        focusTarget?.focus({ preventScroll: true })
      },
      openedFullScreen ? [] : motion.cardsBack(cards, origin)
    )
  }

  function expand() {
    const inline = viewer.getBoundingClientRect()
    openedFullScreen = false
    setStackCovered(true)
    showFullScreen()
    void play(
      [
        ...motion.reveal(
          viewer,
          frameAt(inline, viewer.getBoundingClientRect())
        ),
        ...motion.backdrop(viewer, true)
      ],
      () => {}
    )
  }
  function collapse() {
    void play(
      [
        ...motion.conceal(
          viewer,
          frameAt(stage.getBoundingClientRect(), viewer.getBoundingClientRect())
        ),
        ...motion.backdrop(viewer, false)
      ],
      () => {
        leaveFullScreen()
        viewer.show()
        setMode('inline')
        expandButton.focus({ preventScroll: true })
      }
    )
  }
  function toggleExpanded() {
    fastForward()
    if (mode === 'inline') {
      expand()
      expandButton.focus({ preventScroll: true })
    } else if (mode === 'expanded' && !openedFullScreen) collapse()
  }
  // A second Escape while collapsing lands the collapse, then closes the view.
  function handleEscape() {
    fastForward()
    if (mode === 'expanded' && !openedFullScreen) collapse()
    else close()
  }

  stack.addEventListener('click', (event) => {
    const button = event.target.closest('[data-deck-open]')
    if (button) open(button.dataset.deckOpen, button)
  })
  closeButton.addEventListener('click', close)
  expandButton.addEventListener('click', toggleExpanded)
  viewer.addEventListener('cancel', (event) => {
    event.preventDefault()
    handleEscape()
  })
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || mode !== 'inline') return
    event.preventDefault()
    handleEscape()
  })
  window.addEventListener('message', (event) => {
    if (
      event.origin !== sampleBase.origin ||
      event.source !== frame.contentWindow ||
      typeof event.data !== 'object' ||
      event.data === null
    )
      return
    const message = event.data
    if (message.type === 'megatron-preview:sample-ready') {
      frameReady = true
      loadTimedOut = false
      window.clearTimeout(loadTimer)
      viewer.dataset.frameReady = 'true'
      postTheme()
      if (openView && openView !== loadedView()) navigateFrame(openView)
    } else if (message.type === 'megatron-preview:sample-view')
      viewer.dataset.view = String(message.panel)
    else if (message.type === 'megatron-preview:error') viewport.scrollLeft = 0
    else if (
      message.type === 'megatron-preview:notice' &&
      typeof message.message === 'string'
    )
      notice.textContent = message.message
    else if (message.type === 'megatron-preview:escape') handleEscape()
    else if (isFocusMessage(message)) revealFocusedRange(viewport, message)
  })

  scheduleIdle(() => {
    let stats
    try {
      stats = buildAnalyticsCardStats(sampleClock)
    } catch (error) {
      root.dataset.stats = 'unavailable'
      console.error('The analytics card figures could not be computed:', error)
      return
    }
    for (const stat of stats) {
      const card = cardFor(stat.view)
      requirePart(card, '[data-deck-figure]').textContent = stat.figure
      requirePart(card, '[data-deck-caption]').textContent = stat.caption
      requirePart(card, '[data-deck-peek]').textContent = stat.figure
      drawChart(requirePart(card, '[data-deck-chart]'), stat.chart)
      drawLegend(requirePart(card, '[data-deck-legend]'), stat.legend)
    }
    root.dataset.stats = 'ready'
  })

  return Object.freeze({
    open,
    setTheme(dark) {
      darkTheme = dark === true
      root.classList.toggle('is-dark', darkTheme)
      if (frameReady) postTheme()
    }
  })
}
