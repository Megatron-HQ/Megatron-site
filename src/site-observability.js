import { inject } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'

const PRODUCTION_HOSTNAMES = new Set([
  'getmegatron.app',
  'www.getmegatron.app',
  'megatron-site.vercel.app'
])
const MARKETING_PATHS = new Set(['/', '/index.html'])
const FREE_EVENT_TYPES = new Set(['pageview', 'vital'])
const PERFORMANCE_SAMPLE_RATE = 1

function isMarketingUrl(url) {
  return (
    url.protocol === 'https:' &&
    PRODUCTION_HOSTNAMES.has(url.hostname) &&
    MARKETING_PATHS.has(url.pathname)
  )
}

function redactEventUrl(event) {
  if (!FREE_EVENT_TYPES.has(event.type)) return null

  let url
  try {
    url = new URL(event.url)
  } catch (error) {
    if (error instanceof TypeError) return null
    throw error
  }
  if (!isMarketingUrl(url)) return null

  url.search = ''
  url.hash = ''
  return { ...event, url: url.href }
}

export function initializeSiteObservability() {
  if (
    !import.meta.env.PROD ||
    import.meta.env.VERCEL_ENV !== 'production' ||
    window.self !== window.top ||
    !isMarketingUrl(new URL(window.location.href))
  )
    return

  const clientConfiguration = import.meta.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG
  inject(
    { mode: 'production', debug: false, beforeSend: redactEventUrl },
    clientConfiguration
  )
  injectSpeedInsights(
    {
      debug: false,
      sampleRate: PERFORMANCE_SAMPLE_RATE,
      beforeSend: redactEventUrl
    },
    clientConfiguration
  )
}
