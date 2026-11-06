// Reveals start fast and land softly. Dismissals ease out too, because they
// land on a visible target rather than leaving the screen.
const GROW = { duration: 340, easing: 'cubic-bezier(0.2, 0, 0, 1)' }
const SHRINK = { duration: 280, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
const CONTENT_IN = {
  duration: 220,
  delay: 80,
  easing: 'cubic-bezier(0.2, 0, 0, 1)'
}
const CONTENT_OUT = { duration: 100, easing: 'linear' }
// The pile fades as one group: fading cards individually would let the hidden
// bodies of back cards show through the translucent cards in front of them.
const PILE_OUT = { duration: 200, easing: 'ease-in' }
// Ends exactly as SHRINK does, so the card is fully drawn when the view lands.
const PILE_IN = { delay: 40, duration: 240, easing: 'linear' }
const CARDS_OUT = { duration: 200, stagger: 18, easing: 'ease-in' }
const CARDS_IN = {
  duration: 260,
  delay: 40,
  stagger: 28,
  easing: 'cubic-bezier(0.2, 0, 0, 1)'
}
const REDUCED_FADE = { duration: 120, easing: 'linear' }
// Share of the eased shrink after which a landing view dissolves into its card.
const DISSOLVE_START = 0.85
const CONTENT_LIFT = 'translateY(6px)'
const CARD_DRIFT = 'translateY(8px)'
const RADIUS = '6px'
const MINIMUM_VISIBLE_AREA = 16

const FULL_FRAME = Object.freeze({
  transform: 'none',
  clipPath: `inset(0px 0px 0px 0px round ${RADIUS})`
})

/**
 * The keyframe that makes an element occupying `outer` look like `rect`: its
 * top-left corner moves onto the rectangle and a clip trims it to size, so the
 * content travels with that corner instead of being revealed mid-layout.
 */
export function frameAt(rect, outer) {
  const right = Math.max(0, outer.width - rect.width)
  const bottom = Math.max(0, outer.height - rect.height)
  return {
    transform: `translate(${rect.left - outer.left}px, ${rect.top - outer.top}px)`,
    clipPath: `inset(0px ${right}px ${bottom}px 0px round ${RADIUS})`
  }
}

/** Whether a rectangle is on screen enough to morph from or into. */
export function isOnScreen(rect) {
  const width = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0)
  const height =
    Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
  return width >= MINIMUM_VISIBLE_AREA && height >= MINIMUM_VISIBLE_AREA
}

function both(timing) {
  return { ...timing, fill: 'both' }
}

/**
 * Builds the animations for one deck transition. Every animation fills both
 * ways so the caller can commit the end state and cancel them in one task,
 * with no flash between the last frame and the committed layout.
 */
export function createDeckMotion({ reducedMotion }) {
  function reduced() {
    return reducedMotion.matches
  }

  function reveal(viewer, fromFrame) {
    if (reduced() || fromFrame === null)
      return [
        viewer.animate(
          reduced()
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [
                { opacity: 0, transform: 'scale(0.98)' },
                { opacity: 1, transform: 'none' }
              ],
          both(reduced() ? REDUCED_FADE : GROW)
        )
      ]
    return [viewer.animate([fromFrame, FULL_FRAME], both(GROW))]
  }

  function conceal(viewer, toFrame) {
    if (reduced() || toFrame === null)
      return [
        viewer.animate(
          reduced()
            ? [{ opacity: 1 }, { opacity: 0 }]
            : [
                { opacity: 1, transform: 'none' },
                { opacity: 0, transform: 'scale(0.98)' }
              ],
          both(reduced() ? REDUCED_FADE : SHRINK)
        )
      ]
    return [viewer.animate([FULL_FRAME, toFrame], both(SHRINK))]
  }

  // Shrinks onto something drawn underneath, then dissolves to reveal it.
  function land(viewer, toFrame) {
    if (reduced() || toFrame === null) return conceal(viewer, toFrame)
    return [
      viewer.animate(
        [
          { ...FULL_FRAME, opacity: 1 },
          { opacity: 1, offset: DISSOLVE_START },
          { ...toFrame, opacity: 0 }
        ],
        both(SHRINK)
      )
    ]
  }

  function contentIn(viewer) {
    if (reduced()) return []
    return [...viewer.children].map((child) =>
      child.animate(
        [
          { opacity: 0, transform: CONTENT_LIFT },
          { opacity: 1, transform: 'none' }
        ],
        both(CONTENT_IN)
      )
    )
  }

  function contentOut(viewer) {
    if (reduced()) return []
    return [...viewer.children].map((child) =>
      child.animate([{ opacity: 1 }, { opacity: 0 }], both(CONTENT_OUT))
    )
  }

  function surface(viewer, from, to, timing) {
    if (reduced() || !from || !to) return []
    return [
      viewer.animate(
        [{ backgroundColor: from }, { backgroundColor: to }],
        both(timing)
      )
    ]
  }

  function backdrop(viewer, showing) {
    const frames = showing
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 1 }, { opacity: 0 }]
    const timing = reduced() ? REDUCED_FADE : showing ? GROW : SHRINK
    return [
      viewer.animate(frames, { ...both(timing), pseudoElement: '::backdrop' })
    ]
  }

  function pileAway(stack) {
    if (reduced()) return []
    return [stack.animate([{ opacity: 1 }, { opacity: 0 }], both(PILE_OUT))]
  }

  function pileBack(stack) {
    if (reduced()) return []
    return [stack.animate([{ opacity: 0 }, { opacity: 1 }], both(PILE_IN))]
  }

  // Cards nearest the opened one move first, so the pile parts around it.
  function cardsAway(cards, origin) {
    if (reduced()) return []
    return cards
      .filter((_, index) => index !== origin)
      .map((card) =>
        card.animate(
          [{ transform: 'none' }, { transform: CARD_DRIFT }],
          both({
            ...CARDS_OUT,
            delay: Math.abs(cards.indexOf(card) - origin) * CARDS_OUT.stagger
          })
        )
      )
  }

  // Cards settle from the front of the pile to the back. This outlasts the
  // landing, so it needs no forward fill and no committed end state.
  function cardsBack(cards, origin) {
    if (reduced()) return []
    const last = cards.length - 1
    return cards
      .filter((_, index) => index !== origin)
      .map((card) =>
        card.animate([{ transform: CARD_DRIFT }, { transform: 'none' }], {
          ...CARDS_IN,
          fill: 'backwards',
          delay:
            CARDS_IN.delay + (last - cards.indexOf(card)) * CARDS_IN.stagger
        })
      )
  }

  return Object.freeze({
    reveal,
    conceal,
    land,
    pileAway,
    pileBack,
    contentIn,
    contentOut,
    surface,
    backdrop,
    cardsAway,
    cardsBack,
    timing: Object.freeze({ grow: GROW, shrink: SHRINK })
  })
}
