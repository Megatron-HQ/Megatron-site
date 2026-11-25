import type {
  McpActionResult,
  McpAddInput,
  McpAddResult,
  McpConnectionCheck,
  McpDeclarationRef,
  McpDeclarationDetail,
  McpLintFinding,
  McpLoginRef,
  McpServerDetail,
  McpServerKind,
  McpServerList,
  McpLiveStatus,
  McpToolUsage,
  McpUsageStats,
  McpUsageWindow
} from '../../vendor/megatron/src/shared/ipc'
import type { ProjectIdentity } from '../../vendor/megatron/src/shared/project-identity'
import {
  isHiddenProject,
  isWithinProjectPath
} from '../../vendor/megatron/src/shared/project-path.ts'
import { groupProjectCounts } from '../../vendor/megatron/src/shared/usage-projects.ts'
import {
  MCP_ENV_NAME,
  MCP_HEADER_NAME,
  MCP_VARIABLE_REFERENCE,
  mcpServerNameError,
  mcpUrlError
} from '../../vendor/megatron/src/shared/mcp-add-rules.ts'
import { localDate } from './analytics.ts'
import {
  ADDITIONAL_PROJECT,
  API_PROJECT,
  DAY_MS,
  HOUR_MS,
  SAMPLE_HOME,
  SAMPLE_PROJECT,
  sampleTranscriptCoverage,
  windowsPath,
  type SampleState
} from './fixtures.ts'

interface SampleMcpServer {
  id: string
  name: string
  kind: McpServerKind
  prefix: string
  declarations: McpDeclarationDetail[]
  definitionTokens?: number
  discovered?: boolean
}

interface SampleMcpCall {
  at: string
  owner: string | null
  prefix: string
  project: string
  session: string
  tool: string
  resultChars: number
  outcome: 'ok' | 'error' | 'denied'
}

export interface SampleMcpState {
  servers: SampleMcpServer[]
  calls: SampleMcpCall[]
  callsSince: string | null
  checks: McpConnectionCheck[]
  signedOut: McpDeclarationRef[]
  signIns: { target: McpLoginRef; connected: boolean }[]
  measuredAt: string | null
}

const DOCS_ID = 'configured:workspace-docs'
const DOCS_HOST = 'docs.example.invalid'
const PLUGIN_ID = 'plugin:frontend:playwright'
const CONNECTOR_ID = 'connector:claude_ai_Drive'
const OBSERVED_ID = 'observed:local-inspector'
const OTHER_CONNECTOR_ID = 'connector:claude_ai_Tasks'
const SETTINGS_APPROVED_ID = 'configured:workspace-metrics'
const REMOTE_TRANSPORTS = new Set(['http', 'sse', 'ws'])
const CHARS_PER_TOKEN = 3
const SCOPE_PRECEDENCE = { user: 1, project: 2, local: 3 }
const SAMPLE_MISSING_COMMANDS = new Set([
  'sample-build',
  'sample-missing',
  'uvx'
])
const CREDENTIAL_NAME =
  /token|secret|passw(?:or)?d|api[-_]?key|access[-_]?key|credential|auth|cookie|session/i
const CREDENTIAL_FLAG =
  /^--?(?:token|secret|password|api[-_]?key|access[-_]?key|auth|key)(?:=(.*))?$/i
const CREDENTIAL_VALUE =
  /(?:sk-|gh[pousr]_|github_pat_|glpat-|xox[baprs]-)[\w-]{4,}|^[\w+=/-]{32,}$/

function declaration(
  scope: McpDeclarationDetail['scope'],
  fields: Partial<McpDeclarationDetail>
): McpDeclarationDetail {
  return {
    scope,
    projectPath: null,
    plugin: null,
    transport: 'http',
    problem: null,
    location: DOCS_HOST,
    env: [],
    headers: [],
    argCount: null,
    hasLiteralCredential: false,
    approval: null,
    sourcePath: windowsPath(SAMPLE_HOME, '.claude.json'),
    shadowedIn: [],
    commandIsBare: false,
    ...fields
  }
}

function sampleServer(
  id: string,
  name: string,
  kind: McpServerKind,
  prefix: string,
  declarations: McpDeclarationDetail[],
  definitionTokens?: number
): SampleMcpServer {
  return { id, name, kind, prefix, declarations, definitionTokens }
}

