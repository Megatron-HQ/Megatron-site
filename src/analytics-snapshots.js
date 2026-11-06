export function initializeAnalyticsSnapshots() {
  const viewer = document.querySelector('#analytics-snapshot-viewer')
  const image = viewer?.querySelector('[data-snapshot-image]')
  const title = viewer?.querySelector('#snapshot-viewer-title')
  const viewport = viewer?.querySelector('.snapshot-viewer-viewport')
  const close = viewer?.querySelector('[data-snapshot-close]')
  if (!viewer || !image || !title || !viewport || !close)
    throw new Error('The analytics snapshot viewer is incomplete.')

  let activeTrigger = null
  let previousOverflow = ''
  let readingPosition = 0

  for (const trigger of document.querySelectorAll(
    '[data-analytics-snapshot]'
  )) {
    trigger.addEventListener('click', () => {
      const source = trigger.querySelector('img')
      if (!source?.getAttribute('src'))
        throw new Error('The analytics snapshot image is missing.')
      activeTrigger = trigger
      readingPosition = window.scrollY
      previousOverflow = document.body.style.overflow
      image.src = source.getAttribute('src')
      image.alt = source.alt
      image.width = Number(source.getAttribute('width'))
      title.textContent = `${trigger.dataset.snapshotTitle} snapshot`
      document.body.style.overflow = 'hidden'
      viewer.showModal()
      viewport.scrollTo(0, 0)
      close.focus({ preventScroll: true })
    })
  }
  close.addEventListener('click', () => viewer.close())
  viewer.addEventListener('cancel', (event) => {
    event.preventDefault()
    viewer.close()
  })
  viewer.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow
    activeTrigger?.focus({ preventScroll: true })
    window.scrollTo({ top: readingPosition, behavior: 'instant' })
    activeTrigger = null
  })
}
