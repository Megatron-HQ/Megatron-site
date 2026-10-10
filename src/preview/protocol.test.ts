import assert from 'node:assert/strict'
import test from 'node:test'

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
