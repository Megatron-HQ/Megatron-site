import type {
  ContextBaselineResult,
  RecordedRequest
} from '../../vendor/megatron/src/shared/ipc'
import { SAMPLE_PROJECT, windowsPath } from './fixtures.ts'

export function sampleContextBaseline(
  measuredAt: string
): ContextBaselineResult {
  return {
    ok: true,
    measuredAt,
    usage: {
      model: 'claude-opus-5-5',
      totalDisplay: '32k',
      totalTokens: 32000,
      windowDisplay: '1m',
      windowTokens: 1000000,
      percentDisplay: '3%',
      categories: [
        { name: 'System prompt', display: '1.8k', tokens: 1800, group: 'used' },
        {
          name: 'System tools',
          display: '14.2k',
          tokens: 14200,
          group: 'used'
        },
        {
          name: 'MCP server instructions',
          display: '2k',
          tokens: 2000,
          group: 'used'
        },
        { name: 'Custom agents', display: '600', tokens: 600, group: 'used' },
        { name: 'Memory files', display: '1.5k', tokens: 1500, group: 'used' },
        { name: 'Skills', display: '10k', tokens: 10000, group: 'used' },
        { name: 'Messages', display: '1.9k', tokens: 1900, group: 'used' },
        {
          name: 'MCP tools (deferred)',
          display: '9.5k',
          tokens: 9500,
          group: 'deferred'
        },
        {
          name: 'System tools (deferred)',
          display: '14.8k',
          tokens: 14800,
          group: 'deferred'
        },
        {
          name: 'Autocompact buffer',
          display: '33k',
          tokens: 33000,
          group: 'buffer'
        },
        { name: 'Free space', display: '935k', tokens: 935000, group: 'free' }
      ],
      sections: [
        {
          title: 'MCP Tools',
          columns: ['Tool', 'Server', 'Tokens'],
          rows: [
            {
              cells: ['mcp__sample_docs__search', 'sample_docs', '1.3k'],
              tokens: 1300
            },
            {
              cells: ['mcp__sample_docs__read', 'sample_docs', '300'],
              tokens: 300
            },
            {
              cells: [
                'mcp__sample_browser__navigate',
                'sample_browser',
                '7.9k'
              ],
              tokens: 7900
            }
          ]
        },
        {
          title: 'Custom Agents',
          columns: ['Agent Type', 'Source', 'Tokens'],
          rows: [
            { cells: ['sample:reviewer', 'User', '250'], tokens: 250 },
            { cells: ['sample:architect', 'Plugin', '350'], tokens: 350 }
          ]
        },
        {
          title: 'Memory Files',
          columns: ['Type', 'Path', 'Tokens'],
          rows: [
            {
              cells: [
                'User',
                windowsPath('C:', 'Users', 'demo', '.claude', 'CLAUDE.md'),
                '1.5k'
              ],
              tokens: 1500
            }
          ]
        },
        {
          title: 'Skills',
          columns: ['Skill', 'Source', 'Tokens'],
          rows: [
            { cells: ['sample-review', 'User', '~3.8k'], tokens: 3800 },
            {
              cells: ['sample-design', 'Plugin (sample)', '~6.2k'],
              tokens: 6200
            }
          ]
        }
      ]
    }
  }
}

export function sampleRecordedRequest(requestedAt: string): RecordedRequest {
  const system = [
    'Synthetic system instructions for the interactive Megatron sample. No local session is read.',
    'Sample coding guidance: inspect the project, explain changes, and verify the result.'
  ]
  const hookText = 'Sample SessionStart output: project conventions loaded.'
  const mcpText =
    'Synthetic documentation server. Search sample documents before reading them.'
  const cacheControl = { ttl: '5m', scope: 'global' }
  const tools = [
    {
      name: 'Read',
      description:
        'Read a sample file without accessing the visitor filesystem.',
      input_schema: { type: 'object', properties: { path: { type: 'string' } } }
    },
    {
      name: 'mcp__sample_docs__search',
      description: 'Search the illustrative documentation collection.',
      input_schema: {
        type: 'object',
        properties: { query: { type: 'string' } }
      }
    }
  ]
    .map((tool) => ({
      name: tool.name,
      chars: JSON.stringify(tool).length,
      definitionJson: JSON.stringify(tool, null, 2),
      isMcp: tool.name.startsWith('mcp__')
    }))
    .sort((a, b) => b.chars - a.chars || a.name.localeCompare(b.name))
  return {
    sessionId: 'sample-interactive-context',
    cwd: SAMPLE_PROJECT,
    claudeVersion: '2.1.300',
    requestedAt,
    model: 'claude-opus-5-5',
    systemBlocks: system.map((text, index) => ({
      text,
      chars: text.length,
      cacheControl: index === 1 ? { ...cacheControl } : null
    })),
    tools,
    cacheBreakpoints: [
      { path: 'system[1]', cacheControl: { ...cacheControl } }
    ],
    hookOutputs: [
      { name: 'Sample SessionStart', text: hookText, chars: hookText.length }
    ],
    mcpInstructions: [
      { name: 'sample_docs', text: mcpText, chars: mcpText.length }
    ]
  }
}
