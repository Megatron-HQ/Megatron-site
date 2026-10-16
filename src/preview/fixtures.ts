import type {
  AllowedPathRow,
  EffortBucket,
  LintFindingRow,
  PluginInstall,
  PluginRow,
  ProjectFolder,
  SkillFile,
  SkillRow,
  TriggerType
} from '../../vendor/megatron/src/shared/ipc'

export const SAMPLE_PROJECT = 'C:/Projects/web-app'
export const ADDITIONAL_PROJECT = 'C:/Projects/docs-site'
export const CONTEXT_LIMIT = 2666
export const HOUR_MS = 60 * 60 * 1000
export const DAY_MS = 24 * HOUR_MS

export interface SampleEvent {
  at: string
  sessionId: string
  project: string
  prompt: string
  bareSlash: boolean
  skillName: string | null
  trigger: TriggerType
  model: string
  effort: EffortBucket
  outputTokens: number
  costCents: number | null
}

export interface SampleState {
  now: string
  skills: SkillRow[]
  plugins: PluginRow[]
  folders: AllowedPathRow[]
  projects: ProjectFolder[]
  events: SampleEvent[]
}

export function createSampleState(now: Date): SampleState {
  const timestamp = now.toISOString()
  const skill = (
    id: number,
    name: string,
    source_type: SkillRow['source_type'],
    description: string | null,
    extra: Partial<SkillRow> = {}
  ): SkillRow => ({
    id,
    name,
    source_type,
    description,
    source_path:
      source_type === 'global'
        ? `C:/Users/demo/.claude/skills/${name}`
        : source_type === 'project'
          ? `${SAMPLE_PROJECT}/.claude/skills/${name}`
          : `C:/Users/demo/.claude/plugins/cache/${name.replace(':', '/')}`,
    plugin_name: null,
    project_root: source_type === 'project' ? SAMPLE_PROJECT : null,
    last_scanned_at: timestamp,
    modified_at: new Date(now.getTime() - 2 * DAY_MS).toISOString(),
    metadata_json: null,
    est_listing_tokens: 120,
    est_body_tokens: 840,
    is_synced: 0,
    hook_events: null,
    disabled_reason: null,
    model_invocable: 1,
    total_invocations: 0,
    last_invoked_at: null,
    shadowed_by_skill_id: null,
    lint_status: 'clean',
    error_count: 0,
    warning_count: 0,
    ...extra
  })
  const skills = [
    skill(
      1,
      'code-review',
      'global',
      'Review code for correctness, clarity, and maintainability.',
      {
        est_listing_tokens: 220,
        est_body_tokens: 1240,
        metadata_json: JSON.stringify({
          author: 'Megatron',
          version: '1.2.0',
          tags: ['quality', 'review']
        })
      }
    ),
    skill(
      2,
      'grill-me',
      'global',
      'Ask focused questions to sharpen a plan before implementation.',
      { est_listing_tokens: 94 }
    ),
    skill(
      3,
      'refactor',
      'global',
      'Make focused structural improvements while preserving behavior.',
      { est_listing_tokens: 186 }
    ),
    skill(
      4,
      'release-check',
      'project',
      'Prepare and verify a production deployment.'
    ),
    skill(
      5,
      'design-system',
      'project',
      'Inspect interface design using the project’s Figma tools.',
      { lint_status: 'warning', warning_count: 1, est_listing_tokens: 167 }
    ),
    skill(
      6,
      'manual-plan',
      'global',
      'Plan work when explicitly invoked with /manual-plan.',
      { model_invocable: 0, est_listing_tokens: 140 }
    ),
    skill(
      7,
      'legacy-deploy',
      'global',
      'Maintain the previous deployment workflow.',
      { disabled_reason: 'override', est_listing_tokens: 190 }
    ),
    skill(
      8,
      'synced-brief',
      'global',
      'Turn a request into a concise project brief.',
      {
        is_synced: 1,
        source_path: 'C:/Users/demo/.claude/skills/synced/synced-brief',
        est_listing_tokens: 84
      }
    ),
    skill(9, 'code-review', 'project', 'A project-specific review workflow.', {
      shadowed_by_skill_id: 1,
      lint_status: 'warning',
      warning_count: 1
    }),
    skill(
      10,
      'frontend:ui-audit',
      'plugin',
      'Check responsive layouts, keyboard controls, and contrast.',
      {
        plugin_name: 'frontend@team-tools',
        est_listing_tokens: 218,
        modified_at: null
      }
    ),
    skill(
      11,
      'frontend:design',
      'plugin',
      'Apply the project’s interface design conventions.',
      {
        plugin_name: 'frontend@team-tools',
        est_listing_tokens: 167,
        modified_at: null
      }
    ),
    skill(
      12,
      'commit:commit',
      'plugin',
      'Create a clear commit from the current changes.',
      { plugin_name: 'commit@team-tools', modified_at: null }
    ),
    skill(
      13,
      'docs:docs',
      'plugin',
      'Write and maintain project documentation.',
      {
        plugin_name: 'docs@community',
        est_listing_tokens: 88,
        modified_at: null,
        lint_status: 'warning',
        warning_count: 1
      }
    ),
    skill(
      14,
      'workflow:auto-review',
      'plugin',
      'Load project review guidance at session start.',
      {
        plugin_name: 'workflow@claude-plugins-official',
        hook_events: '["SessionStart"]',
        disabled_reason: 'plugin',
        est_listing_tokens: 35,
        modified_at: null
      }
    ),
    skill(15, 'deploy', 'project', 'Deploy the web application.'),
    skill(16, 'deploy', 'project', 'Deploy the API service.', {
      project_root: 'C:/Projects/api',
      source_path: 'C:/Projects/api/.claude/skills/deploy'
    }),
    skill(17, 'apps/web:deploy', 'project', 'Deploy the nested web package.', {
      project_root: 'C:/Projects/monorepo',
      source_path: 'C:/Projects/monorepo/apps/web/.claude/skills/deploy'
    }),
    skill(18, 'security-review', 'global', null, {
      lint_status: 'error',
      error_count: 1,
      est_listing_tokens: 40
    }),
    skill(
      19,
      'data-report',
      'global',
      'Summarize local project data in a reproducible report.',
      { est_listing_tokens: 260 }
    ),
    skill(
      20,
      'qa-audit',
      'global',
      'Inspect changes and verify their behavior end to end.',
      { est_listing_tokens: 210 }
    )
  ]
  const install = (
    scope: PluginInstall['scope'],
    version: string,
    project: string | null = null,
    extra: Partial<PluginInstall> = {}
  ): PluginInstall => ({
    scope,
    project_path: project,
    install_path: `C:/Users/demo/.claude/plugins/cache/sample/${scope}/${version}`,
    installed_version: version,
    available_version: version,
    disabled_reason: null,
    enablement_known: project === null || project === SAMPLE_PROJECT,
    installed_at: new Date(now.getTime() - 20 * DAY_MS).toISOString(),
    last_updated: new Date(now.getTime() - 3 * DAY_MS).toISOString(),
    git_commit_sha: null,
    ...extra
  })
  const plugin = (
    name: string,
    marketplace: string,
    installs: PluginInstall[]
  ): PluginRow => ({
    name,
    marketplace,
    marketplace_repo: null,
    installed_version: installs[0].installed_version,
    available_version: installs[0].available_version,
    disabled_reason: installs.every((row) => row.disabled_reason !== null)
      ? 'plugin'
      : null,
    skill_count: skills.filter(
      (row) => row.plugin_name === `${name}@${marketplace}`
    ).length,
    installs
  })
  const plugins = [
    plugin('frontend', 'team-tools', [
      install('user', '1.4.0', null, { available_version: '1.5.0' }),
      install('project', '1.2.0', SAMPLE_PROJECT, {
        available_version: '1.5.0'
      })
    ]),
    plugin('commit', 'team-tools', [install('user', '1.2.0')]),
    plugin('docs', 'community', [
      install('local', '2.0.1', ADDITIONAL_PROJECT, {
        available_version: '2.1.0',
        enablement_known: false
      }),
      install('project', '2.0.1', null, { enablement_known: false })
    ]),
    plugin('workflow', 'claude-plugins-official', [
      install('user', '1.3.0', null, { disabled_reason: 'plugin' })
    ]),
    plugin('frontend', 'community', [
      install('user', '0.9.0', null, { available_version: null })
    ])
  ]
  const projects = [
    SAMPLE_PROJECT,
    'C:/Projects/api',
    'C:/Projects/monorepo',
    'C:/Projects/design-system',
    'C:/Projects/mobile-app',
    'C:/Projects/cli',
    'C:/Projects/dashboard',
    'C:/Projects/research',
    'C:/Projects/docs-site',
    'C:/Projects/library'
  ]
  const names = [
    'code-review',
    'commit:commit',
    'refactor',
    'grill-me',
    'frontend:ui-audit',
    'design-system',
    'deploy',
    'docs:docs',
    'manual-plan',
    'synced-brief',
    'apps/web:deploy',
    'removed:assistant'
  ]
  const models = [
    'claude-sonnet-5-5',
    'claude-opus-5-5',
    'claude-sonnet-5',
    'claude-haiku-4-5',
    'claude-fable-5-1'
  ]
  const efforts: EffortBucket[] = [
    'high',
    'xhigh',
    'medium',
    'low',
    'not_recorded'
  ]
  const events: SampleEvent[] = Array.from({ length: 360 }, (_, index) => {
    const image = index % 29 <= 1
    const baseTime = now.getTime() - (360 - index) * 2 * HOUR_MS
    const at =
      image && index % 29 === 1
        ? baseTime - 2 * HOUR_MS + 8 * 60 * 1000
        : baseTime
    const skillName = image
      ? 'code-review'
      : index % 5 === 0
        ? null
        : names[index % names.length]
    const trigger: TriggerType = image
      ? 'autonomous'
      : skillName === 'manual-plan'
        ? 'user_invoked'
        : (['user_invoked', 'autonomous', 'subagent'][index % 3] as TriggerType)
    return {
      at: new Date(at).toISOString(),
      sessionId: `sample-session-${Math.floor(index / 4)}`,
      project: projects[Math.floor(index / 4) % projects.length],
      prompt: image
        ? '[Image: original 1440x1000]'
        : trigger === 'user_invoked' && skillName
          ? `/${skillName} Review the latest changes and explain any issues.`
          : 'Review the latest changes, preserve project conventions, and verify the result.',
      bareSlash: !image && index % 17 === 0,
      skillName,
      trigger,
      model: models[index % models.length],
      effort: efforts[Math.floor(index / 3) % efforts.length],
      outputTokens: 400 + ((index * 137) % 4600),
      costCents: index % 31 === 0 ? null : 18 + ((index * 23) % 145)
    }
  })
  return {
    now: timestamp,
    skills,
    plugins,
    events,
    folders: [
      SAMPLE_PROJECT,
      'C:/Projects/api',
      'C:/Projects/monorepo',
      'C:/Projects/empty-lab'
    ].map((path) => ({ path, granted_at: timestamp })),
    projects: [
      { path: SAMPLE_PROJECT, kind: 'repository', status: 'available' },
      { path: 'C:/Projects/api', kind: 'repository', status: 'available' },
      { path: 'C:/Projects/monorepo', kind: 'repository', status: 'available' },
      { path: 'C:/Projects/empty-lab', kind: 'repository', status: 'available' }
    ]
  }
}

