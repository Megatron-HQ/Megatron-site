export const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 1000 },
  { label: 'laptop', width: 1024, height: 900 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'mobile', width: 375, height: 812 }
]

/**
 * Returns the responsive viewport sizes to test against.
 * Matches the four standard breakpoints documented in CLAUDE.md and MASTER.md.
 *
 * @param {string[]|string|null} [filter] Optional viewport labels or widths to filter by.
 * @returns {Array<{ label: string, width: number, height: number }>}
 */
export function getWindowSizes(filter) {
  if (!filter || (Array.isArray(filter) && filter.length === 0)) {
    return VIEWPORTS
  }
  const set = new Set([].concat(filter).map((f) => String(f).toLowerCase()))
  const matched = VIEWPORTS.filter(
    (vp) => set.has(vp.label.toLowerCase()) || set.has(String(vp.width))
  )
  return matched.length > 0 ? matched : VIEWPORTS
}