export function createSampleMcpState(
  now: Date,
  alternate = false,
  empty = false
): SampleMcpState {
  const servers = [
    sampleServer(
      DOCS_ID,
      'workspace-docs',
      'configured',
      'workspace-docs',
      [
        declaration('local', {
          projectPath: SAMPLE_PROJECT,
          headers: [{ name: 'Authorization', literal: false }]
        }),
        declaration('project', {
          projectPath: SAMPLE_PROJECT,
          sourcePath: windowsPath(SAMPLE_PROJECT, '.mcp.json'),
          approval: 'approved',
          shadowedIn: [
            {
              projectPath: SAMPLE_PROJECT,
              byScope: 'local',
              byProjectPath: SAMPLE_PROJECT
            }
          ]
        }),
        declaration('user', {
          env: [{ name: 'DOCS_TOKEN', literal: true }],
          hasLiteralCredential: true,
          shadowedIn: [
            {
              projectPath: SAMPLE_PROJECT,
              byScope: 'local',
              byProjectPath: SAMPLE_PROJECT
            }
          ]
        })
      ],
      248
    ),
    sampleServer(
      'configured:build-preview',
      'build-preview',
      'configured',
      'build-preview',
      [
        declaration('project', {
          projectPath: SAMPLE_PROJECT,
          sourcePath: windowsPath(SAMPLE_PROJECT, '.mcp.json'),
          approval: 'pending',
          transport: 'stdio',
          commandIsBare: true,
          argCount: 2,
          location: 'sample-build'
        })
      ]
    ),
    sampleServer(
      'configured:review-helper',
      'review-helper',
      'configured',
      'review-helper',
      [
        declaration('local', {
          projectPath: ADDITIONAL_PROJECT,
          location: 'review.example.invalid'
        })
      ]
    ),
    sampleServer(
      SETTINGS_APPROVED_ID,
      'workspace-metrics',
      'configured',
      'workspace-metrics',
      [
        declaration('project', {
          projectPath: SAMPLE_PROJECT,
          sourcePath: windowsPath(SAMPLE_PROJECT, '.mcp.json'),
          approval: 'approved',
          location: 'metrics.example.invalid'
        })
      ]
    ),
    sampleServer(
      'configured:legacy-search',
      'legacy-search',
      'configured',
      'legacy-search',
      [
        declaration('user', {
          transport: null,
          problem: 'url_without_type',
          location: 'search.example.invalid'
        })
      ]
    ),
    sampleServer(
      PLUGIN_ID,
      'plugin:frontend:playwright',
      'plugin',
      'plugin_frontend_playwright',
      [
        declaration('plugin', {
          plugin: { name: 'frontend', marketplace: 'team-tools' },
          transport: 'stdio',
          location: 'sample-browser',
          sourcePath: null,
          argCount: 1
        })
      ],
      312
    ),
    sampleServer(
      CONNECTOR_ID,
      'claude.ai Drive',
      'connector',
      'claude_ai_Drive',
      [],
      190
    ),
    {
      ...sampleServer(
        OTHER_CONNECTOR_ID,
        'claude.ai Tasks',
        'connector',
        'claude_ai_Tasks',
        []
      ),
      discovered: true
    },
    sampleServer(
      OBSERVED_ID,
      'local-inspector',
      'observed',
      'local-inspector',
      []
    ),
    sampleServer(
      'configured:asset lookup',
      'asset lookup',
      'configured',
      'asset_lookup',
      [declaration('user', { location: 'assets.example.invalid' })]
    ),
    sampleServer(
      'configured:asset_lookup',
      'asset_lookup',
      'configured',
      'asset_lookup',
      [declaration('user', { location: 'archive.example.invalid' })]
    )
  ]
  const calls: SampleMcpCall[] = []
  for (const [index, hours] of [
    1, 4, 9, 13, 20, 45, 72, 120, 160, 220, 345, 518
  ].entries()) {
    calls.push({
      at: new Date(now.getTime() - hours * HOUR_MS).toISOString(),
      owner: DOCS_ID,
      prefix: 'workspace-docs',
      project: index % 3 === 0 ? API_PROJECT : SAMPLE_PROJECT,
      session: 'docs-' + Math.floor(index / 2),
      tool: index % 2 === 0 ? 'search_documents' : 'read_document',
      outcome: index === 2 ? 'denied' : index === 5 ? 'error' : 'ok',
      resultChars: index === 2 ? 0 : 440 + index * 52
    })
  }
  for (const [owner, prefix, tool, hours] of [
    [PLUGIN_ID, 'plugin_frontend_playwright', 'read_page', 3],
    [PLUGIN_ID, 'plugin_frontend_playwright', 'read_page', 63],
    [CONNECTOR_ID, 'claude_ai_Drive', 'find_file', 50],
    [OBSERVED_ID, 'local-inspector', 'summarize', 187],
    [null, 'asset_lookup', 'search', 83]
  ] as const) {
    calls.push({
      at: new Date(now.getTime() - hours * HOUR_MS).toISOString(),
      owner,
      prefix,
      project: SAMPLE_PROJECT,
      session: 'tools-' + hours,
      tool,
      resultChars: 336,
      outcome: 'ok'
    })
  }
  const archived = [calls[5], calls[7]]
  const live = calls.filter((call) => call !== archived[1])
  // The live record wins if the archive and a retained transcript both have a call.
  const knownCalls = new Map(
    [...archived, ...live].map((call) => [
      JSON.stringify([call.session, call.at, call.tool]),
      call
    ])
  )
  return {
    servers: empty
      ? []
      : alternate
        ? servers.filter(({ id }) => id === DOCS_ID)
        : servers,
    calls: empty
      ? []
      : alternate
        ? [...knownCalls.values()].filter(
            ({ project }) => project === API_PROJECT
          )
        : [...knownCalls.values()],
    callsSince: empty ? null : sampleTranscriptCoverage(now),
    checks: [],
    signedOut: [],
    signIns: [],
    measuredAt: null
  }
}

