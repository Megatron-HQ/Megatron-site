import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveSampleGrantChange } from './folder-grants.ts'
import {
  ADDITIONAL_PARENT,
  ADDITIONAL_PROJECT,
  SAMPLE_PARENT,
  SAMPLE_PROJECT
} from './fixtures.ts'

const EARLIER = '2026-10-01T00:00:00.000Z'
const NOW = '2026-10-18T12:00:00.000Z'
const grant = (path: string) => ({ path, granted_at: EARLIER })

test('granting a parent absorbs a child that was granted on its own', () => {
  const change = resolveSampleGrantChange(
    [grant(SAMPLE_PARENT), grant(ADDITIONAL_PROJECT)],
    { add: [ADDITIONAL_PARENT] },
    NOW
  )
  assert.deepEqual(
    change.folders.map((row) => row.path),
    [SAMPLE_PARENT, ADDITIONAL_PARENT]
  )
  assert.deepEqual(change.absorbed, [ADDITIONAL_PROJECT])
  assert.deepEqual(change.added, [ADDITIONAL_PARENT])
  assert.deepEqual(change.skipped, [])
})

test('a folder already covered by a grant is skipped and names its cover', () => {
  const change = resolveSampleGrantChange(
    [grant(SAMPLE_PARENT)],
    { add: [SAMPLE_PROJECT] },
    NOW
  )
  assert.deepEqual(change.folders, [grant(SAMPLE_PARENT)])
  assert.deepEqual(change.skipped, [
    { path: SAMPLE_PROJECT, coveredBy: SAMPLE_PARENT }
  ])
})

test('narrowing replaces a parent grant with the folders chosen inside it', () => {
  const change = resolveSampleGrantChange(
    [grant(SAMPLE_PARENT), grant(ADDITIONAL_PARENT)],
    { add: [SAMPLE_PROJECT], remove: [SAMPLE_PARENT] },
    NOW
  )
  assert.deepEqual(change.folders, [
    grant(ADDITIONAL_PARENT),
    { path: SAMPLE_PROJECT, granted_at: NOW }
  ])
  assert.deepEqual(change.skipped, [])
})

test('Windows paths match regardless of case and duplicate picks collapse', () => {
  const change = resolveSampleGrantChange(
    [grant(SAMPLE_PARENT)],
    {
      add: [
        ADDITIONAL_PARENT,
        ADDITIONAL_PARENT.toUpperCase(),
        SAMPLE_PARENT.toLowerCase()
      ]
    },
    NOW
  )
  assert.deepEqual(
    change.folders.map((row) => row.path),
    [SAMPLE_PARENT, ADDITIONAL_PARENT]
  )
  assert.deepEqual(change.added, [ADDITIONAL_PARENT])
  assert.deepEqual(change.skipped, [
    { path: SAMPLE_PARENT.toLowerCase(), coveredBy: SAMPLE_PARENT }
  ])
})
