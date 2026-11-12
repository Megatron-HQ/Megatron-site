import assert from 'node:assert/strict'
import test from 'node:test'
import { isClaudeAppScratchPath } from '../../vendor/megatron/src/shared/usage-projects.ts'
import { createDemoApi } from './api.ts'
import { SAMPLE_CLAUDE_APP_CHATS } from './fixtures.ts'

const NOW = new Date('2026-10-18T12:00:00Z')

test('sample chats live where the desktop recognizes Claude app chats', () => {
  assert.ok(SAMPLE_CLAUDE_APP_CHATS.length >= 4)
  for (const chat of SAMPLE_CLAUDE_APP_CHATS)
    assert.equal(isClaudeAppScratchPath(chat.path), true, chat.path)
  assert.ok(SAMPLE_CLAUDE_APP_CHATS.some((chat) => chat.title === null))
  assert.ok(SAMPLE_CLAUDE_APP_CHATS.some((chat) => chat.title?.includes('/')))
})

test('the catalog marks each chat with its title and earliest start, and nothing else', async () => {
  const { api } = createDemoApi({ now: NOW, actionDelayMs: 0 })
  const catalog = await api.getUsageProjects()
  const chats = catalog.projects.filter((project) => project.chat)
  assert.equal(chats.length, SAMPLE_CLAUDE_APP_CHATS.length)
  for (const sample of SAMPLE_CLAUDE_APP_CHATS) {
    const project = chats.find((entry) => entry.path === sample.path)!
    assert.equal(project.chat!.title, sample.title)
    assert.ok(
      Number.isFinite(Date.parse(project.chat!.startedAt ?? '')),
      'Every sample chat has recorded activity, so it has a start.'
    )
  }
  assert.ok(
    catalog.projects
      .filter((project) => !isClaudeAppScratchPath(project.path))
      .every((project) => project.chat === undefined)
  )
})

test('chat usage reaches the rankings the app folds into one row', async () => {
  const { api } = createDemoApi({ now: NOW, actionDelayMs: 0 })
  const overview = await api.getUsageOverview()
  const chatShare = (rows: { project: string }[]) =>
    rows.filter((row) => isClaudeAppScratchPath(row.project)).length
  assert.ok(chatShare(overview.cost!.last30d.byProject) >= 2)
  assert.ok(chatShare(overview.activity!.last30d.byProject) >= 2)
  const calendar = await api.getUsageCalendar(NOW.getFullYear())
  assert.ok(
    calendar.byProject.some((row) => isClaudeAppScratchPath(row.project)),
    'The project timeline has chat rows to fold.'
  )
})