export function sampleProjectGranted(
  state: SampleState,
  path: string
): boolean {
  return (
    state.folders.some((folder) => isWithinProjectPath(path, folder.path)) &&
    !state.projects.some(
      ({ path: project, status }) => project === path && status !== 'available'
    )
  )
}

function declarationsFor(server: SampleMcpServer, state: SampleState) {
  const visible = server.declarations.filter(({ scope, projectPath }) =>
    projectPath === null
      ? scope !== 'project'
      : !isHiddenProject(projectPath, state.hiddenProjects) &&
        (scope !== 'project' || sampleProjectGranted(state, projectPath))
  )
  const projects = [
    ...new Set(visible.flatMap(({ projectPath }) => projectPath ?? []))
  ]
  return visible.map((entry, index) => ({
    ...entry,
    shadowedIn: projects.flatMap((projectPath) => {
      if (entry.projectPath && entry.projectPath !== projectPath) return []
      const winner = visible
        .slice(0, index)
        .find(
          (higher) =>
            higher.projectPath === projectPath &&
            !higher.problem &&
            higher.approval !== 'pending' &&
            higher.approval !== 'rejected'
        )
      return winner
        ? [
            {
              projectPath,
              byScope: winner.scope,
              byProjectPath: winner.projectPath
            }
          ]
        : []
    })
  }))
}

export function recordSampleMcpCheck(
  mcp: SampleMcpState,
  state: SampleState,
  projectPath: string | null
): McpConnectionCheck {
  const check: McpConnectionCheck = {
    projectPath,
    checkedAt: state.now,
    servers: mcp.servers.flatMap((server) => {
      if (server.kind === 'observed') return []
      const declarations = declarationsFor(server, state)
      const entry = declarations.find(
        (declaration) => declaration.projectPath === projectPath
      )
      if (projectPath !== null && !entry) return []
      if (server.kind === 'configured' && !entry) return []
      let status: McpLiveStatus = 'connected'
      if (
        (server.id === OTHER_CONNECTOR_ID &&
          !mcp.signIns.some(
            ({ target, connected }) =>
              target.serverId === server.id && connected
          )) ||
        mcp.signedOut.some(
          (ref) =>
            ref.serverId === server.id &&
            ref.projectPath === projectPath &&
            ref.scope === entry?.scope
        )
      )
        status = 'needs_auth'
      else if (entry?.problem) status = 'not_configured'
      else if (entry?.approval === 'pending') status = 'pending_approval'
      else if (entry?.approval === 'rejected') status = 'rejected'
      return [{ name: server.name, status }]
    })
  }
  mcp.checks = [
    ...mcp.checks.filter((entry) => entry.projectPath !== projectPath),
    check
  ]
  return check
}

