import { existsSync } from 'node:fs'

const CANDIDATE_CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ...(process.env.LOCALAPPDATA
    ? [
        `${process.env.LOCALAPPDATA.replace(/\\/g, '/')}/Google/Chrome/Application/chrome.exe`,
        `${process.env.LOCALAPPDATA.replace(/\\/g, '/')}/Microsoft/Edge/Application/msedge.exe`
      ]
    : []),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium'
]

/**
 * Resolves the Google Chrome executable path if available.
 *
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {string | undefined}
 */
export function resolveChromePath(env = process.env) {
  if (env.CHROME_PATH && existsSync(env.CHROME_PATH)) {
    return env.CHROME_PATH
  }
  for (const candidate of CANDIDATE_CHROME_PATHS) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  return undefined
}

/**
 * Returns the chromium module from playwright-core, checking local node_modules
 * before falling back to known sibling installation paths.
 */
export async function getChromium() {
  try {
    const local = await import('playwright-core')
    return local.chromium
  } catch {
    const fallback = await import('file:///C:/Megatron/node_modules/playwright-core/index.mjs')
    return fallback.chromium
  }
}

/**
 * Builds standard launch options for headless Chromium browser automation.
 *
 * @param {object} [overrides={}]
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {object}
 */
export function browserLaunchOptions(overrides = {}, env = process.env) {
  const executablePath = overrides.executablePath ?? resolveChromePath(env)
  const args = overrides.args ?? ['--no-sandbox', '--disable-setuid-sandbox']

  const options = {
    headless: true,
    ...overrides,
    args
  }

  if (executablePath) {
    options.executablePath = executablePath
  }

  return options
}

/**
 * Launches Chromium using resolved options.
 *
 * @param {object} [overrides={}]
 * @returns {Promise<import('playwright-core').Browser>}
 */
export async function launchBrowser(overrides = {}) {
  const chromium = await getChromium()
  const options = browserLaunchOptions(overrides)
  return chromium.launch(options)
}
