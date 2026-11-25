const AUTOPLAY_VISIBLE_RATIO = 0.25
const CURSOR_MOVE_MS = 560
const CLICK_FEEDBACK_MS = 280
const SCROLL_MS = 1000
const SCROLL_INSET = 24

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

  // Starting a tour after a manual visit can leave a dialog over the app.
  const dialogs = app.querySelectorAll(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
  )
  for (const dialog of [...dialogs].reverse()) {
    if (!dialog.isConnected || dialog.dataset.state !== 'open') continue
    const close = dialog.querySelector('[data-slot="dialog-close"]')
    if (close) yield* click(close, CLICK_FEEDBACK_MS)
    else {
      dialog.dispatchEvent(
        new app.defaultView.KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true
        })
      )
      yield { duration: CLICK_FEEDBACK_MS }
    }
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
  yield* click(app.querySelector('button[aria-label="Add server"]'), 1350)
  yield* click(
    app.querySelector(
      '[role="dialog"][data-state="open"] [data-slot="dialog-close"]'
    ),
    450
  )
  yield* click(row('workspace-docs'), 1450)
  if (back('Back to MCP servers')) yield* scrollDetails(2000, 'Tools used')

  yield* click(rail('Usage'), 750)
  yield* click(usagePanel('Activity'), 2050)
  yield* click(usagePanel('Cost'), 2800)
}

export function mountPreviewTour({
  frame,
  viewport,
  button,
  indicator,
  motionNote,
  onPlaybackChange
}) {
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  const cursor = indicator.querySelector('[data-preview-tour-cursor]')
  let mode = motionPreference.matches ? 'manual' : 'awaiting-autoplay'
  let hasPlayed = false
  let inView = false
  let canAutoplay = false
  let manualPreviewSeen = false
  let appDocument = null
  let animationFrame = null
  let run = null

  function canPlay() {
    return appDocument !== null && inView && !document.hidden
  }

  function render() {
    const playing = mode === 'playing'
    const explainReducedMotion = motionPreference.matches && !playing
    button.disabled = !appDocument && !playing
    button.toggleAttribute('data-playing', playing)
    button.textContent = playing
      ? 'Take control'
      : hasPlayed
        ? 'Replay walkthrough'
        : 'Play walkthrough'
    motionNote.hidden = !explainReducedMotion
    if (explainReducedMotion)
      button.setAttribute('aria-describedby', motionNote.id)
    else button.removeAttribute('aria-describedby')
    onPlaybackChange(playing)
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

  function pause() {
    if (animationFrame !== null) window.cancelAnimationFrame(animationFrame)
    animationFrame = null
    if (run) run.lastTimestamp = null
  }

  function takeControl() {
    // Link navigation can begin before the observer reports the latest scroll.
    const bounds = viewport.getBoundingClientRect()
    manualPreviewSeen =
      !document.hidden && bounds.top < window.innerHeight && bounds.bottom > 0
    mode = 'manual'
    pause()
    run = null
    render()
  }

  function start() {
    if (!appDocument) return
    mode = 'playing'
    hasPlayed = true
    render()
    schedule()
  }

  function createRun() {
    const reducedMotion = motionPreference.matches
    const visual = { point: null, highlight: false }
    return {
      reducedMotion,
      visual,
      steps: walkthrough(appDocument, reducedMotion, visual),
      effect: null,
      elapsed: 0,
      lastTimestamp: null
    }
  }

  function schedule() {
    if (mode === 'playing' && canPlay() && animationFrame === null)
      animationFrame = window.requestAnimationFrame(tick)
  }

  function tick(timestamp) {
    animationFrame = null
    if (mode !== 'playing' || !canPlay()) return
    run ??= createRun()
    if (!run.effect) {
      const next = run.steps.next()
      if (next.done) {
        run.steps = walkthrough(appDocument, run.reducedMotion, run.visual)
        schedule()
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
      pause()
      renderIndicator()
    } else if (mode === 'awaiting-autoplay' && canAutoplay) start()
    else schedule()
  }

  new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        inView = entry.isIntersecting && entry.intersectionRatio > 0
        canAutoplay =
          inView && entry.intersectionRatio >= AUTOPLAY_VISIBLE_RATIO
        if (mode === 'manual' && !document.hidden) {
          if (inView) manualPreviewSeen = true
          else if (manualPreviewSeen && !motionPreference.matches)
            mode = 'awaiting-autoplay'
        }
      }
      updateVisibility()
    },
    { threshold: [0, AUTOPLAY_VISIBLE_RATIO] }
  ).observe(viewport)
  document.addEventListener('visibilitychange', updateVisibility)
  motionPreference.addEventListener('change', (event) => {
    if (event.matches && mode !== 'manual') takeControl()
    else render()
  })
  button.addEventListener('click', () => {
    if (mode === 'playing') takeControl()
    else start()
  })

  return {
    ready() {
      const nextDocument = frame.contentDocument
      if (appDocument !== nextDocument) {
        pause()
        run = null
        appDocument = nextDocument
      }
      render()
      updateVisibility()
    },
    takeControl,
    waitForSample() {
      pause()
      run = null
      appDocument = null
      render()
    }
  }
}