export function changeSampleMcpDeclaration(
  mcp: SampleMcpState,
  state: SampleState,
  action: 'remove' | 'logout',
  ref: McpDeclarationRef
): McpActionResult {
  if (!ref || !['local', 'project', 'user'].includes(ref.scope))
    return { ok: false, error: 'Choose a sample server declaration.' }
  if (
    ref.scope !== 'user' &&
    (typeof ref.projectPath !== 'string' ||
      !sampleProjectGranted(state, ref.projectPath))
  )
    return {
      ok: false,
      error: 'Grant this sample project folder before changing it.'
    }
  const server = mcp.servers.find(({ id }) => id === ref.serverId)
  const entry = server?.declarations.find(
    ({ scope, projectPath }) =>
      scope === ref.scope && projectPath === ref.projectPath
  )
  if (!server || !entry || server.kind !== 'configured')
    return {
      ok: false,
      error: 'The sample declaration is no longer available.'
    }
  if (action === 'logout') {
    if (!entry.transport || !REMOTE_TRANSPORTS.has(entry.transport))
      return {
        ok: false,
        error: 'Only configured remote servers can sign out.'
      }
    if (!mcp.signedOut.some((entry) => sameDeclaration(entry, ref)))
      mcp.signedOut.push({ ...ref })
    mcp.signIns = mcp.signIns.filter(
      ({ target }) => !sameDeclaration(target, ref)
    )
    mcp.checks = []
    return {
      ok: true,
      message: 'Signed out of sample server ' + server.name + '.'
    }
  }
  server.declarations = server.declarations.filter(
    (declaration) => declaration !== entry
  )
  mcp.signedOut = mcp.signedOut.filter(
    (signedOut) => !sameDeclaration(signedOut, ref)
  )
  mcp.signIns = mcp.signIns.filter(
    ({ target }) => !sameDeclaration(target, ref)
  )
  mcp.checks = []
  if (!server.declarations.length) {
    const observedId = 'observed:' + server.prefix
    const calls = mcp.calls.filter(({ owner }) => owner === server.id)
    const otherOwners = mcp.servers.filter(
      ({ id, prefix }) => id !== server.id && prefix === server.prefix
    )
    if (calls.length) {
      mcp.servers.push(
        sampleServer(observedId, server.name, 'observed', server.prefix, [])
      )
      for (const call of calls) call.owner = observedId
    } else if (otherOwners.length === 1) {
      for (const call of mcp.calls)
        if (call.owner === null && call.prefix === server.prefix)
          call.owner = otherOwners[0].id
    }
    mcp.servers = mcp.servers.filter(({ id }) => id !== server.id)
  }
  return {
    ok: true,
    message:
      'Removed the sample ' +
      ref.scope +
      ' declaration for ' +
      server.name +
      '.'
  }
}

function sameDeclaration(first: McpLoginRef, second: McpLoginRef): boolean {
  return (
    first.serverId === second.serverId &&
    first.scope === second.scope &&
    first.projectPath === second.projectPath
  )
}

function literalValue(value: string): string {
  return value
    .replace(new RegExp(MCP_VARIABLE_REFERENCE.source, 'g'), '')
    .trim()
}

function representsCredential(name: string, value: string): boolean {
  const literal = literalValue(value)
    .replace(/^(?:bearer|basic|token)\b/i, '')
    .trim()
  return (
    CREDENTIAL_VALUE.test(literal) ||
    (CREDENTIAL_NAME.test(name) && literal !== '')
  )
}

function mcpAddPrecedenceNote(
  scope: McpAddInput['scope'],
  projectPath: string | null,
  declarations: McpDeclarationDetail[]
): string {
  if (scope === 'user') {
    const projects = new Set(
      declarations.flatMap((entry) => entry.projectPath ?? [])
    )
    return projects.size
      ? ` A project’s own declaration takes precedence over this one in ${projects.size} ${projects.size === 1 ? 'project' : 'projects'}.`
      : ''
  }
  const otherScopes = declarations.flatMap(
    ({ scope: other, projectPath: path }) =>
      other !== 'plugin' && (other === 'user' || path === projectPath)
        ? [other]
        : []
  )
  const higher = otherScopes.filter(
    (other) => SCOPE_PRECEDENCE[other] > SCOPE_PRECEDENCE[scope]
  )
  const lower = otherScopes.filter(
    (other) => SCOPE_PRECEDENCE[other] < SCOPE_PRECEDENCE[scope]
  )
  return [
    higher.length &&
      ` In this project the ${higher.join(' and ')} declaration takes precedence over this one.`,
    lower.length &&
      ` In this project the ${scope} declaration takes precedence over the ${lower.join(' and ')} declaration.`
  ]
    .filter(Boolean)
    .join('')
}

