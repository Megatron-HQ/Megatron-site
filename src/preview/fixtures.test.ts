import assert from 'node:assert/strict'
import test from 'node:test'
import { parse } from 'yaml'
import { isWithinProjectPath } from '../../vendor/megatron/src/shared/project-path.ts'
import { createSampleState, sampleFiles, sampleFindings } from './fixtures.ts'

test('plugin skill sources belong to the install whose scoped inventory displays them', () => {
  const state = createSampleState(new Date('2026-10-18T12:00:00Z'))
  const plugin = state.plugins.find(
    (row) => row.name === 'frontend' && row.marketplace === 'team-tools'
  )!
  const skills = state.skills.filter(
    (row) => row.plugin_name === 'frontend@team-tools'
  )
  assert.deepEqual(
    plugin.installs.map((install) =>
      skills
        .filter((skill) =>
          isWithinProjectPath(skill.source_path, install.install_path)
        )
        .map((skill) => skill.name)
    ),
    [['frontend:ui-audit'], ['frontend:design']]
  )
})

test('a broken-path finding opens the line that actually contains its missing reference', () => {
  const state = createSampleState(new Date('2026-10-18T12:00:00Z'))
  const skill = state.skills.find((row) => row.name === 'docs:docs')!
  const finding = sampleFindings(skill).find(
    (row) => row.rule_id === 'broken-file-paths'
  )!
  const files = sampleFiles(skill)
  const content = files.find(
    (file) => file.relativePath === finding.file_path
  )!.content!
  assert.match(
    content.split('\n')[finding.line_number! - 1],
    /references\/style-guide\.md/
  )
  assert.ok(
    !files.some((file) => file.relativePath === 'references/style-guide.md')
  )
})

test('the MCP warning refers to an actual tool reference in the sample document', () => {
  const state = createSampleState(new Date('2026-10-18T12:00:00Z'))
  const skill = state.skills.find((row) => row.name === 'design-system')!
  const finding = sampleFindings(skill)[0]
  const content = sampleFiles(skill)[0].content!
  assert.match(content.split('\n')[finding.line_number! - 1], /mcp__figma__/)
})

test('the missing-description finding points to the empty frontmatter field', () => {
  const state = createSampleState(new Date('2026-10-18T12:00:00Z'))
  const skill = state.skills.find((row) => row.name === 'security-review')!
  const content = sampleFiles(skill)[0].content!
  const finding = sampleFindings(skill)[0]
  assert.match(
    content.split('\n')[finding.line_number! - 1],
    /^description:\s*$/
  )
  assert.equal(parse(content.split('---')[1]).description, null)
})
