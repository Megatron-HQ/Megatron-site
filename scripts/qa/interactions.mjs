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

const ROW_COUNT_TIMEOUT_MS = 5000
const ROW_COUNT_POLL_MS = 50

// Since Megatron 0.2.0 inventory rows animate out, so a row leaving a filtered
// table stays in the DOM for a moment. Counting immediately races that exit.
export async function expectRowCount(
  rows,
  expected,
  message,
  { timeout = ROW_COUNT_TIMEOUT_MS } = {}
) {
  const deadline = Date.now() + timeout
  let actual = await rows.count()
  while (actual !== expected && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, ROW_COUNT_POLL_MS))
    actual = await rows.count()
  }
  if (actual !== expected)
    throw new Error(
      `${message ?? 'Unexpected row count'}: expected ${expected} rows, found ${actual}.`
    )
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
