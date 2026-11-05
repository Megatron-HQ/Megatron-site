import assert from 'node:assert/strict'
import test from 'node:test'

test('inventory messages accept only the supported sample changes', async () => {
  const { parsePreviewCommand } = await protocol()
  for (const action of [
    'add-skill',
    'edit-skill',
    'delete-skill',
    'move-project',
    'delete-project',
    'unavailable-project',
    'pending-project',
    'retry-project',
    'recover-project'
  ]) {
    const command = { type: 'megatron-preview:inventory-change', action }
    assert.deepEqual(parsePreviewCommand(command), command)
  }
  for (const action of [undefined, null, '__proto__', 'read-local-files', 1])
    assert.equal(
      parsePreviewCommand({
        type: 'megatron-preview:inventory-change',
        action
      }),
      null
    )
})

test('History links reach the separate Usage panel and reject cross-section navigation', async () => {
  const { parsePreviewCommand } = await protocol()
  const command = {
    type: 'megatron-preview:navigate',
    section: 'usage',
    panel: 'history'
  }
  assert.deepEqual(parsePreviewCommand(command), command)
  assert.equal(parsePreviewCommand({ ...command, section: 'plugins' }), null)
})

test('Tokens deep links navigate only within Usage', async () => {
  const { parsePreviewCommand } = await protocol()
  const command = {
    type: 'megatron-preview:navigate',
    section: 'usage',
    panel: 'tokens'
  }
  assert.deepEqual(parsePreviewCommand(command), command)
  assert.equal(parsePreviewCommand({ ...command, section: 'skills' }), null)
})

async function protocol() {
  try {
    return await import('./protocol.ts')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ERR_MODULE_NOT_FOUND')
      throw error
    assert.fail('The preview message protocol has not been implemented.')
  }
}

test('navigation accepts app sections and the cost panel while rejecting malformed messages', async () => {
  const { parsePreviewCommand } = await protocol()
  assert.deepEqual(
    parsePreviewCommand({
      type: 'megatron-preview:navigate',
      section: 'usage',
      panel: 'cost'
    }),
    { type: 'megatron-preview:navigate', section: 'usage', panel: 'cost' }
  )
  assert.equal(
    parsePreviewCommand({
      type: 'megatron-preview:navigate',
      section: 'unknown'
    }),
    null
  )
  assert.equal(
    parsePreviewCommand({
      type: 'megatron-preview:navigate',
      section: 'skills',
      panel: 'cost'
    }),
    null
  )
  assert.equal(parsePreviewCommand(null), null)
  assert.equal(
    parsePreviewCommand({
      type: 'megatron-preview:navigate',
      section: 'usage',
      panel: '__proto__'
    }),
    null
  )
  assert.deepEqual(parsePreviewCommand({ type: 'megatron-preview:reset' }), {
    type: 'megatron-preview:reset'
  })
})