export function addSampleMcpServer(
  mcp: SampleMcpState,
  state: SampleState,
  input: McpAddInput
): McpAddResult {
  if (
    !input ||
    typeof input.name !== 'string' ||
    !Object.hasOwn(SCOPE_PRECEDENCE, input.scope)
  )
    return {
      ok: false,
      error: 'Choose a name and scope for the sample server.'
    }
  const { scope, transport, projectPath } = input
  const nameError = mcpServerNameError(input.name)
  if (nameError) return { ok: false, error: nameError }
  if (
    scope === 'user'
      ? projectPath !== null
      : typeof projectPath !== 'string' ||
        !sampleProjectGranted(state, projectPath) ||
        !state.projects.some(({ path }) => path === projectPath) ||
        isHiddenProject(projectPath, state.hiddenProjects)
  )
    return {
      ok: false,
      error: 'Choose an available granted sample folder for this scope.'
    }
  const stdio = transport === 'stdio'
  if (!stdio && !REMOTE_TRANSPORTS.has(transport))
    return { ok: false, error: 'Choose stdio, HTTP, SSE or WebSocket.' }
  const endpoint = stdio ? input.command : input.url
  if (
    typeof endpoint !== 'string' ||
    !endpoint.trim() ||
    endpoint.includes('\0')
  )
    return {
      ok: false,
      error: stdio
        ? 'Give the command that starts the server.'
        : 'Give the server its URL.'
    }
  const urlError = stdio ? null : mcpUrlError(transport, endpoint)
  if (urlError) return { ok: false, error: urlError }
  const args = stdio ? input.args : []
  const entries = stdio ? input.env : input.headers
  const namePattern = stdio ? MCP_ENV_NAME : MCP_HEADER_NAME
  const keys = new Set<string>()
  if (
    !Array.isArray(args) ||
    args.some((arg) => typeof arg !== 'string' || arg.includes('\0')) ||
    !Array.isArray(entries)
  )
    return {
      ok: false,
      error: 'Enter valid arguments and settings for the sample server.'
    }
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry.name !== 'string' ||
      !namePattern.test(entry.name) ||
      typeof entry.value !== 'string' ||
      entry.value.includes('\0')
    )
      return { ok: false, error: 'Each setting needs a valid name and value.' }
    const key = stdio ? entry.name : entry.name.toLowerCase()
    if (keys.has(key))
      return { ok: false, error: 'A setting name appears twice.' }
    keys.add(key)
  }
  const url = stdio ? null : new URL(endpoint.trim())
  const hasLiteralCredential =
    entries.some(({ name, value }) => representsCredential(name, value)) ||
    args.some((arg, index) => {
      const flag = CREDENTIAL_FLAG.exec(arg)
      return (
        CREDENTIAL_VALUE.test(literalValue(arg)) ||
        (flag !== null && literalValue(flag[1] ?? args[index + 1] ?? '') !== '')
      )
    }) ||
    (url !== null &&
      (url.username !== '' ||
        url.password !== '' ||
        [...url.searchParams].some(([name, value]) =>
          representsCredential(name, value)
        ))) ||
    (stdio && CREDENTIAL_VALUE.test(literalValue(endpoint)))
  if (scope === 'project' && hasLiteralCredential)
    return {
      ok: false,
      error:
        'A project’s .mcp.json is shared through git. Use an environment variable reference for credentials.'
    }

  const name = input.name.trim()
  const serverId = 'configured:' + name
  const server = mcp.servers.find(({ id }) => id === serverId)
  if (
    server?.declarations.some(
      (entry) => entry.scope === scope && entry.projectPath === projectPath
    )
  )
    return {
      ok: false,
      error: `This scope already declares ${name}. Choose another name.`
    }
  const collision = mcp.servers.find(
    ({ id, kind, prefix }) =>
      id !== serverId && kind !== 'observed' && prefix === name
  )
  if (collision)
    return {
      ok: false,
      error: `This server would share a tool prefix with ${collision.name}. Choose another name.`
    }

  const settings = entries.map(({ name, value }) => ({
    name,
    literal: !MCP_VARIABLE_REFERENCE.test(value)
  }))
  const command = endpoint.trim()
  const commandIsBare = stdio && /^[\w.-]+$/.test(command)
  const basename = command.split(/[\\/]/).at(-1) ?? ''
  const location =
    url?.host ??
    (CREDENTIAL_VALUE.test(literalValue(basename)) ? null : basename)
  const entry = declaration(scope, {
    projectPath,
    transport,
    location,
    commandIsBare,
    hasLiteralCredential,
    env: stdio ? settings : [],
    headers: stdio ? [] : settings,
    argCount: stdio ? args.length : null,
    approval: scope === 'project' ? 'pending' : null,
    sourcePath:
      scope === 'project' && projectPath
        ? windowsPath(projectPath, '.mcp.json')
        : windowsPath(SAMPLE_HOME, '.claude.json')
  })
  const note = mcpAddPrecedenceNote(
    scope,
    projectPath,
    server?.declarations ?? []
  )
  if (server) {
    server.declarations.push(entry)
    server.declarations.sort(
      (first, second) =>
        SCOPE_PRECEDENCE[second.scope as McpAddInput['scope']] -
        SCOPE_PRECEDENCE[first.scope as McpAddInput['scope']]
    )
  } else
    mcp.servers.push(sampleServer(serverId, name, 'configured', name, [entry]))
  const approval =
    scope === 'project' ? ' The declaration is pending approval.' : ''
  return {
    ok: true,
    serverId,
    message: `Added sample server ${name}.${approval}${note}`
  }
}

