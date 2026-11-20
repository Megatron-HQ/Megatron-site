const MIN_VISIBLE_RATIO = 0.6
const CURSOR_MOVE_MS = 560
const CLICK_FEEDBACK_MS = 280
const SCROLL_MS = 1000
const SCROLL_INSET = 24
const VISITOR_INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'click']

const ease = (progress) => progress * progress * (3 - 2 * progress)
const interpolate = (from, to, progress) => from + (to - from) * progress

function scrollWithin(scroller, top) {
  scroller.scrollTo({ top, behavior: 'instant' })
}

function revealRow(row) {
  const scroller = row.closest(
    '[class~="overflow-auto"], [class~="overflow-y-auto"]'
  )
  if (!scroller) return
  const bounds = row.getBoundingClientRect()
  const clip = scroller.getBoundingClientRect()
  if (bounds.top < clip.top || bounds.bottom > clip.bottom) {
    scrollWithin(
      scroller,
      scroller.scrollTop +
        bounds.top -
        clip.top -
        (clip.height - bounds.height) / 2
    )
  }
}

function centerOf(element) {
  const bounds = element.getBoundingClientRect()
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2
  }
}

function* walkthrough(app, reducedMotion, visual) {
  const rail = (label) =>
    app.querySelector(
      `nav[aria-label="Main navigation"] button[aria-label="${label}"]`
    )
  const back = (label) => app.querySelector(`button[aria-label="${label}"]`)
  const usagePanel = (label) =>
    [...app.querySelectorAll('nav[aria-label="Usage panels"] button')].find(
      (button) => button.textContent.trim() === label
    )
  const row = (example) => {
    const rows = [...app.querySelectorAll('main tbody tr[data-row-key]')]
    return rows.find((item) => item.textContent.includes(example)) ?? rows[0]
  }
  const detailSection = (label) =>
    [...app.querySelectorAll('main section > h3, main section > p')]
      .find((element) => element.textContent.trim().startsWith(label))
      ?.closest('section')

  function* moveTo(destination) {
    const from = visual.point ?? { x: 36, y: 40 }
    yield {
      duration: CURSOR_MOVE_MS,
      draw(progress) {
        const to = destination()
        const eased = ease(progress)
        visual.point = {
          x: interpolate(from.x, to.x, eased),
          y: interpolate(from.y, to.y, eased)
        }
      }
    }
  }

  function* click(element, dwell) {
    if (!element) return
    if (element.matches('tr')) revealRow(element)
    if (!reducedMotion) yield* moveTo(() => centerOf(element))
    if (!element.isConnected) return
    visual.point = centerOf(element)
    visual.highlight = true
    element.click()
    yield { duration: CLICK_FEEDBACK_MS }
    visual.highlight = false
    yield { duration: dwell }
  }

  function* scrollDetails(dwell, label) {
    const section = label ? detailSection(label) : null
    if (label && !section) return
    const scroller =
      section?.closest('[class~="overflow-y-auto"]') ??
      app.querySelector('main [class~="overflow-y-auto"]')
    if (!scroller) return
    const from = scroller.scrollTop
    const clip = scroller.getBoundingClientRect()
    const maxScroll = scroller.scrollHeight - scroller.clientHeight
    const destination = section
      ? from + section.getBoundingClientRect().top - clip.top - SCROLL_INSET
      : maxScroll
    const to = Math.min(maxScroll, Math.max(0, destination))
    const anchor = () => {
      const bounds = scroller.getBoundingClientRect()
      return {
        x: bounds.left + bounds.width * 0.72,
        y: bounds.top + bounds.height * 0.4
      }
    }
    if (reducedMotion) {
      scrollWithin(scroller, to)
      visual.point = anchor()
      visual.highlight = true
      yield { duration: CLICK_FEEDBACK_MS }
      visual.highlight = false
    } else {
      yield* moveTo(anchor)
      yield {
        duration: SCROLL_MS,
        draw(progress) {
          scrollWithin(scroller, interpolate(from, to, ease(progress)))
        }
      }
    }
    yield { duration: dwell }
  }

  yield* click(rail('Skills'), 500)
  yield* click(back('Back to skill details'), 500)
  yield* click(back('Back to skills'), 500)
  yield* click(row('code-review'), 1450)
  if (back('Back to skills')) yield* scrollDetails(1750)

  yield* click(rail('Plugins'), 650)
  yield* click(back('Back to plugins'), 500)
  yield* click(row('frontend'), 1400)
  if (back('Back to plugins')) yield* scrollDetails(1800, 'MCP servers')

  yield* click(rail('MCP servers'), 650)
  yield* click(back('Back to MCP servers'), 500)
  yield* click(row('workspace-docs'), 1450)
  if (back('Back to MCP servers')) yield* scrollDetails(2000, 'Tools used')

  yield* click(rail('Usage'), 750)
  yield* click(usagePanel('Activity'), 2050)
  yield* click(usagePanel('Cost'), 2800)
}

