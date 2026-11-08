const FOCUS_TIMEOUT_MS = 5000

export async function waitForFocus(
  locator,
  { timeout = FOCUS_TIMEOUT_MS } = {}
) {
  const element = await locator.elementHandle()
  if (!element) throw new Error('The expected focus target is missing.')
  try {
    const frame = await element.ownerFrame()
    if (!frame) throw new Error('The expected focus target has no document.')
    await frame.waitForFunction(
      (target) => target === document.activeElement,
      element,
      { timeout }
    )
  } finally {
    await element.dispose()
  }
}

export async function focusForTooltip(locator) {
  // Tooltip primitives dismiss on ancestor scroll. Playwright's reveal can land
  // frames after it resolves, so scroll synchronously here and focus only once
  // that scroll's event has been delivered.
  await locator.evaluate(async (element) => {
    const offsets = () => {
      const values = []
      for (let node = element.parentElement; node; node = node.parentElement)
        values.push(node.scrollTop, node.scrollLeft)
      return values.join()
    }
    const before = offsets()
    const scrolled = new Promise((resolve) =>
      addEventListener('scroll', resolve, { capture: true, once: true })
    )
    element.scrollIntoViewIfNeeded(true)
    if (offsets() !== before) await scrolled
  })
  await locator.focus()
  await waitForFocus(locator)
}