export function sampleMcpSignIn(
  mcp: SampleMcpState,
  state: SampleState,
  ref: McpLoginRef,
  action: 'open' | 'check',
  scenario?: string
): McpActionResult {
  const detail = ref && sampleMcpDetail(mcp, state, ref.serverId)
  if (!detail)
    return { ok: false, error: 'Megatron no longer finds this sample server.' }
  const eligible =
    ref.scope === null
      ? detail.server.kind === 'connector' && ref.projectPath === null
      : detail.server.kind === 'configured' &&
        detail.declarations.some(
          (entry) =>
            entry.scope === ref.scope &&
            entry.projectPath === ref.projectPath &&
            entry.transport &&
            REMOTE_TRANSPORTS.has(entry.transport)
        ) &&
        (ref.projectPath === null ||
          sampleProjectGranted(state, ref.projectPath))
  if (!eligible)
    return {
      ok: false,
      error: 'Choose a remote declaration or a claude.ai connector to sign in.'
    }
  const previous = mcp.signIns.find(({ target }) =>
    sameDeclaration(target, ref)
  )
  if (action === 'open') {
    if (scenario === 'mcp-sign-in-launch-error')
      return {
        ok: false,
        error: 'The sample terminal could not open. Try again.'
      }
    if (!previous) mcp.signIns.push({ target: { ...ref }, connected: false })
    return {
      ok: true,
      message:
        'The desktop app opens Claude Code in a terminal. In this preview, use Check sign-in to finish the sample.'
    }
  }
  if (!previous || scenario === 'mcp-sign-in-pending')
    return {
      ok: true,
      verificationError: 'Sign-in is still pending in this sample.'
    }
  previous.connected = true
  mcp.signedOut = mcp.signedOut.filter(
    (target) => !sameDeclaration(target, ref)
  )
  recordSampleMcpCheck(mcp, state, ref.projectPath)
  return {
    ok: true,
    message: `Sample sign-in verified for ${detail.server.name}.`
  }
}

export function resetSampleMcpChoices(
  mcp: SampleMcpState,
  state: SampleState,
  projectPath: string
): McpActionResult {
  if (!sampleProjectGranted(state, projectPath))
    return {
      ok: false,
      error: 'Grant the sample project folder before resetting choices.'
    }
  let waiting = 0
  let fromSettings = 0
  for (const server of mcp.servers) {
    const project = server.declarations.find(
      (entry) => entry.scope === 'project' && entry.projectPath === projectPath
    )
    if (!project) continue
    if (server.id === SETTINGS_APPROVED_ID) fromSettings++
    else {
      project.approval = 'pending'
      waiting++
    }
  }
  if (!waiting && !fromSettings)
    return { ok: false, error: 'This sample project has no MCP declarations.' }
  mcp.checks = []
  return {
    ok: true,
    message:
      waiting +
      ' sample declarations await approval. Settings still govern ' +
      fromSettings +
      '.'
  }
}