export function sampleFindings(skill: SkillRow): LintFindingRow[] {
  const base = {
    skill_id: skill.id,
    detected_at: skill.last_scanned_at,
    detail: null,
    file_path: 'SKILL.md',
    line_number: 18
  }
  if (skill.id === 5)
    return [
      {
        ...base,
        id: 1,
        rule_id: 'missing-mcp-server',
        severity: 'warning',
        message: 'Referenced MCP server “figma” is not configured.'
      }
    ]
  if (skill.shadowed_by_skill_id !== null)
    return [
      {
        ...base,
        id: 2,
        rule_id: 'name-collision',
        severity: 'warning',
        message: 'A global skill with this name always takes precedence.'
      }
    ]
  if (skill.id === 13)
    return [
      {
        ...base,
        id: 3,
        rule_id: 'broken-file-paths',
        severity: 'warning',
        message: 'Referenced file “references/style-guide.md” was not found.',
        line_number: 13
      }
    ]
  if (skill.id === 18)
    return [
      {
        ...base,
        id: 4,
        rule_id: 'missing-description',
        severity: 'error',
        message: 'No non-empty description was found in the frontmatter.',
        line_number: 2
      }
    ]
  return []
}

export function sampleFiles(skill: SkillRow): SkillFile[] {
  const content = `---\nname: ${skill.name}\ndescription: ${skill.description ?? ''}\n${skill.model_invocable === 0 ? 'disable-model-invocation: true\n' : ''}metadata:\n  author: Megatron\n  version: 1.2.0\nallowed-tools: Read, Bash\n---\n\n# ${skill.name}\n\n${skill.description ?? 'Document the skill’s trigger and purpose.'}\n\n## Workflow\n\n1. Read the relevant code and project conventions.\n2. Identify changes that improve correctness and clarity.\n3. Verify the result and explain any remaining issues.\n\nSee the [review checklist](references/checklist.md) before finishing.\n\n## Output\n\n| Field | Description |\n| --- | --- |\n| Finding | A concrete issue and its impact |\n| Evidence | File, line, and reproducible behavior |\n\nUse \`scripts/check.ts\` for the local check.\n`
  return [
    { relativePath: 'SKILL.md', content, status: 'ok' },
    {
      relativePath: 'references/checklist.md',
      content:
        '# Review checklist\n\n- Check the intended behavior.\n- Exercise keyboard and pointer interactions.\n- Verify responsive layouts.\n\nReturn to [SKILL.md](../SKILL.md).',
      status: 'ok'
    },
    {
      relativePath: 'scripts/check.ts',
      content:
        'export function validateChanges(files: string[]): boolean {\n  return files.length > 0 && files.every((file) => file.trim().length > 0)\n}\n',
      status: 'ok'
    },
    ...Array.from({ length: 24 }, (_, index): SkillFile => ({
      relativePath: `references/examples/example-${String(index + 1).padStart(2, '0')}.md`,
      content: `# Example ${index + 1}\n\nA small, reproducible review scenario.`,
      status: 'ok'
    })),
    { relativePath: 'assets/icon.png', content: null, status: 'unreadable' },
    {
      relativePath: 'data/large-report.json',
      content: null,
      status: 'too_large'
    },
    {
      relativePath: 'data/archived-log.txt',
      content: null,
      status: 'preview_limit'
    }
  ]
}
