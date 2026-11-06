const FOCUS_GUTTER = 12
const FOCUS_VISIBLE_WIDTH = 320

export function isFocusMessage(message) {
  return (
    message.type === 'megatron-preview:focus' &&
    Number.isFinite(message.left) &&
    Number.isFinite(message.right)
  )
}

/** Pans a sideways-scrolling frame so a control focused inside it stays in view. */
export function revealFocusedRange(viewport, { left, right }) {
  const visibleRight = Math.min(right, left + FOCUS_VISIBLE_WIDTH)
  if (visibleRight > viewport.scrollLeft + viewport.clientWidth)
    viewport.scrollLeft = visibleRight - viewport.clientWidth + FOCUS_GUTTER
  else if (left < viewport.scrollLeft)
    viewport.scrollLeft = Math.max(0, left - FOCUS_GUTTER)
}