function sampleFindings(
  server: SampleMcpServer,
  declarations: McpDeclarationDetail[],
  collisions: number,
  recentlyUsed: boolean
) {
  const findings: McpLintFinding[] = []
  if (collisions)
    findings.push({
      ruleId: 'mcp-prefix-collision',
      severity: 'warning',
      message:
        'Another server uses the same tool prefix. Shared calls cannot be attributed.',
      scope: null,
      projectPath: null
    })
  for (const entry of declarations) {
    const source = { scope: entry.scope, projectPath: entry.projectPath }
    if (entry.problem) {
      findings.push({
        ...source,
        ruleId: 'mcp-server-skipped',
        severity: 'warning',
        message:
          'Claude Code skips this server because its URL has no transport type.'
      })
      continue
    }
    if (entry.hasLiteralCredential)
      findings.push({
        ...source,
        ruleId: 'mcp-inlined-credential',
        severity: 'warning',
        message:
          'This declaration appears to include a literal credential. Use an environment variable reference.'
      })
    if (
      entry.scope !== 'plugin' &&
      entry.transport === 'stdio' &&
      entry.commandIsBare &&
      entry.location !== null &&
      SAMPLE_MISSING_COMMANDS.has(entry.location) &&
      !recentlyUsed &&
      !entry.env.some(({ name }) => name.toUpperCase() === 'PATH')
    )
      findings.push({
        ...source,
        ruleId: 'mcp-command-not-found',
        severity: 'info',
        message: `This sample cannot find ${entry.location} on PATH.`
      })
    if (entry.approval === 'pending')
      findings.push({
        ...source,
        ruleId: 'mcp-pending-approval',
        severity: 'info',
        message: 'This project declaration is waiting for approval.'
      })
    if (entry.shadowedIn.length)
      findings.push({
        ...source,
        ruleId: 'mcp-shadowed',
        severity: 'info',
        message:
          server.name + ' uses a higher-priority declaration in this project.'
      })
  }
  return findings
}

function tallyCalls(calls: SampleMcpCall[]) {
  const timestamps = calls.map(({ at }) => at).sort()
  return {
    calls: calls.length,
    errors: calls.filter(({ outcome }) => outcome === 'error').length,
    denied: calls.filter(({ outcome }) => outcome === 'denied').length,
    lastUsedAt: timestamps.at(-1) ?? null,
    resultTokens: Math.round(
      calls.reduce((total, call) => total + call.resultChars, 0) /
        CHARS_PER_TOKEN
    )
  }
}

export function sampleMcpDetail(
  mcp: SampleMcpState,
  state: SampleState,
  id: string
): McpServerDetail | null {
  const fixture = mcp.servers.find((server) => server.id === id)
  if (!fixture) return null
  const statuses = mcp.checks.flatMap(({ projectPath, checkedAt, servers }) =>
    servers
      .filter(({ name }) => name === fixture.name)
      .map(({ status }) => ({ projectPath, checkedAt, status }))
  )
  if (fixture.discovered && !statuses.length) return null
  const declarations = declarationsFor(fixture, state)
  for (const scope of mcp.signedOut) {
    if (
      scope.serverId === id &&
      declarations.some(
        (entry) =>
          entry.scope === scope.scope && entry.projectPath === scope.projectPath
      ) &&
      !statuses.some(({ projectPath }) => projectPath === scope.projectPath)
    )
      statuses.push({
        projectPath: scope.projectPath,
        checkedAt: state.now,
        status: 'needs_auth'
      })
  }
  const calls = mcp.calls.filter(({ owner }) => owner === id)
  if (!declarations.length && !calls.length && !statuses.length) return null
  const collisionCount = mcp.servers.filter(
    ({ prefix }) => fixture.prefix === prefix
  ).length
  const ambiguousCalls =
    collisionCount > 1
      ? mcp.calls.filter(
          ({ owner, prefix }) => owner === null && prefix === fixture.prefix
        ).length
      : 0
  const findings = sampleFindings(
    fixture,
    declarations,
    collisionCount > 1 ? collisionCount : 0,
    calls.some(
      ({ at }) => Date.parse(at) >= Date.parse(state.now) - 30 * DAY_MS
    )
  )
  const projectPaths = [
    ...new Set(declarations.flatMap(({ projectPath }) => projectPath ?? []))
  ]
  const general = statuses.find(({ projectPath }) => projectPath === null)
  const { calls: count, errors, denied, lastUsedAt } = tallyCalls(calls)
  const tools: McpToolUsage[] = [...new Set(calls.map(({ tool }) => tool))]
    .map((tool) => ({
      tool,
      ...tallyCalls(calls.filter((call) => call.tool === tool)),
      resultImages: 0
    }))
    .sort((a, b) => b.calls - a.calls || a.tool.localeCompare(b.tool))
  const plugin = declarations.find((entry) => entry.plugin)?.plugin
  return {
    server: {
      id,
      name: fixture.name,
      kind: fixture.kind,
      prefix: fixture.prefix,
      transports: [
        ...new Set(declarations.flatMap(({ transport }) => transport ?? []))
      ],
      location: declarations[0]?.location ?? null,
      scopes: [...new Set(declarations.map(({ scope }) => scope))],
      projectPaths,
      projectCount: projectPaths.length,
      calls: count,
      errors,
      denied,
      ambiguousCalls,
      lastUsedAt,
      hasProblem: declarations.some(({ problem }) => problem !== null),
      hasLiteralCredential: declarations.some(
        (entry) => entry.hasLiteralCredential
      ),
      hasPendingApproval: declarations.some(
        ({ approval }) => approval === 'pending'
      ),
      prefixCollision: collisionCount > 1,
      pluginDisabled:
        !!plugin &&
        !!state.plugins.find(
          ({ name, marketplace }) =>
            name === plugin.name && marketplace === plugin.marketplace
        )?.disabled_reason,
      warnings: findings.filter(({ severity }) => severity === 'warning')
        .length,
      notices: findings.filter(({ severity }) => severity === 'info').length,
      liveStatus: general
        ? { status: general.status, checkedAt: general.checkedAt }
        : null
    },
    declarations,
    disabledIn: [],
    connectorsDisabledIn: [],
    tools,
    findings,
    projectStatuses: statuses.flatMap(({ projectPath, status, checkedAt }) =>
      projectPath === null ? [] : [{ projectPath, status, checkedAt }]
    ),
    definitionTokens:
      fixture.definitionTokens && mcp.measuredAt
        ? { tokens: fixture.definitionTokens, measuredAt: mcp.measuredAt }
        : null
  }
}

