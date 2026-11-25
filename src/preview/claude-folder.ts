import type { ClaudeFolderStatus } from '../../vendor/megatron/src/shared/ipc'
import { API_PROJECT, SAMPLE_HOME, type SampleState } from './fixtures.ts'

export const SAMPLE_WORK_PROFILE = 'home:.claude-work'
export const SAMPLE_PICKED_PROFILE = 'home:.claude-sandbox'

export function sampleClaudeFolders(
  platform: NodeJS.Platform,
  scenario?: string
) {
  const home = platform === 'darwin' ? '/Users/demo' : SAMPLE_HOME
  const separator = platform === 'darwin' ? '/' : '\\'
  const defaultPath = `${home}${separator}.claude`
  const workPath = `${home}${separator}.claude-work`
  const pickedPath = `${home}${separator}.claude-sandbox`
  const environmentPath = `${home}${separator}.claude-lab`
  const defaultId =
    scenario === 'claude-folder-paused'
      ? SAMPLE_WORK_PROFILE
      : scenario === 'claude-folder-environment'
        ? 'environment'
        : 'default'

  function status(
    id: string,
    state: ClaudeFolderStatus['state'] = 'ok'
  ): ClaudeFolderStatus {
    const options: ClaudeFolderStatus['options'] = [
      {
        id: 'default',
        path: defaultPath,
        tags: ['default'],
        active: id === 'default'
      },
      {
        id: 'named',
        path: defaultPath,
        tags: ['named'],
        active: id === 'named'
      },
      {
        id: SAMPLE_WORK_PROFILE,
        path: workPath,
        tags: [],
        active: id === SAMPLE_WORK_PROFILE
      }
    ]
    if (defaultId === 'environment')
      options.push({
        id: 'environment',
        path: environmentPath,
        tags: ['environment'],
        active: id === 'environment'
      })
    if (id === SAMPLE_PICKED_PROFILE)
      options.push({
        id,
        path: pickedPath,
        tags: [],
        active: true
      })
    const active = options.find((option) => option.active)
    if (!active) throw new RangeError('Unknown sample Claude Code folder.')
    return {
      path: active.path,
      source:
        id === 'default'
          ? 'default'
          : id === 'environment'
            ? 'environment'
            : 'settings',
      state,
      issue:
        state === 'paused'
          ? { value: active.path, reason: 'missing', source: 'settings' }
          : null,
      options
    }
  }

  return {
    home,
    defaultId,
    initial: () =>
      status(defaultId, scenario === 'claude-folder-paused' ? 'paused' : 'ok'),
    status,
    pickedPath
  }
}

export function createAlternateSample(initial: SampleState): SampleState {
  const sample = structuredClone(initial)
  sample.skills = sample.skills.filter(
    (skill) => skill.source_type === 'project'
  )
  sample.plugins = []
  sample.events = sample.events.filter((event) => event.project === API_PROJECT)
  sample.archivedInvocations = sample.archivedInvocations.filter(
    (event) => event.project === API_PROJECT
  )
  sample.prompts = sample.prompts?.filter(
    (prompt) => prompt.project === API_PROJECT
  )
  sample.history = []
  return sample
}
