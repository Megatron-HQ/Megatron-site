import type {
  McpActionResult,
  McpConnectionCheck,
  McpDeclarationRef,
  McpDeclarationDetail,
  McpLintFinding,
  McpServerDetail,
  McpServerKind,
  McpServerList,
  McpLiveStatus,
  McpToolUsage,
  McpUsageStats,
  McpUsageWindow
} from '../../vendor/megatron/src/shared/ipc'
import type { ProjectIdentity } from '../../vendor/megatron/src/shared/project-identity'
import { isWithinProjectPath } from '../../vendor/megatron/src/shared/project-path.ts'
import { groupProjectCounts } from '../../vendor/megatron/src/shared/usage-projects.ts'
import { localDate } from './analytics.ts'
import {
  ADDITIONAL_PROJECT,
  API_PROJECT,
  DAY_MS,
  HOUR_MS,
  SAMPLE_HOME,
  SAMPLE_PROJECT,
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
  checks: McpConnectionCheck[]
  signedOut: McpDeclarationRef[]
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
  return {
    servers: empty
      ? []
      : alternate
        ? servers.filter(({ id }) => id === DOCS_ID)
        : servers,
    calls: empty
      ? []
      : alternate
        ? calls.filter(({ project }) => project === API_PROJECT)
        : calls,
    checks: [],
    signedOut: [],
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
  const visible = server.declarations.filter(
    ({ scope, projectPath }) =>
      scope !== 'project' ||
      (projectPath !== null && sampleProjectGranted(state, projectPath))
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
        server.id === OTHER_CONNECTOR_ID ||
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

function sameDeclaration(
  first: McpDeclarationRef,
  second: McpDeclarationRef
): boolean {
  return (
    first.serverId === second.serverId &&
    first.scope === second.scope &&
    first.projectPath === second.projectPath
  )
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
  collisions: number
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
          'DOCS_TOKEN is a literal. Use an environment variable reference.'
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
    collisionCount > 1 ? collisionCount : 0
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
    firstCallAt: times[0] ?? null,
    lastCallAt: times.at(-1) ?? null,
    ungrantedProjects: state.projects.filter(
      ({ path }) => !sampleProjectGranted(state, path)
    ).length,
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
    firstCallAt: mcp.calls.map(({ at }) => at).sort()[0] ?? null,
    last24h: reduce('24h', 1),
    last7d: reduce('7d', 7),
    last30d: reduce('30d', 30)
  }
}