export function sampleMcpList(
  mcp: SampleMcpState,
  state: SampleState
): McpServerList {
  const times = mcp.calls.map(({ at }) => at).sort()
  return {
    servers: mcp.servers.flatMap(
      ({ id }) => sampleMcpDetail(mcp, state, id)?.server ?? []
    ),
    callsSince: mcp.callsSince,
    lastCallAt: times.at(-1) ?? null,
    lastCheckedAt:
      mcp.checks.find(({ projectPath }) => projectPath === null)?.checkedAt ??
      null
  }
}

function mcpTrend(
  calls: SampleMcpCall[],
  start: number,
  end: number,
  hourly: boolean
): McpUsageWindow['trend'] {
  const trend: McpUsageWindow['trend'] = []
  const cursor = new Date(start)
  if (hourly) cursor.setMinutes(0, 0, 0)
  else cursor.setHours(0, 0, 0, 0)
  while (cursor.getTime() < end) {
    const next = new Date(cursor)
    if (hourly) next.setTime(next.getTime() + HOUR_MS)
    else next.setDate(next.getDate() + 1)
    const startAt = new Date(Math.max(start, cursor.getTime())).toISOString()
    const endAt = new Date(Math.min(end, next.getTime())).toISOString()
    trend.push({
      key: hourly ? cursor.toISOString() : localDate(cursor),
      startAt,
      endAt,
      count: calls.filter(({ at }) => at >= startAt && at < endAt).length
    })
    cursor.setTime(next.getTime())
  }
  return trend
}

export function sampleMcpUsage(
  mcp: SampleMcpState,
  now: Date,
  identity: ProjectIdentity
): McpUsageStats {
  function reduce(
    window: McpUsageWindow['window'],
    days: number
  ): McpUsageWindow {
    const start = now.getTime() - days * DAY_MS
    const end = now.getTime() + 1
    const startAt = new Date(start).toISOString()
    const endAt = new Date(end).toISOString()
    const calls = mcp.calls.filter(({ at }) => at >= startAt && at < endAt)
    const byServer = mcp.servers
      .flatMap(({ id, name, kind }) => {
        const owned = calls.filter(({ owner }) => owner === id)
        if (owned.length === 0) return []
        const { calls: count, errors, denied, resultTokens } = tallyCalls(owned)
        return [
          {
            id,
            name,
            kind,
            calls: count,
            errors,
            denied,
            resultTokens,
            errorRate: count === denied ? null : errors / (count - denied)
          }
        ]
      })
      .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name))
    const { errors, denied, resultTokens } = tallyCalls(calls)
    return {
      window,
      startAt,
      endAt,
      calls: calls.length,
      errors,
      denied,
      resultTokens,
      serverCount: byServer.length,
      sessionCount: new Set(calls.map(({ session }) => session)).size,
      ambiguousCalls: calls.filter(({ owner }) => owner === null).length,
      trend: mcpTrend(calls, start, end, days === 1),
      byServer,
      byProject: groupProjectCounts(
        calls.map(({ project }) => ({ project, count: 1 })),
        identity
      )
    }
  }
  return {
    callsSince: mcp.callsSince,
    last24h: reduce('24h', 1),
    last7d: reduce('7d', 7),
    last30d: reduce('30d', 30)
  }
}
