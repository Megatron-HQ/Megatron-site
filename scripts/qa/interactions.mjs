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
  await locator.scrollIntoViewIfNeeded()
  // Tooltip primitives dismiss on ancestor scroll; let that event finish before opening.
  await locator.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(resolve))
  )
  await locator.focus()
  await waitForFocus(locator)
}
