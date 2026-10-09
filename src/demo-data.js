export const PREVIEW_SECTIONS = Object.freeze([
  { id: 'skills', label: 'Skills', icon: 'brain-circuit' },
  { id: 'plugins', label: 'Plugins', icon: 'blocks' },
  { id: 'usage', label: 'Usage', icon: 'chart-no-axes-combined' }
])

export const SKILL_SOURCES = Object.freeze([
  { id: 'all', label: 'All skills', icon: 'list' },
  { id: 'global', label: 'Global', icon: 'globe' },
  { id: 'project', label: 'Project', icon: 'folder-git-2' },
  { id: 'plugin', label: 'Plugin', icon: 'blocks' }
])

export const SAMPLE_SKILLS = Object.freeze(
  [
    {
      id: 'code-review',
      name: 'code-review',
      source: 'global',
      description: 'Review code for correctness, clarity, and maintainability.',
      tokens: 220,
      uses: 42,
      status: 'clean'
    },
    {
      id: 'grill-me',
      name: 'grill-me',
      source: 'global',
      description: 'Ask the questions that make a plan stronger.',
      tokens: 94,
      uses: 18,
      status: 'clean'
    },
    {
      id: 'deploy',
      name: 'deploy',
      source: 'project',
      description: 'Prepare and verify a production deployment.',
      tokens: 128,
      uses: 12,
      status: 'clean'
    },
    {
      id: 'design-system',
      name: 'design-system',
      source: 'project',
      description: 'Inspect interface design using the project’s Figma tools.',
      tokens: 167,
      uses: 8,
      status: 'warning',
      finding: 'Referenced MCP server “figma” is not configured.',
      rule: 'missing-mcp-server',
      line: 18
    },
    {
      id: 'refactor',
      name: 'refactor',
      source: 'global',
      description: 'Make focused structural improvements to existing code.',
      tokens: 186,
      uses: 27,
      status: 'clean'
    },
    {
      id: 'ui-audit',
      name: 'frontend:ui-audit',
      source: 'plugin',
      description: 'Check responsive layouts, keyboard controls, and contrast.',
      tokens: 218,
      uses: 16,
      status: 'clean'
    },
    {
      id: 'commit',
      name: 'commit:commit',
      source: 'plugin',
      description: 'Create a clear commit from the current changes.',
      tokens: 120,
      uses: 35,
      status: 'clean'
    },
    {
      id: 'docs',
      name: 'docs:docs',
      source: 'plugin',
      description: 'Write and maintain project documentation.',
      tokens: 88,
      uses: 0,
      status: 'warning',
      finding: 'Referenced file “references/style-guide.md” was not found.',
      rule: 'broken-file-paths',
      line: 13
    }
  ].map(Object.freeze)
)

export const SAMPLE_PLUGINS = Object.freeze(
  [
    {
      id: 'frontend',
      name: 'frontend',
      marketplace: 'team-tools',
      version: '1.4.0',
      scope: 'User',
      skills: 3,
      description: 'Interface review and design tools.',
      enabled: true
    },
    {
      id: 'commit',
      name: 'commit',
      marketplace: 'team-tools',
      version: '1.2.0',
      scope: 'Project',
      skills: 2,
      description: 'A focused commit workflow.',
      enabled: true
    },
    {
      id: 'docs',
      name: 'docs',
      marketplace: 'community',
      version: '2.0.1',
      scope: 'Local',
      skills: 4,
      description: 'Documentation tools for your project.',
      enabled: false
    }
  ].map(Object.freeze)
)

export const USAGE_PANELS = Object.freeze([
  { id: 'activity', label: 'Activity', icon: 'activity' },
  { id: 'cost', label: 'Cost', icon: 'circle-dollar-sign' },
  { id: 'models', label: 'Models', icon: 'cpu' },
  { id: 'skills', label: 'Skills', icon: 'brain-circuit' },
  { id: 'resident', label: 'Resident tax', icon: 'layers-3' }
])

export const USAGE_WINDOWS = Object.freeze([
  { id: '24h', label: '24 hours', suffix: 'hours', interval: 'hour' },
  { id: '7d', label: '7 days', suffix: 'days', interval: 'day' },
  { id: '30d', label: '30 days', suffix: 'days', interval: 'day' }
])

function createSampleWindow(sample) {
  const prompts = sample.trend.reduce((total, value) => total + value, 0)
  const invocations = Object.values(sample.skillUses).reduce(
    (total, value) => total + value,
    0
  )
  let cumulativePrompts = 0
  const invocationTrend = sample.trend.map((value) => {
    const previousCount = Math.round(
      (cumulativePrompts / prompts) * invocations
    )
    cumulativePrompts += value
    return (
      Math.round((cumulativePrompts / prompts) * invocations) - previousCount
    )
  })
  return Object.freeze({
    ...sample,
    prompts,
    invocations,
    activeDays:
      sample.trend.length === 24
        ? 1
        : sample.trend.filter((value) => value > 0).length,
    skillsUsed: Object.values(sample.skillUses).filter((value) => value > 0)
      .length,
    trend: Object.freeze(sample.trend),
    invocationTrend: Object.freeze(invocationTrend),
    skillUses: Object.freeze(sample.skillUses)
  })
}

export const SAMPLE_WINDOWS = Object.freeze({
  '24h': createSampleWindow({
    sessions: 6,
    cost: 8.42,
    turns: 184,
    output: '42.8k',
    trend: [
      0, 0, 0, 0, 0, 0, 2, 4, 8, 12, 7, 4, 9, 11, 6, 3, 5, 8, 5, 0, 1, 1, 0, 0
    ],
    skillUses: { 'code-review': 8, commit: 7, refactor: 5, 'grill-me': 4 }
  }),
  '7d': createSampleWindow({
    sessions: 24,
    cost: 42.76,
    turns: 856,
    output: '208k',
    trend: [44, 72, 62, 0, 85, 73, 48],
    skillUses: {
      'code-review': 20,
      commit: 17,
      refactor: 13,
      'grill-me': 9,
      deploy: 8,
      'ui-audit': 9
    }
  }),
  '30d': createSampleWindow({
    sessions: 86,
    cost: 148.32,
    turns: 2864,
    output: '682k',
    trend: [
      26, 37, 51, 35, 65, 0, 0, 32, 48, 64, 44, 73, 0, 0, 42, 66, 40, 75, 58, 0,
      0, 51, 74, 48, 64, 81, 0, 0, 76, 102
    ],
    skillUses: Object.fromEntries(
      SAMPLE_SKILLS.map((skill) => [skill.id, skill.uses])
    )
  })
})

export const SAMPLE_MODELS = Object.freeze(
  [
    { name: 'Sonnet', share: 62, color: '#2a78d6', effort: [12, 38, 9, 3] },
    { name: 'Opus', share: 28, color: '#eb6834', effort: [16, 8, 3, 1] },
    { name: 'Haiku', share: 10, color: '#1baf7a', effort: [1, 2, 4, 3] }
  ].map(Object.freeze)
)

export const SAMPLE_CONTEXT = Object.freeze(
  [
    { label: 'Skills', tokens: 1800, share: 9.89 },
    { label: 'Agents', tokens: 2400, share: 13.19 },
    { label: 'SessionStart hooks', tokens: 1100, share: 6.04 },
    { label: 'MCP instructions', tokens: 3700, share: 20.33 },
    { label: 'Project instructions', tokens: 2900, share: 15.93 },
    { label: 'Remainder', tokens: 6300, share: 34.62 }
  ].map(Object.freeze)
)
