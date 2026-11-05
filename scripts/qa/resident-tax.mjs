import assert from 'node:assert/strict'

export async function verifyResidentTaxSample(page) {
  const sample = page.frameLocator('[data-resident-tax-frame]')
  await sample.getByRole('heading', { name: 'Resident tax' }).waitFor()
  await page.locator('[data-resident-tax-frame]').scrollIntoViewIfNeeded()
  await sample.getByText('Global baseline', { exact: true }).waitFor()
  await sample.getByText('Deferred, not loaded', { exact: true }).waitFor()
  assert.equal(
    await sample
      .getByText('MCP server instructions', { exact: true })
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
    true,
    'Category names must remain readable in the sample at narrow widths.'
  )
  assert.equal(await sample.getByRole('img', { name: /deferred/i }).count(), 0)
  for (const [category, tokens, percent, color] of [
    ['Skills', '10k', '1.0%', 'rgb(128, 100, 181)'],
    ['MCP server instructions', '2k', '0.2%', 'rgb(66, 125, 179)'],
    ['Memory files', '1.5k', '0.1%', 'rgb(50, 135, 121)'],
    ['Custom agents', '600', '<0.1%', 'rgb(181, 104, 135)']
  ]) {
    const segment = sample.getByRole('img', {
      name: `${category}, ${tokens} tokens, ${percent} of the context window`,
      exact: true
    })
    assert.equal(
      await segment.evaluate(
        (element) => getComputedStyle(element).backgroundColor
      ),
      color
    )
  }
  const skills = sample.getByRole('button', { name: /^Skills / })
  await skills.click()
  await sample
    .getByRole('dialog')
    .getByText('sample-design', { exact: true })
    .waitFor()
  await page.keyboard.press('Escape')
  await sample.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.equal(
    await skills.evaluate((element) => element === document.activeElement),
    true
  )
  await sample.getByRole('button', { name: 'Refresh', exact: true }).click()
  await sample.getByRole('button', { name: 'Refresh', exact: true }).waitFor()
  assert.equal(
    await sample
      .locator('body')
      .evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    'The resident sample must fit its frame.'
  )
}