export function mountPreviewTour({ frame, viewport, button, indicator }) {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  const cursor = indicator.querySelector('[data-preview-tour-cursor]')
  let autoStartPending = !motionPreference.matches
  let hasPlayed = false
  let inView = false
  let inputDocument
  let inputListeners
  let ready = false
  let animationFrame = null
  let run = null

  function canPlay() {
    return inView && !document.hidden
  }

  function render() {
    button.disabled = !ready
    button.toggleAttribute('data-playing', Boolean(run))
    button.textContent = run
      ? 'Take control'
      : hasPlayed
        ? 'Replay walkthrough'
        : 'Play walkthrough'
    renderIndicator()
  }

  function renderIndicator() {
    const point = run?.visual.point
    const highlight = run?.visual.highlight
    indicator.hidden = !canPlay() || !point || (run.reducedMotion && !highlight)
    if (indicator.hidden) return
    cursor.hidden = run.reducedMotion
    indicator.toggleAttribute('data-highlight', highlight)
    // The cursor uses the renderer's coordinates even when the host scales it.
    const bounds = frame.getBoundingClientRect()
    const clip = viewport.getBoundingClientRect()
    const x =
      bounds.left -
      clip.left -
      viewport.clientLeft +
      (point.x * bounds.width) / frame.offsetWidth
    const y =
      bounds.top -
      clip.top -
      viewport.clientTop +
      (point.y * bounds.height) / frame.offsetHeight
    indicator.style.transform = `translate(${x}px, ${y}px)`
  }

  function stop() {
    autoStartPending = false
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
    animationFrame = null
    run = null
    render()
  }

  function start() {
    if (!ready || !inputDocument) return
    autoStartPending = false
    hasPlayed = true
    const reducedMotion = motionPreference.matches
    const visual = { point: null, highlight: false }
    run = {
      reducedMotion,
      visual,
      steps: walkthrough(inputDocument, reducedMotion, visual),
      effect: null,
      elapsed: 0,
      lastTimestamp: null
    }
    render()
    schedule()
  }

  function schedule() {
    if (run && canPlay() && animationFrame === null)
      animationFrame = window.requestAnimationFrame(tick)
  }

  function tick(timestamp) {
    animationFrame = null
    if (!run || !canPlay()) return
    if (!run.effect) {
      const next = run.steps.next()
      if (next.done) {
        stop()
        return
      }
      run.effect = next.value
      run.elapsed = 0
      run.lastTimestamp = timestamp
    }
    run.elapsed += timestamp - (run.lastTimestamp ?? timestamp)
    run.lastTimestamp = timestamp
    const progress = Math.min(1, run.elapsed / run.effect.duration)
    run.effect.draw?.(progress)
    if (progress === 1) run.effect = null
    renderIndicator()
    schedule()
  }

  function updateVisibility() {
    if (!canPlay()) {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
      animationFrame = null
      if (run) run.lastTimestamp = null
      renderIndicator()
    } else if (ready && autoStartPending) start()
    else schedule()
  }

  function takeOverOnInput(event) {
    if (event.isTrusted && (run || autoStartPending)) stop()
  }

  new IntersectionObserver(
    ([entry]) => {
      inView =
        entry.isIntersecting && entry.intersectionRatio >= MIN_VISIBLE_RATIO
      updateVisibility()
    },
    { threshold: MIN_VISIBLE_RATIO }
  ).observe(viewport)
  document.addEventListener('visibilitychange', updateVisibility)
  motionPreference.addEventListener('change', (event) => {
    if (event.matches && (autoStartPending || (run && !run.reducedMotion)))
      stop()
  })
  button.addEventListener('click', () => {
    if (run) stop()
    else start()
  })

  return {
    ready() {
      const app = frame.contentDocument
      if (!app) return
      if (inputDocument !== app) {
        inputListeners?.abort()
        inputListeners = new AbortController()
        inputDocument = app
        for (const event of VISITOR_INPUT_EVENTS)
          app.addEventListener(event, takeOverOnInput, {
            capture: true,
            passive: true,
            signal: inputListeners.signal
          })
      }
      ready = true
      render()
      updateVisibility()
    },
    stop,
    unavailable() {
      ready = false
      stop()
    }
  }
}
