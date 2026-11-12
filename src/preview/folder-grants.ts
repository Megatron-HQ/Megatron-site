import type {
  AllowedPathRow,
  SkippedGrant
} from '../../vendor/megatron/src/shared/ipc'
import { isWithinProjectPath } from '../../vendor/megatron/src/shared/project-path.ts'

// Mirrors the desktop's grant rule (src/main/folder-grants.ts): grants never
// nest. A pick inside an existing grant is skipped, and a pick that contains
// existing grants absorbs them. Sample paths are fixed strings, so containment
// is lexical, like the desktop's canonical paths.
export interface SampleGrantChange {
  folders: AllowedPathRow[]
  absorbed: string[]
  added: string[]
  skipped: SkippedGrant[]
}

function samePath(a: string, b: string): boolean {
  return isWithinProjectPath(a, b) && isWithinProjectPath(b, a)
}

function uniquePaths<T>(items: T[], pathOf: (item: T) => string): T[] {
  return items.filter(
    (item, index) =>
      items.findIndex((other) => samePath(pathOf(other), pathOf(item))) ===
      index
  )
}

export function resolveSampleGrantChange(
  existing: AllowedPathRow[],
  { add, remove = [] }: { add: string[]; remove?: string[] },
  grantedAt: string
): SampleGrantChange {
  const kept = uniquePaths(
    existing.filter((row) => !remove.some((path) => samePath(path, row.path))),
    (row) => row.path
  )
  const picks = uniquePaths(add, (path) => path)
  const candidates = [
    ...kept,
    ...picks
      .filter((path) => !kept.some((row) => samePath(row.path, path)))
      .map((path) => ({ path, granted_at: grantedAt }))
  ]
  const folders = candidates.filter(
    (candidate) =>
      !candidates.some(
        (other) =>
          other !== candidate && isWithinProjectPath(candidate.path, other.path)
      )
  )
  const survives = (path: string) => folders.some((row) => row.path === path)
  const added = candidates
    .slice(kept.length)
    .flatMap((row) => (survives(row.path) ? [row.path] : []))
  return {
    folders,
    absorbed: kept.flatMap((row) => (survives(row.path) ? [] : [row.path])),
    added,
    skipped: picks
      .filter((path) => !added.includes(path))
      .map((path) => ({
        path,
        coveredBy: folders.find((row) => isWithinProjectPath(path, row.path))!
          .path
      }))
  }
}
