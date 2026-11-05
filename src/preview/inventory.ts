import { isWithinProjectPath } from '../../vendor/megatron/src/shared/project-path.ts'
import {
  SAMPLE_PARENT,
  SAMPLE_PROJECT,
  createSampleState,
  windowsPath,
  type SampleState
} from './fixtures.ts'
import type { InventoryChange } from './protocol.ts'

export const MOVED_SAMPLE_PROJECT = windowsPath(
  SAMPLE_PARENT,
  'web-app-renamed'
)
const SAMPLE_DEPLOY_ID = 15
const ADDED_SKILL_NAME = 'release-readiness'
const MOVED_SKILL_ID_OFFSET = 1000

function removeProjectInstalls(state: SampleState): void {
  state.plugins = state.plugins
    .map((plugin) => ({
      ...plugin,
      installs: plugin.installs.filter(
        (install) => install.project_path !== SAMPLE_PROJECT
      )
    }))
    .filter((plugin) => plugin.installs.length > 0)
  state.skills = state.skills.filter(
    (skill) =>
      skill.plugin_name === null ||
      state.plugins.some(
        (plugin) =>
          skill.plugin_name === `${plugin.name}@${plugin.marketplace}` &&
          plugin.installs.some((install) =>
            isWithinProjectPath(skill.source_path, install.install_path)
          )
      )
  )
}

export function applyInventoryChange(
  current: SampleState,
  action: InventoryChange
) {
  const state = structuredClone(current)
  const project = state.projects.find((row) => row.path === SAMPLE_PROJECT)
  if (!project)
    throw new RangeError(
      'Reset sample to restore web-app before trying another change.'
    )
  if (action === 'unavailable-project') {
    project.status = 'unavailable'
    return {
      state,
      message:
        'Sample web-app is temporarily unreadable. Its cached inventory is retained; its parent and siblings stay available. The desktop app retries automatically.'
    }
  }
  if (action === 'delete-project') {
    const explicitlyGranted = state.folders.some(
      (folder) => folder.path === SAMPLE_PROJECT
    )
    if (explicitlyGranted) {
      project.status = 'missing'
      return {
        state,
        message:
          'The missing sample web-app folder was explicitly granted, so its grant and cached inventory are retained.'
      }
    }
    state.projects = state.projects.filter(
      (row) => !isWithinProjectPath(row.path, SAMPLE_PROJECT)
    )
    state.skills = state.skills.filter(
      (row) =>
        row.project_root === null ||
        !isWithinProjectPath(row.project_root, SAMPLE_PROJECT)
    )
    removeProjectInstalls(state)
    return {
      state,
      message:
        'Deleted the discovered sample web-app project. Its inventory entries were removed; a selected project returns to Dev. Historical Usage stays at its original paths.'
    }
  }
  if (project.status !== 'available')
    throw new RangeError(
      'Reset sample to restore access to web-app before changing its files.'
    )
  if (action === 'move-project') {
    project.path = MOVED_SAMPLE_PROJECT
    state.skills = state.skills.map((row) =>
      row.project_root === SAMPLE_PROJECT
        ? {
            ...row,
            id: row.id + MOVED_SKILL_ID_OFFSET,
            project_root: MOVED_SAMPLE_PROJECT,
            source_path:
              MOVED_SAMPLE_PROJECT +
              row.source_path.slice(SAMPLE_PROJECT.length)
          }
        : row
    )
    removeProjectInstalls(state)
    return {
      state,
      message:
        'Moved the sample project to Dev/web-app-renamed and rediscovered its skills. Old scoped plugin installs were removed from the sample index. Registry files and historical Usage are not reassigned.'
    }
  }
  if (action === 'delete-skill') {
    state.skills = state.skills.filter((row) => row.id !== SAMPLE_DEPLOY_ID)
    return {
      state,
      message:
        'Deleted the sample web-app deploy skill. The inventory and any open skill details update automatically.'
    }
  }
  if (action === 'edit-skill') {
    const skill = state.skills.find((row) => row.id === SAMPLE_DEPLOY_ID)
    if (!skill)
      throw new RangeError(
        'Reset sample to restore the deploy skill before editing it.'
      )
    skill.description =
      'Deploy the web application and verify its rollback procedure.'
    skill.modified_at = state.now
    return {
      state,
      message:
        'Edited the sample deploy skill. Its description and open definition refresh without a manual rescan.'
    }
  }
  if (!state.skills.some((row) => row.name === ADDED_SKILL_NAME)) {
    const template = createSampleState(new Date(state.now)).skills.find(
      (row) => row.id === SAMPLE_DEPLOY_ID
    )!
    state.skills.push({
      ...template,
      id: Math.max(...state.skills.map((row) => row.id)) + 1,
      name: ADDED_SKILL_NAME,
      description:
        'Check release readiness before publishing the web application.',
      source_path: windowsPath(
        SAMPLE_PROJECT,
        '.claude',
        'skills',
        ADDED_SKILL_NAME
      ),
      modified_at: state.now
    })
  }
  return {
    state,
    message:
      'Added the sample release-readiness skill under web-app. It appears automatically in Skills; filter to Dev/web-app or search for release-readiness.'
  }
}
